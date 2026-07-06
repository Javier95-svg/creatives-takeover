import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  MVP_DEEPSEEK_FALLBACK_MODEL,
  MVP_FREE_DEFAULT_MODEL,
  MVP_PREMIUM_DEFAULT_MODEL,
  getMVPDefaultModelForPlan,
  getSelectableMVPModelOptions,
  isMVPModelAllowedForPlan,
  sanitizeMVPModelSelection,
} from '../src/data/mvpModels.ts';

const edgeFunctionSource = readFileSync(
  new URL('../supabase/functions/mvp-builder-generate/index.ts', import.meta.url),
  'utf8'
);

test('MVP Builder defaults use Gemini for Rookie and Starter, Claude for Rising and Pro', () => {
  assert.equal(getMVPDefaultModelForPlan('rookie'), MVP_FREE_DEFAULT_MODEL);
  assert.equal(getMVPDefaultModelForPlan('starter'), MVP_FREE_DEFAULT_MODEL);
  assert.equal(getMVPDefaultModelForPlan('rising'), MVP_PREMIUM_DEFAULT_MODEL);
  assert.equal(getMVPDefaultModelForPlan('pro'), MVP_PREMIUM_DEFAULT_MODEL);
});

test('Rookie and Starter model sanitization removes Claude selections', () => {
  assert.deepEqual(
    sanitizeMVPModelSelection(['claude-sonnet-4-6', 'gemini-3.5-flash'], 'rookie'),
    ['gemini-3.5-flash']
  );
  assert.deepEqual(
    sanitizeMVPModelSelection(['claude-opus-4-8'], 'starter'),
    [MVP_FREE_DEFAULT_MODEL]
  );
});

test('Rising and Pro can select Claude models', () => {
  assert.deepEqual(
    sanitizeMVPModelSelection(['claude-sonnet-4-6'], 'rising'),
    ['claude-sonnet-4-6']
  );
  assert.deepEqual(
    sanitizeMVPModelSelection(['claude-opus-4-8'], 'pro'),
    ['claude-opus-4-8']
  );
});

test('DeepSeek is supported as fallback-only and hidden from selectable models', () => {
  assert.equal(isMVPModelAllowedForPlan(MVP_DEEPSEEK_FALLBACK_MODEL, 'rookie'), false);
  assert.equal(
    getSelectableMVPModelOptions('rookie').some((model) => model.id === MVP_DEEPSEEK_FALLBACK_MODEL),
    false
  );
});

test('MVP Builder repair validates each repair candidate before accepting it', () => {
  assert.match(
    edgeFunctionSource,
    /function getRepairCandidates[\s\S]*DEEPSEEK_FALLBACK_MODEL[\s\S]*selectedModel/
  );
  assert.match(edgeFunctionSource, /async function repairModelOutputWithFallback/);
  assert.match(
    edgeFunctionSource,
    /for \(const candidate of modelCandidates\)[\s\S]*const repaired = await requestModelJson[\s\S]*return validateOutput\(parseAndNormalizeModelOutput\(repaired, currentProject, actionType\)\)/
  );
  assert.doesNotMatch(edgeFunctionSource, /const repaired = await requestModelJsonWithFallback/);
});
