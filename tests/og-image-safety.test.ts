import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSafeImageDataUrl } from '../api/_og-image.ts';

test('share-card image loader never fetches arbitrary hosts', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error('unexpected network request');
  };
  try {
    assert.equal(await loadSafeImageDataUrl('https://127.0.0.1/private'), null);
    assert.equal(await loadSafeImageDataUrl('https://attacker.example/image.png'), null);
    assert.equal(await loadSafeImageDataUrl('http://lh3.googleusercontent.com/avatar'), null);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('share-card image loader embeds bounded trusted bytes and rejects redirects', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(new Uint8Array([137, 80, 78, 71]), {
    headers: { 'content-type': 'image/png' },
  });
  try {
    const safe = await loadSafeImageDataUrl('https://lh3.googleusercontent.com/avatar');
    assert.equal(safe, 'data:image/png;base64,iVBORw==');

    globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/' } });
    assert.equal(await loadSafeImageDataUrl('https://lh3.googleusercontent.com/avatar'), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
