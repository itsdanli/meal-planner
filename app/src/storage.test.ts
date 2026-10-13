import test from 'node:test';
import assert from 'node:assert/strict';
import { createSamplePlanner, isPlannerState, loadPlanner, savePlanner } from './storage';

test('sample data is valid; broken or obsolete stored recipes are rejected', () => {
  const state = createSamplePlanner();
  assert.equal(isPlannerState(state), true);
  assert.equal(isPlannerState({ ...state, meals: [{ ...state.meals[0], servings: -1 }] }), false);
  assert.equal(isPlannerState({ ...state, meals: [{ ...state.meals[0], recipeId: 'deleted' }] }), false);
  assert.equal(isPlannerState({ ...state, pantry: [{ id: 'broken' }] }), false);
});

test('storage recovers from corrupt data and round-trips a valid plan', () => {
  let saved = '{broken';
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; },
  } });
  assert.equal(isPlannerState(loadPlanner()), true);
  const state = createSamplePlanner();
  state.meals = [];
  savePlanner(state);
  assert.deepEqual(loadPlanner(), state);
  Reflect.deleteProperty(globalThis, 'localStorage');
});

test('legacy saved data keeps names, quantities and meals while invalidating old coverage', () => {
  const old = createSamplePlanner();
  old.pantry.push({ id: 'custom', name: 'My special spice', status: 'low', quantity: 2, unit: 'tsp', updatedAt: '2026-10-12' });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify(old) } });
  const loaded = loadPlanner();
  assert.deepEqual(loaded.meals, old.meals);
  assert.deepEqual(loaded.pantry[2], { ...old.pantry[2], confirmedEnough: false });
  assert.ok(loaded.pantry.every(item => !item.confirmedEnough));
  Reflect.deleteProperty(globalThis, 'localStorage');
});
