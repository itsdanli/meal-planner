import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commonItems, rankedCommonItems, suggestedCommonItems } from './pantrySeeds.ts';
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
  assert.deepEqual(produce.slice(0, 3).map(i => [i.name, i.uses]), [['lime juice', 2], ['garlic', 1], ['onion', 0]]);
});

test('adding an item removes its suggestion and replenishes the group', () => {
  const groups = rankedCommonItems([]);
  const before = suggestedCommonItems(groups, [])[0].items.map(item => item.name);
  assert.equal(before.length, 16);
  const after = suggestedCommonItems(groups, [{ id: '1', name: before[0], updatedAt: '2026-10-13T00:00:00Z', status: 'have' }])[0].items.map(item => item.name);
  assert.deepEqual(after, groups[0].items.slice(1, 17).map(item => item.name));
});

test('existing aliases stay in Your items even when out; removing them restores suggestions', () => {
  const groups = rankedCommonItems([]);
  const pantry = [{ id: '1', name: 'garlic cloves, minced', updatedAt: '2026-10-13T00:00:00Z', status: 'out' as const }];
  assert.ok(!suggestedCommonItems(groups, pantry).flatMap(g => g.items).some(i => i.name === 'garlic'));
  assert.ok(suggestedCommonItems(groups, []).flatMap(g => g.items).some(i => i.name === 'garlic'));
});

test('search finds suggestions beyond the initial sixteen and exhausted groups disappear', () => {
  const groups = rankedCommonItems([]);
  assert.deepEqual(suggestedCommonItems(groups, [], 'zucchini').flatMap(g => g.items).map(i => i.name), ['zucchini']);
  const pantry = commonItems.flatMap(g => g.items).map(name => ({ id: name, name, updatedAt: '2026-10-13T00:00:00Z', status: 'have' as const }));
  assert.deepEqual(suggestedCommonItems(groups, pantry), []);
});
