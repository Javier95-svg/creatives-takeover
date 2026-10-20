import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';

test('selecting more images appends them, allows removal, and enforces four', async () => {
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://creatives-takeover.com' });
  const originals = new Map(['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  URL.createObjectURL = () => 'blob:test-image';
  URL.revokeObjectURL = () => {};
  let root;
  try {
    const result = await build({
      entryPoints: ['src/components/profile/PostImagePicker.tsx'], bundle: true,
      platform: 'node', format: 'cjs', packages: 'external', write: false,
      tsconfig: 'tsconfig.app.json',
    });
    const mod = { exports: {} };
    new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
    const { PostImagePicker } = mod.exports;
    let selected = [];
    function Harness() {
      const [images, setImages] = useState([]);
      selected = images;
      return React.createElement(PostImagePicker, { images, onChange: setImages });
    }
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(React.createElement(Harness)));
    const input = document.querySelector('input[type=file]');
    assert.equal(input.multiple, true);
    const select = async (names) => {
      Object.defineProperty(input, 'files', { configurable: true, value: names.map((name) => new dom.window.File(['image'], name, { type: 'image/png' })) });
      await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
    };
    await select(['first.png']);
    await select(['second.png']);
    assert.deepEqual(selected.map((image) => image.file.name), ['first.png', 'second.png']);
    assert.equal(document.querySelectorAll('img').length, 2);
    await act(async () => document.querySelector('[aria-label="Remove image 1"]').click());
    assert.equal(selected[0].file.name, 'second.png');
    await select(['third.png', 'fourth.png', 'fifth.png']);
    assert.equal(selected.length, 4);
    assert.equal(document.querySelectorAll('img').length, 4);
    assert.equal([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Add images')).disabled, true);
    await select(['sixth.png']);
    assert.equal(selected.length, 4);
    const galleryBuild = await build({
      entryPoints: ['src/components/profile/PostImageGallery.tsx'], bundle: true,
      platform: 'node', format: 'cjs', packages: 'external', write: false,
      tsconfig: 'tsconfig.app.json',
    });
    const galleryModule = { exports: {} };
    new Function('require', 'module', 'exports', galleryBuild.outputFiles[0].text)(createRequire(import.meta.url), galleryModule, galleryModule.exports);
    await act(async () => root.render(React.createElement(galleryModule.exports.PostImageGallery, {
      images: ['https://example.com/first.png', 'https://example.com/second.png'], authorName: 'Founder',
    })));
    assert.equal(document.querySelectorAll('[aria-label^="Show post image"]').length, 2);
    assert.equal(document.querySelector('img').src, 'https://example.com/first.png');
    await act(async () => document.querySelector('[aria-label="Show post image 2 of 2"]').click());
    assert.equal(document.querySelector('img').src, 'https://example.com/second.png');
    await act(async () => document.querySelector('[aria-label="Next image"]').click());
    assert.equal(document.querySelector('img').src, 'https://example.com/first.png');
  } finally {
    if (root) await act(async () => root.unmount());
    dom.window.close();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
