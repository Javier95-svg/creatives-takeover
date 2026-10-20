import test from 'node:test';
import assert from 'node:assert/strict';
import { getPostTextLinks, remarkPlatformMentions } from '../src/lib/platformMentions.ts';

test('platform mentions map to canonical routes regardless of case', () => {
  const links = getPostTextLinks('@Rooms @LAUNCHPAD and @newspaper!');
  assert.deepEqual(links.map((link) => link.href), ['/rooms', '/launchpad', '/newspaper']);
});

test('mentions do not alter emails, longer handles, URLs, or unknown names', () => {
  const links = getPostTextLinks('hi@Rooms.com @RoomsExtra @Rooms-team @Someone https://example.com/@Rooms');
  assert.deepEqual(links.map((link) => link.href), ['https://example.com/@Rooms']);
});

test('mixed text, URLs and mentions retain their original offsets', () => {
  const content = 'Try @Launchpad: https://example.com and @Rooms.';
  for (const link of getPostTextLinks(content)) assert.equal(content.slice(link.start, link.end), link.text);
});

test('Markdown transformation preserves existing links and code', () => {
  const tree = { type: 'root', children: [{ type: 'paragraph', children: [
    { type: 'text', value: 'See @Rooms!' },
    { type: 'link', url: 'https://example.com', children: [{ type: 'text', value: '@Launchpad' }] },
    { type: 'inlineCode', value: '@Newspaper' },
  ] }] };
  remarkPlatformMentions()(tree);
  assert.deepEqual(tree.children[0].children[1], { type: 'link', url: '/rooms', children: [{ type: 'text', value: '@Rooms' }] });
  assert.deepEqual(tree.children[0].children[3], { type: 'link', url: 'https://example.com', children: [{ type: 'text', value: '@Launchpad' }] });
  assert.deepEqual(tree.children[0].children[4], { type: 'inlineCode', value: '@Newspaper' });
});
