import test from 'node:test';
import assert from 'node:assert/strict';

import { mapFramesToStepInputs, type ScreenFrame } from '../src/lib/demoStudio/screenCapture.ts';

function frame(content: string, width = 1280, height = 720): ScreenFrame {
  return { blob: new Blob([content], { type: 'image/jpeg' }), width, height };
}

test('mapFramesToStepInputs returns an empty list for no frames', () => {
  assert.deepEqual(mapFramesToStepInputs([], 0), []);
  assert.deepEqual(mapFramesToStepInputs([], 5), []);
});

test('mapFramesToStepInputs numbers steps and filenames from position 0', () => {
  const frames = [frame('a'), frame('b'), frame('c')];
  const result = mapFramesToStepInputs(frames, 0);

  assert.deepEqual(
    result.map((r) => r.position),
    [0, 1, 2],
  );
  assert.deepEqual(
    result.map((r) => r.fileName),
    ['screen-1.jpg', 'screen-2.jpg', 'screen-3.jpg'],
  );
});

test('mapFramesToStepInputs appends after existing steps', () => {
  const frames = [frame('a'), frame('b')];
  const result = mapFramesToStepInputs(frames, 2);

  assert.deepEqual(
    result.map((r) => r.position),
    [2, 3],
  );
  assert.deepEqual(
    result.map((r) => r.fileName),
    ['screen-3.jpg', 'screen-4.jpg'],
  );
});

test('mapFramesToStepInputs passes blob and dimensions through unchanged', () => {
  const frames = [frame('a', 1920, 1080), frame('b', 800, 600)];
  const result = mapFramesToStepInputs(frames, 0);

  assert.equal(result[0].blob, frames[0].blob);
  assert.equal(result[0].width, 1920);
  assert.equal(result[0].height, 1080);
  assert.equal(result[1].blob, frames[1].blob);
  assert.equal(result[1].width, 800);
  assert.equal(result[1].height, 600);
});
