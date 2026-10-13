import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commonItems, rankedCommonItems } from './pantrySeeds.ts';
import type { Recipe } from './types.ts';

const recipe = (id: string, names: string[]): Recipe => ({ id, name: id, bucket: 'test', bucketLabel: 'Test', time: 20, servings: 4, description: '', ingredients: names.map(name => ({ id: name, name, amount: 1, unit: null, category: 'produce' })), steps: [] });

test('common items are unique, lowercase names', () => {
  const names = commonItems.flatMap(g => g.items);
  assert.equal(new Set(names).size, names.length);
  assert.ok(names.every(n => n === n.toLowerCase().trim()));
});

test('orders each group by how many recipes use the item, keeping list order for ties', () => {
  const recipes = [recipe('a', ['lime juice', 'garlic cloves, minced']), recipe('b', ['fresh lime juice (2 limes)'])];
  const produce = rankedCommonItems(recipes).find(g => g.group === 'Produce')!.items;
  assert.deepEqual(produce.slice(0, 3).map(i => [i.name, i.uses]), [['lime', 2], ['garlic', 1], ['onion', 0]]);
});
