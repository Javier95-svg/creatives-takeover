import test from 'node:test';
import assert from 'node:assert/strict';
import { orderProfilePosts } from '../src/lib/profilePosts.ts';

const old = { source: 'journey', id: 'old', date: '2026-01-01T12:00:00Z' };
const middle = { source: 'photo', id: 'middle', date: '2026-02-01T12:00:00Z' };
const newest = { source: 'community', id: 'newest', date: '2026-03-01T12:00:00Z' };

test('a pin appears once, above newer posts, without mutating the input', () => {
  const input = [middle, old, newest];
  assert.deepEqual(orderProfilePosts(input, old), [old, newest, middle]);
  assert.deepEqual(input, [middle, old, newest]);
});
test('a pin outside the loaded page is still included', () => {
  assert.deepEqual(orderProfilePosts([middle, newest], old), [old, newest, middle]);
});
test('unpinning restores posting order; replacing a pin does not duplicate it', () => {
  const current = orderProfilePosts([old, middle, newest], old);
  assert.deepEqual(orderProfilePosts(current, null), [newest, middle, old]);
  assert.deepEqual(orderProfilePosts(current, middle), [middle, newest, old]);
});
test('reposts sort by the displayed original posting date, and source IDs stay distinct', () => {
  const repost = { ...old, reposted_at: '2026-04-01T12:00:00Z' };
  const collision = { ...middle, id: old.id };
  assert.deepEqual(orderProfilePosts([repost, newest, collision]), [newest, collision, repost]);
});
