import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recipes } from './data';
import { isRecipeSnapshot, serializeMeals } from './cloud';
import { calculateGroceries } from './grocery';
import { createSamplePlanner, isPlannerState } from './storage';

test('breakfast and lunch recipes have valid snapshots and survive plan serialization', () => {
  for (const type of ['breakfast', 'lunch']) {
    const choices = recipes.filter(r => r.mealType === type);
    assert.equal(choices.length, 4);
    assert.ok(choices.every(isRecipeSnapshot));
    const meals = choices.map(r => ({ id: r.id, recipeId: r.id, servings: r.servings }));
    const saved = serializeMeals(meals);
    assert.ok(saved.every(m => m.recipeSnapshot.mealType === type));
    assert.ok(isPlannerState({ ...createSamplePlanner(), meals: saved }));
  }
  assert.equal(isRecipeSnapshot({ ...recipes[0], mealType: 'invalid' }), false);
  assert.ok(createSamplePlanner().meals.every(m => !recipes.find(r => r.id === m.recipeId)?.mealType));
});

test('one shopping list combines ingredients across breakfast and lunch and scales servings', () => {
  const breakfast = recipes.find(r => r.id === 'breakfast-banana-oats')!;
  const lunch = recipes.find(r => r.id === 'lunch-peanut-noodles')!;
  const meals = [{ id: 'b', recipeId: breakfast.id, servings: 4 }, { id: 'l', recipeId: lunch.id, servings: 2 }];
  const items = calculateGroceries(recipes, meals, []);
  const peanutButter = items.find(i => i.name === 'peanut butter')!;
  assert.equal(peanutButter.needed, 7);
  assert.equal(peanutButter.meals.length, 2);
});
