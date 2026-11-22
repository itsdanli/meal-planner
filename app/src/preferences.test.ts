import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDislike, readIdList, withoutDisliked } from './preferences.ts';
import type { Recipe } from './types.ts';

const recipe = (id: string) => ({ id, name: id } as Recipe);

test('saved ID lists ignore invalid entries and duplicates', () => {
  assert.deepEqual(readIdList(['a', 3, 'a', null, 'b']), ['a', 'b']);
  assert.deepEqual(readIdList(undefined), []);
  assert.deepEqual(readIdList('a'), []);
});

test('disliked recipes are removed from what gets suggested', () => {
  const all = [recipe('a'), recipe('b'), recipe('c')];
  assert.deepEqual(withoutDisliked(all, ['b']).map(r => r.id), ['a', 'c']);
  assert.equal(withoutDisliked(all, []), all);
});

test('disliking removes the favorite, and undoing restores only the dislike state', () => {
  const start = { favorites: ['a', 'b'], disliked: ['z'] };
  const after = applyDislike(start, 'a', true);
  assert.deepEqual(after, { favorites: ['b'], disliked: ['z', 'a'] });
  assert.deepEqual(applyDislike(after, 'a', false), { favorites: ['b'], disliked: ['z'] });
});

test('setting the same state twice changes nothing, so a stale Undo is safe', () => {
  const once = applyDislike({ favorites: [], disliked: [] }, 'a', true);
  assert.deepEqual(applyDislike(once, 'a', true), once);
  assert.deepEqual(applyDislike(once, 'a', false), { favorites: [], disliked: [] });
  assert.deepEqual(applyDislike({ favorites: [], disliked: [] }, 'a', false), { favorites: [], disliked: [] });
});
