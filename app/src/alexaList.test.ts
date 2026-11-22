import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAlexaParts, alexaLine, STORE_BRAND_HEADER } from './alexaList.ts';

const items = (...names: string[]) => names.map(item => ({ item, quantity: 1 }));

test('items are plain lines and quantities above one lead the line', () => {
  assert.equal(alexaLine({ item: 'limes', quantity: 2 }), '2 limes');
  assert.equal(alexaLine({ item: 'spinach', quantity: 1, note: 'need about 60 g' }), 'spinach');
  assert.deepEqual(buildAlexaParts([{ item: 'limes', quantity: 2 }, { item: 'spinach', quantity: 1 }]), ['2 limes\nspinach']);
});

test('store brand preference appears once at the top of each part, not on every item', () => {
  const parts = buildAlexaParts(items('rice', 'beans'), { preferStoreBrand: true });
  assert.deepEqual(parts, [`${STORE_BRAND_HEADER}\nrice\nbeans`]);
  const many = buildAlexaParts(items(...Array.from({ length: 40 }, (_, i) => `item number ${i}`)), { preferStoreBrand: true, limit: 100 });
  assert.ok(many.length > 1);
  assert.ok(many.every(part => part.startsWith(`${STORE_BRAND_HEADER}\n`)));
  assert.ok(many.every(part => part.split(STORE_BRAND_HEADER).length === 2));
});

test('every part fits the limit and no item is split or lost', () => {
  const names = Array.from({ length: 60 }, (_, i) => `ingredient ${i} (15oz can)`);
  for (const preferStoreBrand of [false, true]) {
    const parts = buildAlexaParts(items(...names), { preferStoreBrand, limit: 200 });
    assert.ok(parts.every(part => part.length <= 200), 'a part is over the limit');
    const rebuilt = parts.flatMap(part => part.split('\n')).filter(line => line !== STORE_BRAND_HEADER);
    assert.deepEqual(rebuilt, names);
  }
});

test('the default limit keeps parts under 500 characters', () => {
  const parts = buildAlexaParts(items(...Array.from({ length: 80 }, (_, i) => `garlic cloves variety ${i}`)), { preferStoreBrand: true });
  assert.ok(parts.length > 1);
  assert.ok(parts.every(part => part.length < 500));
});

test('a part is filled right up to the limit before starting the next', () => {
  assert.deepEqual(buildAlexaParts(items('aaaa', 'bbbb', 'cccc'), { limit: 9 }), ['aaaa\nbbbb', 'cccc']);
  assert.deepEqual(buildAlexaParts(items('aaaa', 'bbbb', 'cccc'), { limit: 14 }), ['aaaa\nbbbb\ncccc']);
});

test('an overlong single name is shortened instead of exceeding the limit', () => {
  const [part] = buildAlexaParts(items('x'.repeat(600)));
  assert.ok(part.length <= 480);
  assert.ok(part.endsWith('…'));
});

test('an empty list produces no parts', () => {
  assert.deepEqual(buildAlexaParts([]), []);
});
