import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRandomRecipes } from './randomMeals.ts';
import type { Recipe } from './types.ts';

const recipes = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(id => ({ id, name: id }) as Recipe);

test('picks the requested number of distinct recipes', () => {
  for (let run = 0; run < 50; run++) {
    const ids = pickRandomRecipes(recipes, 3).map(recipe => recipe.id);
    assert.equal(new Set(ids).size, 3);
  }
});

test('a reshuffle avoids the current recipes', () => {
  for (let run = 0; run < 50; run++) {
    const ids = pickRandomRecipes(recipes, 3, ['a', 'b', 'c']).map(recipe => recipe.id);
    assert.ok(ids.every(id => !['a', 'b', 'c'].includes(id)));
  }
});

test('repeats are used only when too few other recipes remain', () => {
  const ids = pickRandomRecipes(recipes.slice(0, 4), 3, ['a', 'b', 'c']).map(recipe => recipe.id);
  assert.equal(ids[0], 'd');
  assert.equal(new Set(ids).size, 3);
  assert.equal(pickRandomRecipes(recipes.slice(0, 2), 3).length, 2);
});
