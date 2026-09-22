# M1 backend foundation

The migration at `supabase/migrations/202609220001_initial_planner.sql` defines the first persistence contract. The owner reports a successful run in the development project. **Authenticated database behavior still needs live integration testing.** The frontend now has a Supabase adapter and also supports a separate local sample mode. See the connected frontend status at the end of this document.

## Data and access model

Each new Supabase Auth account gets one household and owner membership through a database trigger. Existing accounts are backfilled when the migration runs. The trigger does not trust user metadata. Users can read their household and memberships, but cannot create memberships, change owners, or create arbitrary households through the browser API. Invitations are deferred. Deleting an Auth owner through a privileged server operation deletes the owned household and its data; account deletion UI/server handling is still required.

All user tables have RLS enabled. An authenticated member can access only that household's recipes, plans, and pantry entries. The membership predicate runs as a definer in a private schema to avoid recursive RLS. Only that predicate is executable by authenticated clients; keep `private` out of exposed API schemas. Anonymous visitors have no table grants and should use local sample data. Never give the browser the service-role key: it bypasses RLS.

| Table | Client contract |
| --- | --- |
| `households` | Read `id`, `name`, and `owner_id`; discover through membership after sign-in. |
| `household_members` | Read rows matching the current user's `user_id` to find their household. Future member support is structural only. |
| `recipes` | Private recipe JSON object plus `title`, optional stable `source_key`, and `is_favorite`. Household/source uniqueness supports duplicate-safe import. |
| `weekly_plans` | One row per household/Monday `week_start`. `meals` is a JSON array of selected meal snapshots. `grocery_overrides` is a JSON array of reviewed edits. |
| `pantry_items` | One row per household/canonical `ingredient_key`. `status`: `have`, `low`, or `out`; `quantity` and `unit` must both be set or both be null. `last_confirmed_at` is explicit user confirmation, not a generic save timestamp. |

Pantry labels map to Have it / Running low / Out. Unknown quantity is `null`, never zero. Out allows null or zero only. Numeric quantities reject infinity and NaN. Having an item without a quantity does not prove sufficient coverage.

`confirmed_enough` maps to the frontend's `confirmedEnough`, but persisted confirmation also requires `coverage_fingerprint`. This is a stable hash of the household, week start, canonical ingredient key, and sorted contributing meal requirements (including servings and protein choices). Only persist true for Have it with unknown quantity after explicit user confirmation. On reads, expose effective `confirmedEnough = row.confirmed_enough && row.coverage_fingerprint === currentFingerprint`. A missing or mismatched fingerprint always means false; never hydrate the boolean directly. A new week or changed requirements therefore requires confirmation again even if the old database flag remains true. Recompute fingerprints before each grocery calculation. Changing the pantry status, quantity, unit, or ingredient key also clears confirmation through a database trigger; confirm the updated item in a separate save. Unchecking confirmation writes false and null together. The hash is a freshness marker, not an authorization mechanism. The application must implement this contract before using persisted coverage; SQL cannot validate the domain-specific meal hash.

Recipes and plan JSON require application-level validation before saving and after reading. SQL verifies the outer JSON type only. Each selected meal should include a stable meal ID, source recipe ID/key, the full recipe snapshot (including base servings, ingredients, and instructions), chosen servings, and protein selections. Historical plans must read those snapshots rather than joining the current recipe. The exact TypeScript shape should be aligned with the application's domain model before connecting persistence. Grocery overrides should retain a fingerprint of their source requirements so a changed plan causes review rather than silently reusing a stale edit.

Canonical ingredient IDs and supported conversions live in application code for this first slice. Global ingredient tables, adjustment history/undo, preferences, shopping drafts, retailer credentials, and assistant usage accounting need later migrations. This migration is a foundation, not completion of all M1 acceptance criteria.

## Safe saves and imports

Mutable records expose `revision`, maintained by a trigger. New records start at zero; every update increments it. Use compare-and-swap updates: filter by both record ID and the previously loaded revision, then request the updated row. Zero updated rows means a stale edit or lost access; refetch and show a conflict without overwriting. Deletions should also filter on the loaded revision. The database does not force clients to include that filter, so the persistence repository must enforce the convention.

```ts
const { data, error } = await supabase
  .from('weekly_plans')
  .update({ meals, grocery_overrides: overrides })
  .eq('id', plan.id)
  .eq('revision', plan.revision)
  .select()
  .maybeSingle();
// Throw on error; treat data === null as a conflict, not a successful save.
```

Use insert-on-conflict-ignore for initial bundled recipes keyed by `(household_id, source_key)`; never overwrite a user's customized recipe during repeat imports. Import favorites/preferences only after a user-visible preview. New accounts must not inherit the owner's bundled personal preference files. Plan creation can race across devices: catch the unique household/week conflict and reload the existing plan. Treat `week_start` as a local calendar date, not a UTC timestamp.

