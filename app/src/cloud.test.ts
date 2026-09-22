import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CloudSaveError, CloudValidationError, coverageFingerprint, hydratePantry, loadCloudPlanner, normalizeWeek, parsePantryRows, saveCloudPlanner, serializeMeals, validatePantry } from './cloud';
import type { CloudSnapshot, PantryRow } from './cloud';
import type { Meal, Recipe } from './types';

const recipe: Recipe = { id: 'custom', name: 'Spinach bowl', bucket: 'test', bucketLabel: 'Test', description: '', time: 15, servings: 2,
  ingredients: [{ id: 'spinach', name: 'spinach', amount: 200, unit: 'g', category: 'produce' }], steps: ['Cook.'],
  proteins: [{ name: 'tofu', amount: '200 g' }] };
const meals: Meal[] = [{ id: 'meal-1', recipeId: recipe.id, servings: 2, recipeSnapshot: recipe } as Meal];
const week = '2026-09-21';
const row: PantryRow = { id: 'row-1', household_id: 'household-a', ingredient_key: 'spinach', label: 'Spinach', status: 'have', quantity: null, unit: null,
  confirmed_enough: false, coverage_fingerprint: null, last_confirmed_at: '2026-09-22T00:00:00Z', updated_at: '2026-09-22T00:00:00Z', revision: 0 };

test('week normalization handles Sunday, month boundaries, leap years, and invalid dates', () => {
  assert.equal(normalizeWeek('2026-09-27'), week);
  assert.equal(normalizeWeek('2026-10-01'), '2026-09-28');
  assert.equal(normalizeWeek('2024-02-29'), '2024-02-26');
  assert.throws(() => normalizeWeek('2026-02-29'));
  assert.throws(() => normalizeWeek('2026-09-21T00:00:00Z'));
});

test('meal serialization preserves private historical snapshots and rejects malformed choices', () => {
  const serialized = serializeMeals(meals);
  assert.deepEqual(serialized[0].recipeSnapshot, recipe);
  assert.notEqual(serialized[0].recipeSnapshot, recipe);
  assert.throws(() => serializeMeals([{ ...meals[0], servings: Infinity }]));
  assert.throws(() => serializeMeals([{ ...meals[0], proteinIndex: 1 }]));
  assert.throws(() => serializeMeals([meals[0], meals[0]]));
  assert.throws(() => serializeMeals([{ id: 'unknown', recipeId: 'missing', servings: 1 }]));
});

test('coverage fingerprints change for week, household, servings, protein and recipe requirements', async () => {
  const base = await coverageFingerprint('household-a', week, meals, 'spinach');
  const variants = [
    coverageFingerprint('household-b', week, meals, 'spinach'),
    coverageFingerprint('household-a', '2026-09-28', meals, 'spinach'),
    coverageFingerprint('household-a', week, [{ ...meals[0], servings: 3 }], 'spinach'),
    coverageFingerprint('household-a', week, [{ ...meals[0], proteinIndex: 0 }], 'spinach'),
    coverageFingerprint('household-a', week, [{ ...meals[0], recipeSnapshot: { ...recipe, ingredients: [{ ...recipe.ingredients[0], amount: 400 }] } } as Meal], 'spinach'),
  ];
  for (const fingerprint of await Promise.all(variants)) assert.notEqual(fingerprint, base);
  assert.equal(base.length, 64);
  const other = { ...meals[0], id: 'meal-2' };
  assert.equal(await coverageFingerprint('h', week, [meals[0], other], 'spinach'), await coverageFingerprint('h', week, [other, meals[0]], 'spinach'));
});

test('hydration never restores stale pantry confirmation', async () => {
  const fingerprint = await coverageFingerprint('household-a', week, meals, 'spinach');
  const confirmed = { ...row, confirmed_enough: true, coverage_fingerprint: fingerprint };
  assert.equal((await hydratePantry([confirmed], 'household-a', week, meals))[0].confirmedEnough, true);
  assert.equal((await hydratePantry([confirmed], 'household-a', '2026-09-28', meals))[0].confirmedEnough, false);
  assert.equal((await hydratePantry([row], 'household-a', week, meals))[0].quantity, undefined);
});

test('pantry rejects canonical duplicates, nonfinite quantities, and foreign or invalid cloud rows', () => {
  const item = { id: 'one', name: 'yellow onion', status: 'have' as const, updatedAt: row.updated_at };
  assert.throws(() => validatePantry([item, { ...item, id: 'two', name: 'yellow onion, diced' }]));
  assert.throws(() => validatePantry([{ ...item, quantity: NaN }]));
  assert.throws(() => parsePantryRows([row], 'household-b'));
  assert.throws(() => parsePantryRows([{ ...row, quantity: 3 }], 'household-a'));
  assert.throws(() => parsePantryRows([{ ...row, confirmed_enough: true }], 'household-a'));
  assert.deepEqual(parsePantryRows([row], 'household-a'), [row]);
});

