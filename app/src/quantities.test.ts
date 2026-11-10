import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatAmount, scaledProteinAmount } from './quantities';
import { calculateGroceries } from './grocery';
import { recipes } from './data';
import RecipeSheet from './RecipeSheet';

test('display fractions preserve exact calculations and unparseable protein quantities are explicit', () => {
  assert.equal(formatAmount(0.75), '¾');
  assert.equal(formatAmount(1.5), '1½');
  assert.equal(scaledProteinAmount('1 1/2 lb', 0.5), '¾ lb');
  assert.match(scaledProteinAmount('8 oz block', 0.75), /original amount; multiply by ¾/);
});

test('planned tacos use 9 tortillas at 3 servings and restore 12 at 4 in groceries and recipe print', () => {
  const recipe = recipes.find(item => item.id === 'black-bean-tacos')!;
  for (const [servings, tortillas] of [[3, 9], [4, 12]]) {
    const meal = { id: 'tacos', recipeId: recipe.id, servings, proteinIndex: 0 };
    const groceries = calculateGroceries(recipes, [meal], []);
    assert.equal(groceries.find(item => item.name === 'corn tortillas (6-inch)')?.needed, tortillas);
    assert.equal(groceries.find(item => item.name === 'skirt steak strips')?.needed, servings / recipe.servings);
    const sheet = renderToStaticMarkup(createElement(RecipeSheet, { weekLabel: 'November 9', meals: [{ meal, recipe }], sides: 1 }));
    assert.match(sheet, new RegExp(`${tortillas}.*corn tortillas`));
    assert.match(sheet, new RegExp(`${servings} servings`));
    if (servings !== recipe.servings) assert.match(sheet, /Method ingredient amounts are for 4 servings/);
  }
});
