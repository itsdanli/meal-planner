import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildShoppingList, formatShoppingList } from './shoppingList.ts';
import type { GroceryItem } from './types.ts';

const item = (name: string, extra: Partial<GroceryItem>): GroceryItem => ({ id: name, name, category: 'Produce', unit: 'g', needed: 100, covered: 0, shortage: 100, status: 'needed', reasons: [], meals: ['A'], ...extra });

test('shopping list leaves out pantry-covered items and rounds counted items up', () => {
  const list = buildShoppingList([
    item('limes', { unit: '', shortage: 1.5 }),
    item('black beans (15oz can)', { unit: 'can', shortage: 2 }),
    item('rice', { covered: 100, shortage: 0, status: 'covered' }),
  ]);
  assert.deepEqual(list, [{ item: 'limes', quantity: 2 }, { item: 'black beans (15oz can)', quantity: 2 }]);
});

test('weights, volumes and partial packages become one package with the amount as a note', () => {
  const list = buildShoppingList([
    item('spinach', { covered: 40, shortage: 60 }),
    item('garlic cloves', { unit: 'clove', shortage: 4 }),
    item('butter', { unit: 'cup', shortage: 1 / 3, status: 'review' }),
  ]);
  assert.deepEqual(list, [
    { item: 'spinach', quantity: 1, note: 'need about 60 g' },
    { item: 'garlic cloves', quantity: 1, note: 'need about 4 clove' },
    { item: 'butter', quantity: 1, note: 'need about 0.33 cup; check before buying: confirm the amount needed' },
  ]);
});

test('uncertain items retain a check note in the shopping export', () => {
  const list = buildShoppingList([
    item('salt', { needed: null, shortage: null, status: 'review' }),
    item('olive oil', { covered: 100, shortage: 0, status: 'review' }),
  ]);
  assert.deepEqual(list, [{ item: 'salt', quantity: 1, note: 'check before buying: confirm the amount needed' }, { item: 'olive oil', quantity: 1, note: 'check before buying: confirm the amount needed' }]);
});

test('store brand preference is added to every note', () => {
  const list = buildShoppingList([item('limes', { unit: '', shortage: 2 }), item('spinach', { shortage: 60 })], { preferStoreBrand: true });
  assert.deepEqual(list.map(i => i.note), ['store brand preferred', 'need about 60 g; store brand preferred']);
});

test('formats one item per line as valid JSON', () => {
  const list = [{ item: 'whole "2%" milk', quantity: 2 }, { item: 'frozen broccoli', quantity: 3, note: 'organic preferred' }];
  const text = formatShoppingList(list);
  assert.deepEqual(JSON.parse(text), list);
  assert.equal(text.split('\n')[2], '  {"item": "frozen broccoli", "quantity": 3, "note": "organic preferred"}');
  assert.equal(formatShoppingList([]), '[]');
});
