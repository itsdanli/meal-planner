import test from 'node:test';
import assert from 'node:assert/strict';
import { ingredientCatalog, ingredientIdentity, pantryMatches, searchIngredients } from './ingredients.ts';
import { recipes } from './data.ts';

test('catalog aliases have one stable identity and every dinner line is enriched', () => {
  const names = ingredientCatalog.flatMap(item => [item.name, ...item.aliases]);
  assert.equal(new Set(names).size, names.length);
  assert.equal(new Set(ingredientCatalog.map(item => item.id)).size, ingredientCatalog.length);
  for (const item of ingredientCatalog) for (const alias of item.aliases) assert.equal(ingredientIdentity(alias), item.id);
  for (const recipe of recipes) for (const ingredient of recipe.ingredients) assert.equal(ingredient.ingredientId, ingredientIdentity(ingredient.name));
});

test('different forms and unsupported substitutions cannot silently satisfy requirements', () => {
  for (const [available, required] of [
    ['dried basil', 'fresh basil, torn'], ['dried chickpeas', 'chickpeas (15oz can), drained and rinsed'],
    ['chickpeas', 'canned chickpeas'], ['lime juice', 'lime'], ['lime', 'lime juice'],
    ['rice', 'rice vinegar'], ['garlic powder', 'garlic cloves, minced'],
    ['silken tofu', 'firm tofu'], ['tomatoes (14oz can)', 'tomatoes (28oz can)'],
  ]) assert.equal(pantryMatches(available, required), false, `${available} / ${required}`);
  assert.equal(pantryMatches('garlic', 'garlic cloves, minced'), true);
  assert.equal(pantryMatches('tamari', 'low-sodium soy sauce or tamari'), true);
  assert.equal(pantryMatches('sliced', 'English cucumber, julienned or thinly sliced'), false);
});

test('search finds the canonical tag through its aliases', () => {
  assert.equal(searchIngredients('scallions')[0].name, 'green onions');
  assert.equal(searchIngredients('  EXTRA-VIRGIN ')[0].name, 'olive oil');
  assert.deepEqual(searchIngredients(''), []);
});
