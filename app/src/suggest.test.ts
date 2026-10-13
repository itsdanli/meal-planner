import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStaple, pantryMatches, suggestRecipes } from './suggest.ts';
import type { Ingredient, PantryEntry, Recipe } from './types.ts';

const ingredient = (name: string): Ingredient => ({ id: name, name, amount: 1, unit: null, category: 'produce' });
const recipe = (id: string, names: string[], time = 20): Recipe => ({ id, name: id, bucket: 'test', bucketLabel: 'Test', time, servings: 4, description: '', ingredients: names.map(ingredient), steps: [] });
const pantry = (name: string, status: PantryEntry['status'] = 'have'): PantryEntry => ({ id: name, name, status, updatedAt: '2026-09-22' });

test('matches pantry names to recipe ingredients by the food, not its preparation', () => {
  assert.ok(pantryMatches('garlic', 'garlic cloves, minced'));
  assert.ok(pantryMatches('Olive oil', 'extra-virgin olive oil'));
  assert.ok(pantryMatches('onions', 'large yellow onion, diced (about 1½ cups)'));
  assert.ok(pantryMatches('yellow onion', 'onion'));
  assert.ok(pantryMatches('lime juice', 'fresh lime juice (2 limes)'));
  assert.ok(pantryMatches('tamari', 'low-sodium soy sauce or tamari'));
  assert.ok(pantryMatches('canned chickpeas', 'chickpeas (15oz can), drained and rinsed'));
});

test('does not match a different food that shares a word', () => {
  assert.ok(!pantryMatches('rice vinegar', 'jasmine rice'));
  assert.ok(!pantryMatches('rice', 'rice vinegar'));
  assert.ok(!pantryMatches('sesame oil', 'toasted sesame seeds'));
  assert.ok(!pantryMatches('red bell pepper', 'red pepper flakes'));
  assert.ok(!pantryMatches('', 'garlic'));
});

test('only water and ice are assumed on hand; food staples need tags', () => {
  for (const name of ['water', 'water (to rinse can)', 'ice']) assert.ok(isStaple(name), name);
  for (const name of ['kosher salt', 'black pepper']) assert.ok(!isStaple(name), name);
  assert.ok(!isStaple('red bell pepper'));
  assert.ok(!isStaple('red pepper flakes'));
});

test('ranks recipes by pantry coverage and lists what is missing', () => {
  const recipes = [
    recipe('pasta', ['spaghetti', 'garlic cloves, minced', 'olive oil', 'kosher salt', 'fresh parsley, chopped']),
    recipe('tacos', ['corn tortillas', 'black beans (15oz can)', 'fresh cilantro', 'lime']),
    recipe('curry', ['coconut milk', 'curry paste']),
  ];
  const results = suggestRecipes(recipes, [pantry('spaghetti'), pantry('garlic'), pantry('olive oil'), pantry('canned black beans'), pantry('coconut milk', 'out')]);
  assert.deepEqual(results.map(s => s.recipe.id), ['pasta', 'tacos']);
  assert.equal(results[0].coverage, 3 / 5);
  assert.deepEqual(results[0].missing.map(i => i.name), ['kosher salt', 'fresh parsley, chopped']);
  assert.deepEqual(results[1].missing.map(i => i.name), ['corn tortillas', 'fresh cilantro', 'lime']);
});

test('running-low items count for half and are reported separately', () => {
  const recipes = [recipe('a', ['spinach', 'feta']), recipe('b', ['spinach', 'feta'], 10)];
  const [first, second] = suggestRecipes(recipes, [pantry('spinach'), pantry('feta', 'low')]);
  assert.equal(first.recipe.id, 'b');
  assert.equal(first.coverage, 0.75);
  assert.deepEqual(second.low.map(i => i.name), ['feta']);
});

test('optional extras do not block a match; salt and pepper must both be present', () => {
  const r = recipe('dinner', ['spinach', 'kosher salt and black pepper', 'crumbled feta (optional)']);
  const [partial] = suggestRecipes([r], [pantry('spinach'), pantry('salt')]);
  assert.deepEqual(partial.missing.map(i => i.name), ['black pepper']);
  assert.equal(partial.group, 'almost');
  assert.equal(partial.optional.length, 1);
  const [complete] = suggestRecipes([r], [pantry('spinach'), pantry('salt'), pantry('pepper')]);
  assert.equal(complete.group, 'on-hand');
  assert.equal(complete.coverage, 1);
});

test('zero stock and out items cannot produce a match; low is never labeled on hand', () => {
  const r = recipe('dinner', ['spinach']);
  assert.deepEqual(suggestRecipes([r], [{ ...pantry('spinach'), quantity: 0, unit: 'g' }]), []);
  assert.deepEqual(suggestRecipes([r], [pantry('spinach', 'out')]), []);
  assert.equal(suggestRecipes([r], [pantry('spinach', 'low')])[0].group, 'check');
  assert.deepEqual(suggestRecipes([r], []), []);
});

test('fewer missing requirements rank ahead of a larger recipe with higher overlap', () => {
  const large = recipe('large', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
  const small = recipe('small', ['a', 'z']);
  const result = suggestRecipes([large, small], ['a', 'b', 'c', 'd', 'e', 'f'].map(name => pantry(name)));
  assert.deepEqual(result.map(s => s.recipe.id), ['small', 'large']);
});

test('salt and pepper alone do not suggest the entire dinner library', () => {
  assert.deepEqual(suggestRecipes([recipe('dinner', ['spinach', 'kosher salt', 'black pepper'])], [pantry('salt'), pantry('pepper')]), []);
});
