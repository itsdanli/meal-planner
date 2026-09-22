import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateGroceries } from './grocery.ts';
import type { Ingredient, Meal, PantryEntry, Recipe } from './types.ts';

const ingredient = (name: string, amount: number | null, unit: string | null = 'g'): Ingredient => ({ id: name, name, amount, unit, category: 'Produce' });
const recipe = (id: string, ingredients: Ingredient[], extra: Partial<Recipe> = {}): Recipe => ({ id, name: id, bucket: 'test', bucketLabel: 'Test', time: 20, servings: 4, description: '', ingredients, steps: [], ...extra });
const meal = (recipeId: string, servings = 4, extra: Partial<Meal> = {}): Meal => ({ id: recipeId, recipeId, servings, ...extra });
const pantry = (name: string, extra: Partial<PantryEntry>): PantryEntry => ({ id: 'unrelated-id', name, status: 'have', updatedAt: '2026-09-22', ...extra });

test('historical recipe snapshot overrides a changed or removed bundled recipe', () => {
  const savedRecipe = recipe('A', [ingredient('spinach', 200)], {
    proteins: [{ name: 'Chicken', amount: '1 lb' }],
  });
  const changedRecipe = recipe('A', [ingredient('kale', 900)], {
    servings: 2, proteins: [{ name: 'Tofu', amount: '2 lb' }],
  });
  const savedMeal = meal('A', 2, { recipeSnapshot: savedRecipe, proteinIndex: 0 });
  for (const library of [[changedRecipe], []]) {
    const items = calculateGroceries(library, [savedMeal], []);
    assert.equal(items.length, 2);
    assert.equal(items.find(item => item.name === 'spinach')?.needed, 100);
    assert.equal(items.find(item => item.name === 'chicken')?.needed, 0.5);
    assert.ok(items.every(item => item.status === 'needed'));
    assert.ok(!items.some(item => item.name === 'kale' || item.name === 'tofu'));
  }
});

test('aggregates compatible mass units, scales servings and subtracts pantry', () => {
  const recipes = [recipe('A', [ingredient('Spinach', 400)]), recipe('B', [ingredient('spinach', 0.5, 'kg')])];
  const [item] = calculateGroceries(recipes, [meal('A'), meal('B')], [pantry('spinach', { quantity: 200, unit: 'g' })]);
  assert.equal(item.needed, 900);
  assert.equal(item.shortage, 700);
  assert.equal(item.status, 'needed');
  assert.deepEqual(item.meals, ['A', 'B']);
  const [scaled] = calculateGroceries(recipes, [meal('A', 2)], []);
  assert.equal(scaled.needed, 200);
});

test('US volume units combine without rounding before subtraction', () => {
  const recipes = [recipe('A', [ingredient('olive oil', 1, 'tbsp'), ingredient('olive oil', 3, 'tsp')])];
  const [item] = calculateGroceries(recipes, [meal('A')], [pantry('olive oil', { quantity: 0.125, unit: 'cup' })]);
  assert.equal(item.needed, 2);
  assert.equal(item.shortage, 0);
  assert.equal(item.covered, 2);
});

test('reviewed prep aliases merge but fresh/dried and different can sizes remain distinct', () => {
  const recipes = [recipe('A', [ingredient('yellow onion, diced', 1, null), ingredient('yellow onion, sliced', 2, null), ingredient('fresh basil, torn', 1, 'cup'), ingredient('dried basil', 1, 'tsp'), ingredient('tomatoes (14oz can)', 1, 'can'), ingredient('tomatoes (28oz can)', 1, 'can')])];
  const items = calculateGroceries(recipes, [meal('A')], []);
  assert.equal(items.length, 5);
  assert.equal(items.find(item => item.name === 'yellow onion')?.needed, 3);
});

test('unknown ingredient amount is retained even alongside a known amount', () => {
  const recipes = [recipe('A', [ingredient('salt', 1, 'tsp'), ingredient('salt', null, 'tsp')])];
  const [item] = calculateGroceries(recipes, [meal('A')], [pantry('salt', { confirmedEnough: true })]);
  assert.equal(item.needed, null);
  assert.equal(item.shortage, null);
  assert.equal(item.status, 'review');
});

