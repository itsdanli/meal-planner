import test from 'node:test';
import assert from 'node:assert/strict';
import { assessTonight, rankTonight } from './tonightMatching.ts';
import { calculateGroceries } from './grocery.ts';
import type { PantryEntry, Recipe } from './types.ts';
const recipe: Recipe = { id: 'spinach-bowl', name: 'Spinach bowl', bucket: 'test', bucketLabel: 'Test', time: 15, servings: 2,
  description: '', steps: ['Cook the spinach.'], ingredients: [{ id: 'spinach', name: 'spinach', amount: 200, unit: 'g', category: 'produce' }],
  proteins: [{ name: 'chicken', amount: '200 g', instructions: 'Cook the chicken.' }] };
const pantry = (extra: Partial<PantryEntry> = {}): PantryEntry => ({ id: 'p', name: 'spinach', status: 'have', quantity: 300, unit: 'g', updatedAt: '2026-10-12', ...extra });

test('servings change readiness and the precise shortage', () => {
  const two = assessTonight(recipe, [pantry()], 2);
  assert.equal(two.readiness, 'ready');
  assert.equal(two.ingredients[0].needed, 200);
  const four = assessTonight(recipe, [pantry()], 4);
  assert.equal(four.readiness, 'almost');
  assert.equal(four.ingredients[0].shortage, 100);
  assert.equal(four.ingredients[0].availability, 'missing');
});

test('unknown quantities and plan confirmations never prove tonight is ready', () => {
  for (const confirmedEnough of [false, true]) {
    const result = assessTonight(recipe, [pantry({ quantity: undefined, unit: undefined, confirmedEnough })], 2);
    assert.equal(result.readiness, 'check');
    assert.equal(result.ingredients[0].covered, 0);
  }
});

test('low, incompatible units, missing amounts and ambiguous choices require checking', () => {
  assert.equal(assessTonight(recipe, [pantry({ status: 'low' })], 2).readiness, 'check');
  assert.equal(assessTonight(recipe, [pantry({ unit: 'cup' })], 2).readiness, 'check');
  const uncertain = { ...recipe, ingredients: [{ ...recipe.ingredients[0], amount: null }] };
  assert.equal(assessTonight(uncertain, [pantry()], 2).readiness, 'check');
  const alternative = { ...recipe, ingredients: [{ ...recipe.ingredients[0], name: 'olive oil or avocado oil', amount: 1, unit: 'tbsp' }] };
  assert.equal(assessTonight(alternative, [pantry({ name: 'olive oil', unit: 'tbsp' })], 2).readiness, 'check');
  assert.equal(assessTonight({ ...recipe, ingredients: [] }, [], 2).readiness, 'check');
});

test('missing, out and zero stock are visibly missing; optional extras do not block readiness', () => {
  for (const stock of [[], [pantry({ status: 'out' })], [pantry({ quantity: 0 })]]) {
    assert.equal(assessTonight(recipe, stock, 2).ingredients[0].availability, 'missing');
  }
  const extra = { ...recipe, ingredients: [...recipe.ingredients, { id: 'feta', name: 'feta', amount: 20, unit: 'g', category: 'dairy', optional: true }] };
  assert.equal(assessTonight(extra, [pantry()], 2).readiness, 'ready');
});

test('protein add-ons change readiness and preserve their scaled requirement', () => {
  const result = assessTonight(recipe, [pantry()], 2, 0);
  assert.equal(result.readiness, 'almost');
  assert.equal(result.proteinIndex, 0);
  assert.equal(result.ingredients.find(item => item.name === 'chicken')?.needed, 200);
  assert.equal(assessTonight(recipe, [pantry(), pantry({ id: 'chicken', name: 'chicken', quantity: 200 })], 2, 0).readiness, 'ready');
});

test('individual readiness does not double-count stock when meals enter the week', () => {
  const other = { ...recipe, id: 'second', name: 'Second bowl' };
  assert.ok(rankTonight([recipe, other], [pantry()], 2).every(result => result.readiness === 'ready'));
  const week = calculateGroceries([recipe, other], [{ id: 'one', recipeId: recipe.id, servings: 2 }, { id: 'two', recipeId: other.id, servings: 2 }], [pantry()]);
  assert.equal(week[0].shortage, 100);
});

test('ranking uses selected proteins and rejects invalid serving counts or protein choices', () => {
  const other = { ...recipe, id: 'second', name: 'Second bowl' };
  assert.equal(rankTonight([recipe, other], [pantry()], 2, { [recipe.id]: 0 })[0].recipe.id, 'second');
  for (const servings of [0, -1, 1.5, 25, NaN]) assert.throws(() => assessTonight(recipe, [], servings));
  assert.throws(() => assessTonight(recipe, [], 2, 8));
});

test('pantry sections treat unknown amounts as on hand without claiming verified quantities', () => {
  const result = assessTonight(recipe, [pantry({ quantity: undefined, unit: undefined })], 2);
  assert.deepEqual(result.pantryMissing, []);
  assert.equal(result.readiness, 'check');
  assert.deepEqual(assessTonight(recipe, [pantry()], 4).pantryMissing, ['spinach']);
});

test('pantry sections require every food in a combined line and honor alternatives', () => {
  const combined = { ...recipe, ingredients: [{ ...recipe.ingredients[0], name: 'kosher salt and black pepper' }] };
  assert.deepEqual(assessTonight(combined, [pantry({ name: 'salt' })], 2).pantryMissing, ['black pepper']);
  const choice = { ...recipe, ingredients: [{ ...recipe.ingredients[0], name: 'soy sauce or tamari' }] };
  assert.deepEqual(assessTonight(choice, [pantry({ name: 'tamari', quantity: undefined, unit: undefined })], 2).pantryMissing, []);
});
