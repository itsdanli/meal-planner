import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dinners from '../../recipes.json';
import daytime from '../../daytime-recipe-expansion.json';
import starterDaytime from '../../daytime-recipes.json';
import images from '../../recipe-images.json';
import { ingredientIdentity } from './ingredients.ts';

test('expanded meals have unique IDs and usable pantry requirements', () => {
  const all = [...dinners, ...daytime, ...starterDaytime];
  assert.equal(new Set(all.map(recipe => recipe.id)).size, all.length);
  const missingFromSearch: string[] = [];
  for (const recipe of [...dinners.slice(39), ...daytime]) {
    assert.ok(recipe.source?.trim(), `${recipe.id} needs a source`);
    assert.ok(recipe.steps.length >= 2, `${recipe.id} needs cooking instructions`);
    assert.ok(recipe.ingredients.length >= 4, `${recipe.id} needs ingredients`);
    for (const ingredient of recipe.ingredients) {
      assert.ok(Number.isFinite(ingredient.amount) && ingredient.amount > 0, `${recipe.id}: ${ingredient.name}`);
      if (ingredientIdentity(ingredient.name).startsWith('custom:')) missingFromSearch.push(`${recipe.id}: ${ingredient.name}`);
    }
  }
  assert.deepEqual(missingFromSearch, [], 'Add these ingredients to pantry search');
  for (const recipe of dinners) assert.equal(recipe.proteins?.length, 3, `${recipe.id} needs three protein add-ons`);
});

test('every new photo entry has a search query and every selected file exists', () => {
  for (const recipe of [...dinners.slice(39), ...daytime]) {
    const image = images[recipe.id as keyof typeof images];
    assert.ok(image && 'query' in image && image.query, `${recipe.id} needs an image query`);
    if ('file' in image && image.file) {
      assert.ok(existsSync(resolve('public/recipe-images', image.file)), `${recipe.id} image is missing`);
      assert.ok('sourceUrl' in image && image.sourceUrl, `${recipe.id} image needs a credit`);
    }
  }
});