test('preparation conjunctions do not require ingredient-choice review', () => {
  const names = [
    'jalapeño, seeded and diced',
    'cannellini beans (15oz can), drained and rinsed',
    'sweet potato, peeled and cubed (½-inch)',
    'asparagus, trimmed and cut into 1-inch pieces',
    'lemon, zested and juiced',
    'kalamata olives, pitted and halved',
  ];
  const items = calculateGroceries([recipe('A', names.map(name => ingredient(name, 1)))], [meal('A')], []);
  assert.equal(items.length, names.length);
  assert.ok(items.every(item => item.status === 'needed' && item.reasons.length === 0));
});

test('actual combinations and alternatives still require ingredient-choice review', () => {
  const names = ['kosher salt and black pepper', 'fresh mint and cilantro', 'fresh cilantro and lime, for topping', 'olive oil or avocado oil', 'parmesan rind + grated parmesan'];
  const items = calculateGroceries([recipe('A', names.map(name => ingredient(name, 1)))], [meal('A')], []);
  assert.ok(items.every(item => item.status === 'review' && item.reasons.includes('Review the ingredient choice or combination.')));
});

test('Have without quantity requires confirmation; low always needs review; out gives no coverage', () => {
  const recipes = [recipe('A', [ingredient('spinach', 100)])];
  const calculate = (entry: PantryEntry) => calculateGroceries(recipes, [meal('A')], [entry])[0];
  assert.equal(calculate(pantry('spinach', {})).status, 'review');
  assert.equal(calculate(pantry('spinach', { confirmedEnough: true })).status, 'covered');
  assert.equal(calculate(pantry('spinach', { status: 'low', quantity: 200, unit: 'g' })).status, 'review');
  assert.equal(calculate(pantry('spinach', { status: 'out', quantity: 200, unit: 'g' })).shortage, 100);
});

test('incompatible pantry units never infer density', () => {
  const recipes = [recipe('A', [ingredient('flour', 100, 'g')])];
  const [item] = calculateGroceries(recipes, [meal('A')], [pantry('flour', { quantity: 1, unit: 'cup' })]);
  assert.equal(item.covered, 0);
  assert.equal(item.shortage, 100);
  assert.equal(item.status, 'review');
});

test('incompatible recipe units remain separate and confirmation cannot cover both', () => {
  const recipes = [recipe('A', [ingredient('flour', 100, 'g'), ingredient('flour', 1, 'cup')])];
  const items = calculateGroceries(recipes, [meal('A')], [pantry('flour', { confirmedEnough: true })]);
  assert.equal(items.length, 2);
  assert.ok(items.every(item => item.status === 'review' && item.covered === 0));
});

test('selected protein scales with portions; unselected protein is omitted', () => {
  const recipes = [recipe('A', [], { proteins: [{ name: 'Chicken', amount: '1 1/2 lb' }, { name: 'Tofu', amount: '8 oz block' }] })];
  assert.deepEqual(calculateGroceries(recipes, [meal('A')], []), []);
  const [chicken] = calculateGroceries(recipes, [meal('A', 2, { proteinIndex: 0 })], []);
  assert.equal(chicken.needed, 0.75);
  assert.equal(chicken.unit, 'lb');
  assert.equal(chicken.status, 'needed');
  const [tofu] = calculateGroceries(recipes, [meal('A', 4, { proteinIndex: 1 })], []);
  assert.equal(tofu.status, 'review');
});

test('invalid numbers cannot produce NaN and pantry subtraction is clamped', () => {
  const recipes = [recipe('A', [ingredient('spinach', 100)])];
  const [item] = calculateGroceries(recipes, [meal('A')], [pantry('spinach', { quantity: 1000, unit: 'g' })]);
  assert.equal(item.shortage, 0);
  const [invalid] = calculateGroceries(recipes, [meal('A', Number.NaN)], []);
  assert.equal(invalid.status, 'review');
  assert.equal(invalid.needed, null);
});
