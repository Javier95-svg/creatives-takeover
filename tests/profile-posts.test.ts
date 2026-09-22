import test from 'node:test';
import assert from 'node:assert/strict';
import { insertPostEmoji, validatePost, validatePostImage } from '../src/lib/profilePosts.ts';

test('accepts text, photo, or both, but rejects empty and oversized updates', () => {
  assert.equal(validatePost('First customer!', false, ''), null);
  assert.equal(validatePost('', true, ''), null);
  assert.equal(validatePost('Prototype', true, ''), null);
  assert.ok(validatePost(' \n ', false, ''));
  assert.ok(validatePost('x'.repeat(5001), true, ''));
});

test('scheduling rejects invalid, past, and exactly current times', () => {
  const now = Date.parse('2026-09-23T12:00:00Z');
  assert.equal(validatePost('Milestone', false, '2026-09-24T14:00:00Z', now), null);
  assert.ok(validatePost('Milestone', false, 'invalid', now));
  assert.ok(validatePost('Milestone', false, '2026-09-23T11:59:00Z', now));
  assert.ok(validatePost('Milestone', false, '2026-09-23T12:00:00Z', now));
});

test('photos accept supported raster formats and enforce the upload limit', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
    assert.equal(validatePostImage({ type, size: 5 * 1024 * 1024 }), null);
  }
  assert.ok(validatePostImage({ type: 'image/svg+xml', size: 100 }));
  assert.ok(validatePostImage({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }));
});

test('emoji insertion uses the caret or replaces a selection without exceeding the limit', () => {
  assert.deepEqual(insertPostEmoji('We shipped today', '🚀', 11, 11), { text: 'We shipped 🚀today', cursor: 13 });
  assert.deepEqual(insertPostEmoji('Great work', '🎉', 0, 5), { text: '🎉 work', cursor: 2 });
  assert.equal(insertPostEmoji('x'.repeat(4999), '🚀', 4999, 4999), null);
});
