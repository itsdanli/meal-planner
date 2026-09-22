-- Initial M1 persistence. Apply to a Supabase Postgres database.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'My household' check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members(user_id);

-- Kept outside exposed API schemas. Definer avoids recursive membership RLS.
create function private.is_household_member(target_household uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household and user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_household_member(uuid) from public;
grant execute on function private.is_household_member(uuid) to authenticated;

-- No client-supplied household ID, owner ID, or user metadata enters bootstrap.
create function private.bootstrap_household()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare new_household uuid;
begin
  insert into public.households(owner_id) values (new.id)
    returning id into new_household;
  insert into public.household_members(household_id, user_id, role)
    values (new_household, new.id, 'owner');
  return new;
end;
$$;
revoke all on function private.bootstrap_household() from public;
create trigger on_auth_user_created_planner after insert on auth.users
  for each row execute function private.bootstrap_household();

-- Support accounts created before this migration.
insert into public.households(owner_id) select id from auth.users
  on conflict (owner_id) do nothing;
insert into public.household_members(household_id, user_id, role)
  select id, owner_id, 'owner' from public.households
  on conflict (household_id, user_id) do nothing;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  source_key text,
  title text not null check (length(trim(title)) between 1 and 240),
  recipe jsonb not null check (jsonb_typeof(recipe) = 'object'),
  is_favorite boolean not null default false,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(household_id, source_key)
);

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  -- Each meal stores a full immutable-at-selection recipe snapshot, servings,
  -- protein choices, and a stable meal ID; never reconstruct history by join.
  meals jsonb not null default '[]'::jsonb check (jsonb_typeof(meals) = 'array'),
  grocery_overrides jsonb not null default '[]'::jsonb
    check (jsonb_typeof(grocery_overrides) = 'array'),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(household_id, week_start)
);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  ingredient_key text not null check (length(trim(ingredient_key)) between 1 and 160),
  label text not null check (length(trim(label)) between 1 and 240),
  status text not null default 'have' check (status in ('have', 'low', 'out')),
  quantity numeric check (quantity >= 0 and quantity < 'Infinity'::numeric),
  unit text,
  confirmed_enough boolean not null default false,
  -- Fingerprint of the reviewed week's ingredient requirements; clients must
  -- compare this to the current fingerprint before treating coverage as true.
  coverage_fingerprint text,
  last_confirmed_at timestamptz,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(household_id, ingredient_key),
  check ((quantity is null and unit is null) or
    (quantity is not null and unit is not null and length(trim(unit)) between 1 and 40)),
  check (status <> 'out' or quantity is null or quantity = 0),
  check (
    (not confirmed_enough and coverage_fingerprint is null) or
    (confirmed_enough and status = 'have' and quantity is null
      and coverage_fingerprint is not null
      and length(trim(coverage_fingerprint)) between 1 and 256)
  )
);

create function private.invalidate_pantry_coverage()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    or new.quantity is distinct from old.quantity
    or new.unit is distinct from old.unit
    or new.ingredient_key is distinct from old.ingredient_key then
    new.confirmed_enough := false;
    new.coverage_fingerprint := null;
  end if;
  return new;
end;
$$;
revoke all on function private.invalidate_pantry_coverage() from public;
create trigger pantry_coverage before update on public.pantry_items
  for each row execute function private.invalidate_pantry_coverage();

create function private.stamp_revision()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.revision := 0;
    new.created_at := now();
  else
    if new.household_id <> old.household_id then
      raise exception 'Cannot move a record between households';
    end if;
    new.revision := old.revision + 1;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.stamp_revision() from public;

create trigger recipes_revision before insert or update on public.recipes
  for each row execute function private.stamp_revision();
create trigger plans_revision before insert or update on public.weekly_plans
  for each row execute function private.stamp_revision();
create trigger pantry_revision before insert or update on public.pantry_items
  for each row execute function private.stamp_revision();

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes enable row level security;
alter table public.weekly_plans enable row level security;
alter table public.pantry_items enable row level security;

-- Revoke inherited/default API grants before granting the minimum.
revoke all on public.households, public.household_members, public.recipes,
  public.weekly_plans, public.pantry_items from anon, authenticated;
grant select on public.households, public.household_members to authenticated;
grant select, insert, update, delete on public.recipes, public.weekly_plans,
  public.pantry_items to authenticated;
grant all on public.households, public.household_members, public.recipes,
  public.weekly_plans, public.pantry_items to service_role;

create policy households_read on public.households for select to authenticated
  using (private.is_household_member(id));
create policy members_read on public.household_members for select to authenticated
  using (private.is_household_member(household_id));

create policy recipes_member_access on public.recipes for all to authenticated
  using (private.is_household_member(household_id))
  with check (private.is_household_member(household_id));
create policy plans_member_access on public.weekly_plans for all to authenticated
  using (private.is_household_member(household_id))
  with check (private.is_household_member(household_id));
create policy pantry_member_access on public.pantry_items for all to authenticated
  using (private.is_household_member(household_id))
  with check (private.is_household_member(household_id));

commit;
