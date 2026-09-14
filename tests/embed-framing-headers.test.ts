import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The demo embed (/embed/demo/:publicId) is the one route that must be framable by
// third-party sites: a founder pastes the iframe onto their own page and it carries
// the "Made with Creatives Takeover" watermark. Every other route stays DENY.
//
// This is enforced by an additive headers block in vercel.json that restates the whole
// CSP with one directive changed. The duplication is deliberate (a single directive
// inside one header value cannot be partially overridden) and this test is what keeps
// the two copies in sync.

interface HeaderRule {
  source: string;
  headers: Array<{ key: string; value: string }>;
}

const config = JSON.parse(
  readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'),
) as { headers: HeaderRule[] };

const valueOf = (rule: HeaderRule, key: string) =>
  rule.headers.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;

const globalRule = config.headers.find((rule) => rule.source === '/(.*)');
const embedRule = config.headers.at(-1);

test('the global rule still blocks framing everywhere', () => {
  assert.ok(globalRule, 'the /(.*) headers rule is missing');
  assert.equal(valueOf(globalRule, 'X-Frame-Options'), 'DENY');
  assert.match(valueOf(globalRule, 'Content-Security-Policy') ?? '', /frame-ancestors 'none'/);
});

test('the embed override is last, so it wins on duplicate keys', () => {
  // Vercel applies every matching rule; for a duplicate key the later rule wins.
  // If this block stops being last, the global DENY silently takes over again.
  assert.ok(embedRule, 'headers array is empty');
  assert.ok(
    embedRule.source.startsWith('/embed/'),
    `expected the last headers rule to target /embed/, got ${embedRule.source}`,
  );
});

test('the embed route allows framing and is not indexable', () => {
  assert.match(valueOf(embedRule!, 'Content-Security-Policy') ?? '', /frame-ancestors \*/);
  assert.equal(valueOf(embedRule!, 'X-Robots-Tag'), 'noindex');
});

test('the embed CSP differs from the global CSP only in frame-ancestors', () => {
  // The real failure mode this guards: someone adds a connect-src host to the global
  // CSP and forgets the copy, so the embed loads inside a founder's page and then
  // silently records nothing because the Supabase origin is no longer allowed.
  const globalCsp = valueOf(globalRule!, 'Content-Security-Policy') ?? '';
  const embedCsp = valueOf(embedRule!, 'Content-Security-Policy') ?? '';

  assert.equal(
    globalCsp.replace("frame-ancestors 'none'", 'frame-ancestors *'),
    embedCsp,
    'the embed CSP has drifted from the global CSP by more than the frame-ancestors directive',
  );
});

test('no other route is made framable', () => {
  const framable = config.headers.filter(
    (rule) => /frame-ancestors\s+\*/.test(valueOf(rule, 'Content-Security-Policy') ?? ''),
  );
  assert.deepEqual(
    framable.map((rule) => rule.source),
    ['/embed/demo/:publicId*'],
    'frame-ancestors * must stay scoped to the demo embed route',
  );
});
