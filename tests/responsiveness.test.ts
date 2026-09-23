import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { PUBLIC_LIST_CACHE } from '../src/lib/publicListCache.ts';
import { storageImageUrl, storageImageSrcSet } from '../src/lib/storageImage.ts';
import { createHeaderRefreshQueue, refreshHeaderCounts, subscribeWorkspaceHeader } from '../src/lib/workspaceHeaderRealtime.ts';

const flush = () => new Promise<void>(resolve => setImmediate(resolve));
const read = (file: string) => readFileSync(file, 'utf8');

test('incoming events cancel older snapshots and fetch a new count, including during bootstrap', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let calls = 0;
  let oldSignal: AbortSignal | undefined;
  const queryKey = ['workspace-header-counts', 'account-a'];
  const observer = new QueryObserver(client, {
    queryKey,
    queryFn: async ({ signal }) => {
      calls++;
      if (calls === 1) {
        oldSignal = signal;
        return new Promise<{ unreadMessages: number }>(() => {});
      }
      return { unreadMessages: 3 };
    },
  });
  const stop = observer.subscribe(() => {});
  try {
    assert.equal(calls, 1);
    await refreshHeaderCounts(client, 'account-a');
    assert.equal(oldSignal?.aborted, true);
    assert.equal(calls, 2);
    assert.deepEqual(client.getQueryData(queryKey), { unreadMessages: 3 });
  } finally { stop(); client.clear(); }
});

test('bursts use one refresh; an event during an in-flight read is never lost', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  let finish!: () => void;
  const queue = createHeaderRefreshQueue(async () => {
    calls++;
    if (calls === 1) await new Promise<void>(resolve => { finish = resolve; });
  });
  queue.request(); queue.request(); queue.request();
  t.mock.timers.tick(75);
  assert.equal(calls, 1);
  queue.request(); queue.request();
  t.mock.timers.tick(1000);
  assert.equal(calls, 1);
  finish(); await flush();
  t.mock.timers.tick(75); await flush();
  assert.equal(calls, 2);
  queue.request(); queue.stop(); t.mock.timers.tick(1000);
  assert.equal(calls, 2);
});

test('realtime shares one account channel, reconciles reconnects, and cleans up', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const handlers: Array<{ filter: any; callback: () => void }> = [];
  let subscribed!: (status: string) => void;
  let channels = 0, removed = 0, first = 0, second = 0;
  const channel = {
    on(_type: string, filter: any, callback: () => void) { handlers.push({ filter, callback }); return this; },
    subscribe(callback: (status: string) => void) { subscribed = callback; return this; },
  };
  const client = { channel() { channels++; return channel; }, async removeChannel() { removed++; } };
  const off1 = subscribeWorkspaceHeader(client as any, 'account-a', async () => { first++; });
  const off2 = subscribeWorkspaceHeader(client as any, 'account-a', async () => { second++; });
  assert.equal(channels, 1);
  assert.deepEqual(handlers.filter(h => h.filter.table === 'messages').map(h => h.filter.event), ['INSERT', 'UPDATE']);
  assert.ok(handlers.every(h => h.filter.filter.includes('account-a')));
  subscribed('SUBSCRIBED'); t.mock.timers.tick(75); await flush();
  assert.equal(first, 1); assert.equal(second, 1);
  off1(); handlers[0].callback(); t.mock.timers.tick(75); await flush();
  assert.equal(first, 1); assert.equal(second, 2); assert.equal(removed, 0);
  subscribed('SUBSCRIBED'); t.mock.timers.tick(75); await flush();
  assert.equal(second, 3);
  handlers[0].callback(); off2(); t.mock.timers.tick(75); await flush();
  assert.equal(second, 3); assert.equal(removed, 1);
  const off3 = subscribeWorkspaceHeader(client as any, 'account-b', async () => {});
  assert.equal(channels, 2); off3(); assert.equal(removed, 2);
});

test('public list requests deduplicate, reuse fresh results and refresh after mutation', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  try {
    let requests = 0;
    const options = { queryKey: ['public-stories', 'list'], ...PUBLIC_LIST_CACHE,
      queryFn: async () => { requests++; await flush(); return [{ id: requests }]; } };
    const [a, b] = await Promise.all([client.fetchQuery(options), client.fetchQuery(options)]);
    assert.equal(requests, 1); assert.deepEqual(a, b);
    await client.fetchQuery(options); assert.equal(requests, 1);
    await client.invalidateQueries({ queryKey: ['public-stories'] });
    await client.fetchQuery(options); assert.equal(requests, 2);
    client.setQueryData(options.queryKey, [], { updatedAt: Date.now() - PUBLIC_LIST_CACHE.staleTime - 1 });
    await client.fetchQuery(options); assert.equal(requests, 3);
  } finally { client.clear(); }
});

test('listing/search exclude bodies; detail/editor reads stay complete; writes invalidate caches', () => {
  const stories = read('src/hooks/useStories.ts');
  const fields = stories.match(/STORY_LIST_FIELDS = '([^']+)'/)![1].split(',');
  assert.ok(!fields.includes('body_content'));
  for (const field of ['title', 'slug', 'excerpt', 'hashtags', 'banner_image_url', 'published_at']) assert.ok(fields.includes(field));
  assert.equal((stories.match(/\.select\(STORY_LIST_FIELDS\)/g) || []).length, 2);
  assert.match(stories.slice(stories.indexOf('const fetchStoryBySlug')), /\.select\('\*'\)/);
  assert.match(stories.slice(stories.indexOf('const fetchStoryById')), /\.select\('\*'\)/);
  for (const [source, prefix] of [[stories, 'public-stories'], [read('src/hooks/useAngels.ts'), 'public-angels']]) {
    assert.equal((source.match(new RegExp(`invalidateQueries\\(\\{ queryKey: \\['${prefix}'\\]`, 'g')) || []).length, 3);
    assert.match(source, /\.\.\.PUBLIC_LIST_CACHE/);
  }
});

test('banner variants keep aspect ratio and existing avatars keep square sizing', () => {
  const original = 'https://example.supabase.co/storage/v1/object/public/story-banners/photo.png';
  const banner = new URL(storageImageUrl(original, { width: 320, height: null, quality: 80 })!);
  assert.equal(banner.searchParams.get('width'), '640');
  assert.equal(banner.searchParams.has('height'), false);
  assert.match(banner.pathname, /render\/image\/public/);
  const avatar = new URL(storageImageUrl(original, { width: 96 })!);
  assert.equal(avatar.searchParams.get('width'), avatar.searchParams.get('height'));
  const srcset = storageImageSrcSet(original, [160, 320, 480, 640], { height: null })!;
  assert.match(srcset, /320w/); assert.match(srcset, /1280w/); assert.doesNotMatch(srcset, /height=/);
  assert.equal(storageImageUrl('https://external.test/photo.jpg', { width: 320 }), 'https://external.test/photo.jpg');
  const card = read('src/components/stories/StoryCard.tsx');
  assert.match(card, /originalFallback/);
  assert.match(card, /removeAttribute\('srcset'\)/);
  assert.match(card, /object-cover/);
});