## Provisioning and deployment prerequisites

1. Create a free development Supabase project in the owner's account; verify current free-tier limits fit the $10 monthly total ceiling. Do not provision paid services automatically.
2. Apply the SQL migration once using the SQL editor, or configure the Supabase CLI project and use its migration workflow. Keep migration history consistent; do not apply both methods independently. No CLI configuration or live project has been created by this change.
3. Configure Auth's site URL and allowed redirect URLs for the local and deployed frontend. Choose and test a sign-in provider before claiming authentication works. Never paste secrets into chat or commit them.
4. Supply only the project URL and public/publishable client key to the frontend. Privileged keys belong exclusively in server secret settings, when a server function actually needs them. Keep the private schema unexposed.
5. Connect an authenticated repository to the UI, validate the domain JSON, and implement explicit saving, failure, conflict, and sign-out states. Keep sample data isolated from real users and clear private cached state on sign-out/account change.
6. Run the isolation and functional checks below against a disposable development project before deployment. Run the existing frontend checks separately.

## Required live verification

Use two separate real test accounts, A and B, and their actual authenticated API clients. Tests run as a database administrator or service role do **not** prove RLS isolation.

- Sign up A and B. Each sees one owned household and no membership belonging to the other household. Confirm the sign-up trigger completes without breaking account creation.
- A creates a recipe, a Monday plan with a full snapshot, and pantry items in all three states. A can reload and edit these from a second browser.
- B requests A's known record IDs: selects return no rows; updates/deletes affect zero rows; inserts or upserts using A's household ID fail. Repeat for all three mutable tables, including mixed-household bulk writes. Verify A's records are unchanged afterward.
- As A, attempt to create membership in B's household or change household ownership. Permission is denied. Anonymous reads/writes are denied as well.
- A loads the same plan twice. Save the first copy with its revision filter; saving the second copy must return zero rows. Refetch to confirm the first change survives. Repeat for pantry changes.
- Reject a non-Monday plan date, negative/nonfinite quantity, quantity without unit, unit without quantity, positive quantity with Out, and a non-array meal list. Confirm quantity `null` survives reload as unknown.
- Confirm enough for one week's requirements and reload: effective coverage is true only for that fingerprint. Change servings, protein choice, or week: effective coverage becomes false. Change pantry status/quantity: SQL clears the stored boolean and fingerprint. Reject true confirmation without a fingerprint or on Low/Out/known quantity.
- Edit a source recipe after saving a meal snapshot. The historical plan still displays the original ingredients and quantities. Re-import bundled recipes twice without overwriting an edited recipe.
- Sign out A and sign in B in the same browser. No cached A plan, pantry, or private recipe remains visible.
- Test account deletion only on disposable accounts using a privileged server/admin path; confirm cascading deletion and verify other households remain intact.

Record actual outcomes, project environment, and migration version in release evidence. No database test results are claimed yet.

## Recovery

Before storing data the owner relies on, document a backup/export path and demonstrate restore into a disposable project. For a failed migration, PostgreSQL rolls back the transaction. For a successfully applied migration with later defects, ship a corrective migration; do not drop live user tables as a rollback. Test schema changes in development first. The static sample demo should remain available if the free database is paused or unreachable.

## Connected frontend (September 21 implementation)

The owner reports the initial migration ran successfully in the development project. `app/.env.local` now configures the project URL and publishable client key; this file is Git-ignored. The project Auth settings endpoint responds successfully with email enabled and confirmation required. An unauthenticated household query was denied (HTTP 401). This is a connectivity check, not proof of authenticated isolation.

The app now offers email/password registration and sign-in. New users start with an empty account household; sample data is not automatically imported. Signed-in edits use an explicit **Save changes** button. Selecting a date loads its Monday's plan, while pantry inventory is shared across weeks. Sign-out returns to separate browser-local sample data. Recipe snapshots preserve saved meal instructions/quantities.

`ConnectedApp.tsx` handles auth lifecycle; `cloud.ts` handles validated reads and revision-checked saves. Pantry and plan saves currently use separate requests: a partial failure requires reloading, and the UI communicates that instead of claiming an atomic save. Invalid local inputs can be corrected and retried without reload. The UI clears coverage confirmations whenever plan requirements change, and the repository scopes saved confirmations to a fingerprint.

Next live check: create an app account, confirm its email, sign in, add a meal and pantry item, click Save changes, and verify after reload and from a second browser. Then execute the two-account isolation checklist above. These authenticated checks have not yet been performed. Password recovery, account deletion, custom recipe editing, and deployment configuration remain follow-up work.
