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