type Request = { table: string; action: string; filters: Record<string, unknown>; payload?: unknown };
function mockClient(respond: (request: Request) => { data: unknown; error: unknown }) {
  const requests: Request[] = [];
  const client = { from(table: string) {
    const request: Request = { table, action: 'select', filters: {} };
    const builder = {
      select() { return builder; }, order() { return builder; },
      eq(key: string, value: unknown) { request.filters[key] = value; return builder; },
      update(payload: unknown) { request.action = 'update'; request.payload = payload; return builder; },
      insert(payload: unknown) { request.action = 'insert'; request.payload = payload; return builder; },
      delete() { request.action = 'delete'; return builder; },
      single() { return builder; }, maybeSingle() { return builder; },
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) { requests.push(request); return Promise.resolve(respond(request)).then(resolve, reject); },
    };
    return builder;
  } } as unknown as SupabaseClient;
  return { client, requests };
}

test('fresh account load produces an empty household rather than sample data', async () => {
  const { client } = mockClient(request => ({ data: request.table === 'household_members' ? { household_id: 'household-a' }
    : request.table === 'pantry_items' ? [] : null, error: null }));
  const loaded = await loadCloudPlanner(client, 'user-a', '2026-09-24');
  assert.deepEqual(loaded.state, { weekOf: week, meals: [], pantry: [] });
  assert.equal(loaded.planId, null);
});

test('save detects zero-row CAS conflicts and demands reload before further writes', async () => {
  const { client, requests } = mockClient(request => ({ data: request.table === 'household_members' ? { household_id: 'household-a' } : null, error: null }));
  const baseline: CloudSnapshot = { householdId: 'household-a', planId: 'plan-a', planRevision: 3, pantryRows: [], state: { weekOf: week, meals: [], pantry: [] } };
  await assert.rejects(saveCloudPlanner(client, 'user-a', { ...baseline.state, meals }, baseline), error => error instanceof CloudSaveError && error.requiresReload);
  assert.deepEqual(requests[1].filters, { id: 'plan-a', household_id: 'household-a', revision: 3 });
  assert.equal(requests.length, 2);
});

test('pantry deletion uses loaded revision and reports partial-save recovery', async () => {
  const { client, requests } = mockClient(request => ({ data: request.table === 'household_members' ? { household_id: 'household-a' } : null, error: null }));
  const baseline: CloudSnapshot = { householdId: 'household-a', planId: 'plan-a', planRevision: 1, pantryRows: [row], state: { weekOf: week, meals: [], pantry: await hydratePantry([row], 'household-a', week, []) } };
  await assert.rejects(saveCloudPlanner(client, 'user-a', { ...baseline.state, pantry: [] }, baseline), /Some changes may already be saved/);
  assert.equal(requests[1].action, 'delete');
  assert.deepEqual(requests[1].filters, { id: row.id, household_id: 'household-a', revision: 0 });
});


test('invalid pantry input is correctable without reload and sends no writes', async () => {
  const { client, requests } = mockClient(() => ({ data: null, error: null }));
  const baseline: CloudSnapshot = { householdId: 'household-a', planId: null, planRevision: null, pantryRows: [], state: { weekOf: week, meals: [], pantry: [] } };
  await assert.rejects(saveCloudPlanner(client, 'user-a', { ...baseline.state, pantry: [{ id: 'p', name: 'spinach', status: 'have', quantity: 4, unit: '', updatedAt: row.updated_at }] }, baseline), error => error instanceof CloudValidationError && !error.requiresReload);
  assert.equal(requests.length, 0);
});

test('changed pantry coverage saves explicit confirmation in a second revision-guarded request', async () => {
  let savedRow: PantryRow = { ...row, status: 'low' };
  const fingerprint = await coverageFingerprint('household-a', week, [], 'spinach');
  const { client, requests } = mockClient(request => {
    if (request.table === 'household_members') return { data: { household_id: 'household-a' }, error: null };
    if (request.table === 'weekly_plans') return { data: { id: 'plan-a', household_id: 'household-a', week_start: week, meals: [], revision: 0 }, error: null };
    if (request.action === 'update') {
      savedRow = { ...savedRow, ...(request.payload as Partial<PantryRow>), revision: savedRow.revision + 1 };
      if (savedRow.revision === 1) savedRow = { ...savedRow, confirmed_enough: false, coverage_fingerprint: null };
      return { data: { id: savedRow.id, revision: savedRow.revision }, error: null };
    }
    return { data: [savedRow], error: null };
  });
  const baseline: CloudSnapshot = { householdId: 'household-a', planId: 'plan-a', planRevision: 0, pantryRows: [savedRow], state: { weekOf: week, meals: [], pantry: await hydratePantry([savedRow], 'household-a', week, []) } };
  const result = await saveCloudPlanner(client, 'user-a', { ...baseline.state, pantry: [{ ...baseline.state.pantry[0], status: 'have', confirmedEnough: true }] }, baseline);
  const updates = requests.filter(request => request.action === 'update');
  assert.equal(updates.length, 2);
  assert.equal(updates[0].filters.revision, 0);
  assert.equal(updates[1].filters.revision, 1);
  assert.equal(result.state.pantry[0].confirmedEnough, true);
  assert.equal(savedRow.coverage_fingerprint, fingerprint);
});
