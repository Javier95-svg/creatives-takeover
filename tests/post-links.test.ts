import test from 'node:test';
import assert from 'node:assert/strict';
import { getPostLinks, getPostYouTubeId } from '../src/lib/postLinks.ts';

test('post links preserve text positions, query strings and URL-only posts', () => {
  const content = 'Demo: https://example.com/demo?a=1&b=2\nwww.example.org';
  const links = getPostLinks(content);
  assert.equal(links.length, 2);
  for (const link of links) assert.equal(content.slice(link.start, link.end), link.text);
  assert.equal(links[0].href, 'https://example.com/demo?a=1&b=2');
  assert.equal(links[1].href, 'https://www.example.org/');
  assert.equal(getPostLinks('https://example.com').length, 1);
});

test('prose punctuation stays outside links while balanced URL parentheses remain', () => {
  assert.equal(getPostLinks('See (https://example.com/demo).')[0].text, 'https://example.com/demo');
  assert.equal(getPostLinks('https://example.com/wiki/Example_(demo)')[0].text, 'https://example.com/wiki/Example_(demo)');
});

test('unsafe schemes and credential-bearing links stay plain text', () => {
  assert.deepEqual(getPostLinks('javascript:alert(1) data:text/html,test ftp://example.com'), []);
  assert.deepEqual(getPostLinks('https://user:password@example.com'), []);
  assert.deepEqual(getPostLinks('https://'), []);
});

test('common YouTube video links create the same validated video id', () => {
  for (const href of [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30',
    'https://youtu.be/dQw4w9WgXcQ?si=example',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/shorts/dQw4w9WgXcQ',
    'https://youtube.com/live/dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  ]) assert.equal(getPostYouTubeId(href), 'dQw4w9WgXcQ', href);
});

test('unrelated hosts, malformed IDs and channel links never create a player', () => {
  for (const href of [
    'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'https://example.com/dQw4w9WgXcQ',
    'https://youtube.com/watch?v=invalid',
    'https://youtube.com/@creatives-takeover',
    'javascript:alert(1)',
    'not a valid video link',
  ]) assert.equal(getPostYouTubeId(href), null, href);
});

