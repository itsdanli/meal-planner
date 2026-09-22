import type { SupabaseClient } from '@supabase/supabase-js';
import { recipes } from './data';
import { canonicalIngredient } from './grocery';
import type { Meal, PantryEntry, PlannerState, Recipe } from './types';

type SnapshotMeal = Meal & { recipeSnapshot: Recipe };
export interface PantryRow {
  id: string; household_id: string; ingredient_key: string; label: string;
  status: PantryEntry['status']; quantity: number | null; unit: string | null;
  confirmed_enough: boolean; coverage_fingerprint: string | null;
  last_confirmed_at: string | null; updated_at: string; revision: number;
}
export interface CloudSnapshot {
  state: PlannerState; householdId: string; planId: string | null;
  planRevision: number | null; pantryRows: PantryRow[];
}
export class CloudValidationError extends Error {
  readonly requiresReload = false;
  constructor(message: string) { super(message); this.name = 'CloudValidationError'; }
}
export class CloudSaveError extends Error {
  readonly requiresReload = true;
  constructor(message: string) { super(`${message} Some changes may already be saved. Reload cloud data before trying again.`); this.name = 'CloudSaveError'; }
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const revision = (value: unknown): value is number => finite(value) && Number.isInteger(value) && value >= 0;
const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));

/** Calendar-only normalization avoids UTC/local date shifts. */
export function normalizeWeek(input: string | Date): string {
  const dateText = input instanceof Date
    ? `${input.getFullYear()}-${String(input.getMonth() + 1).padStart(2, '0')}-${String(input.getDate()).padStart(2, '0')}` : input;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) throw new Error('Choose a valid week date.');
  const date = new Date(`${dateText}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateText) throw new Error('Choose a valid week date.');
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function isRecipeSnapshot(value: unknown): value is Recipe {
  if (!object(value)) return false;
  return text(value.id) && text(value.name) && typeof value.bucket === 'string' && typeof value.bucketLabel === 'string'
    && finite(value.time) && value.time >= 0 && finite(value.servings) && value.servings > 0 && typeof value.description === 'string'
    && Array.isArray(value.ingredients) && value.ingredients.every(item => object(item) && text(item.id) && text(item.name)
      && (item.amount === null || (finite(item.amount) && item.amount >= 0)) && (item.unit === null || typeof item.unit === 'string') && typeof item.category === 'string')
    && Array.isArray(value.steps) && value.steps.every(step => typeof step === 'string')
    && (value.proteins === undefined || (Array.isArray(value.proteins) && value.proteins.every(item => object(item)
      && text(item.name) && typeof item.amount === 'string' && (item.instructions === undefined || typeof item.instructions === 'string'))));
}

export function serializeMeals(meals: Meal[]): SnapshotMeal[] {
  const ids = new Set<string>();
  return meals.map(meal => {
    if (!object(meal) || !text(meal.id) || ids.has(meal.id) || !text(meal.recipeId)
      || !finite(meal.servings) || meal.servings <= 0) throw new Error('A meal is invalid or duplicated.');
    ids.add(meal.id);
    const snapshot = (meal as Meal & { recipeSnapshot?: Recipe }).recipeSnapshot ?? recipes.find(recipe => recipe.id === meal.recipeId);
    if (!isRecipeSnapshot(snapshot) || snapshot.id !== meal.recipeId) throw new Error('A meal is missing a valid recipe snapshot.');
    if (meal.proteinIndex !== undefined && (!Number.isInteger(meal.proteinIndex) || meal.proteinIndex < 0
      || !snapshot.proteins?.[meal.proteinIndex])) throw new Error('A meal has an invalid protein choice.');
    return { id: meal.id, recipeId: meal.recipeId, servings: meal.servings,
      ...(meal.proteinIndex === undefined ? {} : { proteinIndex: meal.proteinIndex }), recipeSnapshot: structuredClone(snapshot) };
  });
}

function readMeals(value: unknown): SnapshotMeal[] {
  if (!Array.isArray(value) || !value.every(meal => object(meal) && isRecipeSnapshot(meal.recipeSnapshot))) {
    throw new Error('Saved meals are invalid or missing historical recipe snapshots.');
  }
  return serializeMeals(value as SnapshotMeal[]);
}

export function validatePantry(pantry: PantryEntry[]): void {
  const ids = new Set<string>(); const keys = new Set<string>();
  for (const item of pantry) {
    if (!object(item) || !text(item.id) || ids.has(item.id) || !text(item.name) || item.name.trim().length > 240
      || !['have', 'low', 'out'].includes(item.status) || !validDate(item.updatedAt)
      || (item.confirmedEnough !== undefined && typeof item.confirmedEnough !== 'boolean')
      || (item.quantity !== undefined && (!finite(item.quantity) || item.quantity < 0))
      || (item.unit !== undefined && typeof item.unit !== 'string')
      || (item.quantity === undefined && !!item.unit?.trim())
      || (item.quantity !== undefined && !item.unit?.trim())
      || (item.status === 'out' && item.quantity !== undefined && item.quantity !== 0)) throw new Error('A pantry item contains invalid data.');
    if (item.confirmedEnough && (item.status !== 'have' || item.quantity !== undefined)) throw new Error('Enough confirmation applies only to Have it items without a tracked amount.');
    const key = canonicalIngredient(item.name);
    if (key.length > 160 || keys.has(key)) throw new Error(`Combine duplicate pantry items for ${item.name} before saving.`);
    if (item.quantity !== undefined && (item.unit?.trim().length ?? 0) > 40) throw new Error('A pantry unit is too long.');
    ids.add(item.id); keys.add(key);
  }
}

export function parsePantryRows(value: unknown, householdId: string): PantryRow[] {
  if (!Array.isArray(value)) throw new Error('Invalid pantry response.');
  const rows = value.map(row => {
    if (!object(row) || !text(row.id) || row.household_id !== householdId || !text(row.ingredient_key)
      || !text(row.label) || !['have', 'low', 'out'].includes(String(row.status))
      || !(row.quantity === null || (finite(row.quantity) && row.quantity >= 0))
      || !(row.unit === null || text(row.unit)) || (row.quantity === null) !== (row.unit === null)
      || typeof row.confirmed_enough !== 'boolean' || !(row.coverage_fingerprint === null || text(row.coverage_fingerprint))
      || !(row.last_confirmed_at === null || validDate(row.last_confirmed_at)) || !validDate(row.updated_at) || !revision(row.revision)
      || (row.status === 'out' && row.quantity !== null && row.quantity !== 0)
      || (row.confirmed_enough && (row.status !== 'have' || row.quantity !== null || !text(row.coverage_fingerprint)))) {
      throw new Error('Saved pantry data is invalid.');
    }
    return row as unknown as PantryRow;
  });
  validatePantry(rows.map(row => ({ id: row.id, name: row.label, status: row.status, quantity: row.quantity ?? undefined,
    unit: row.unit ?? undefined, updatedAt: row.updated_at })));
  if (rows.some(row => canonicalIngredient(row.label) !== row.ingredient_key)) throw new Error('Saved pantry ingredient mappings need review.');
  return rows;
}

// Stable properties and sorting prevent harmless object/meal ordering from changing a confirmation.
export async function coverageFingerprint(householdId: string, weekOf: string, meals: Meal[], ingredientKey: string): Promise<string> {
  const requirements = serializeMeals(meals).map(meal => ({ id: meal.id, recipeId: meal.recipeId, servings: meal.servings,
    proteinIndex: meal.proteinIndex ?? null, baseServings: meal.recipeSnapshot.servings,
    ingredients: meal.recipeSnapshot.ingredients.map(item => ({ id: item.id, name: item.name, amount: item.amount, unit: item.unit })),
    protein: meal.proteinIndex === undefined ? null : meal.recipeSnapshot.proteins![meal.proteinIndex] })).sort((a, b) => a.id.localeCompare(b.id));
  const payload = JSON.stringify({ householdId, weekOf: normalizeWeek(weekOf), ingredientKey, requirements });
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hydratePantry(rows: PantryRow[], householdId: string, weekOf: string, meals: Meal[]): Promise<PantryEntry[]> {
  return Promise.all(rows.map(async row => ({ id: row.id, name: row.label, status: row.status,
    ...(row.quantity === null ? {} : { quantity: row.quantity, unit: row.unit! }),
    confirmedEnough: row.confirmed_enough && row.coverage_fingerprint === await coverageFingerprint(householdId, weekOf, meals, row.ingredient_key),
    updatedAt: row.last_confirmed_at ?? row.updated_at })));
}

async function findHousehold(client: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await client.from('household_members').select('household_id').eq('user_id', userId).single();
  if (error || !data || !text(data.household_id)) throw new Error('Could not load your household. Sign in again or check backend setup.');
  return data.household_id;
}

export async function loadCloudPlanner(client: SupabaseClient, userId: string, weekOf: string): Promise<CloudSnapshot> {
  const week = normalizeWeek(weekOf);
  const householdId = await findHousehold(client, userId);
  const [planResult, pantryResult] = await Promise.all([
    client.from('weekly_plans').select('id,household_id,week_start,meals,revision').eq('household_id', householdId).eq('week_start', week).maybeSingle(),
    client.from('pantry_items').select('*').eq('household_id', householdId).order('label'),
  ]);
  if (planResult.error || pantryResult.error) throw new Error('Could not load saved planner data. Try again.');
  const plan = planResult.data;
  if (plan && (!text(plan.id) || plan.household_id !== householdId || plan.week_start !== week || !revision(plan.revision))) throw new Error('Saved plan data is invalid.');
  const meals = plan ? readMeals(plan.meals) : [];
  const pantryRows = parsePantryRows(pantryResult.data, householdId);
  return { householdId, planId: plan?.id ?? null, planRevision: plan?.revision ?? null, pantryRows,
    state: { weekOf: week, meals, pantry: await hydratePantry(pantryRows, householdId, week, meals) } };
}

function same(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right); }
function pantryPayload(item: PantryEntry, householdId: string, fingerprint: string | null) {
  return { household_id: householdId, ingredient_key: canonicalIngredient(item.name), label: item.name.trim(), status: item.status,
    quantity: item.quantity ?? null, unit: item.quantity === undefined ? null : item.unit?.trim() || 'each',
    confirmed_enough: fingerprint !== null, coverage_fingerprint: fingerprint, last_confirmed_at: item.updatedAt };
}

/** Per-row saves are not transactional; after any error the caller must reload. */
export async function saveCloudPlanner(client: SupabaseClient, userId: string, state: PlannerState, baseline: CloudSnapshot): Promise<CloudSnapshot> {
  let week: string; let meals: SnapshotMeal[];
  try {
    week = normalizeWeek(state.weekOf);
    if (week !== baseline.state.weekOf) throw new Error('Load the selected week before saving.');
    meals = serializeMeals(state.meals);
    validatePantry(state.pantry);
  } catch (error) {
    throw new CloudValidationError(error instanceof Error ? error.message : 'Check your plan and pantry values.');
  }
  try {
    const householdId = await findHousehold(client, userId);
    if (householdId !== baseline.householdId) throw new Error('Your signed-in household changed.');
    const oldMeals = serializeMeals(baseline.state.meals);
    const planChanged = !same(meals, oldMeals);
    if (!baseline.planId || planChanged) {
      const payload = { household_id: householdId, week_start: week, meals };
      const query = baseline.planId
        ? client.from('weekly_plans').update(payload).eq('id', baseline.planId).eq('household_id', householdId).eq('revision', baseline.planRevision!)
        : client.from('weekly_plans').insert(payload);
      const result = await query.select('id').maybeSingle();
      if (result.error || !result.data) throw new Error('The weekly plan could not be saved or was changed on another device.');
    }
    const priorById = new Map(baseline.pantryRows.map(row => [row.id, row]));
    const desiredIds = new Set(state.pantry.map(item => item.id));
    // Delete first so explicitly removed aliases can be replaced without unique-key collisions.
    for (const row of baseline.pantryRows.filter(row => !desiredIds.has(row.id))) {
      const result = await client.from('pantry_items').delete().eq('id', row.id).eq('household_id', householdId).eq('revision', row.revision).select('id').maybeSingle();
      if (result.error || !result.data) throw new Error('A pantry deletion conflicted with another save.');
    }
    for (const item of state.pantry) {
      const prior = priorById.get(item.id);
      // The SQL trigger clears coverage on identity/status/amount changes too.
      const changedCoverage = !!prior && (prior.status !== item.status || prior.quantity !== (item.quantity ?? null)
        || prior.unit !== (item.quantity === undefined ? null : item.unit?.trim() || 'each')
        || prior.ingredient_key !== canonicalIngredient(item.name));
      const canConfirm = item.confirmedEnough && item.status === 'have' && item.quantity === undefined;
      const fingerprint = canConfirm ? await coverageFingerprint(householdId, week, meals, canonicalIngredient(item.name)) : null;
      const payload = pantryPayload(item, householdId, fingerprint);
      if (prior && Object.entries(payload).every(([key, value]) => same(prior[key as keyof PantryRow], value))) continue;
      const query = prior
        ? client.from('pantry_items').update(payload).eq('id', prior.id).eq('household_id', householdId).eq('revision', prior.revision)
        : client.from('pantry_items').insert(payload);
      const result = await query.select('id,revision').maybeSingle();
      if (result.error || !result.data) throw new Error('A pantry item could not be saved or changed on another device.');
      if (changedCoverage && fingerprint) {
        // Identity/status changes clear coverage in SQL. Apply the explicit current
        // confirmation separately, guarded by the revision returned by that save.
        if (!revision(result.data.revision)) throw new Error('Could not confirm the updated pantry item.');
        const confirmation = await client.from('pantry_items')
          .update({ confirmed_enough: true, coverage_fingerprint: fingerprint })
          .eq('id', result.data.id).eq('household_id', householdId).eq('revision', result.data.revision)
          .select('id').maybeSingle();
        if (confirmation.error || !confirmation.data) throw new Error('The pantry item saved, but its coverage confirmation conflicted.');
      }
    }
    return await loadCloudPlanner(client, userId, week);
  } catch (error) {
    if (error instanceof CloudSaveError) throw error;
    throw new CloudSaveError(error instanceof Error ? error.message : 'Cloud save failed.');
  }
}
