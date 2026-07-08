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
const hookSource = readFileSync(
  new URL('../src/hooks/useMVPBuilder.ts', import.meta.url),
  'utf8'
);
const messageItemSource = readFileSync(
  new URL('../src/components/mvp-builder/MVPMessageItem.tsx', import.meta.url),
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

test('MVP Builder tries the lighter Gemini backup before leaving Google', () => {
  assert.match(edgeFunctionSource, /const GEMINI_FALLBACK_MODEL = "gemini-3\.1-flash-lite"/);
  assert.match(
    edgeFunctionSource,
    /const candidates = isGeminiModel\(primaryModel\)[\s\S]*\? \[primaryModel, \.\.\.geminiBackups, DEEPSEEK_FALLBACK_MODEL/
  );
  assert.match(
    edgeFunctionSource,
    /if \(isGeminiModel\(model\)\) \{[\s\S]*body\.reasoning_effort = "low";[\s\S]*\}/
  );
  assert.match(edgeFunctionSource, /providerErrors: ModelAttemptFailure\[\]/);
  assert.match(edgeFunctionSource, /All MVP Builder model attempts failed/);
});

test('MVP Builder repair validates each repair candidate before accepting it', () => {
  assert.match(
    edgeFunctionSource,
    /function getRepairCandidates[\s\S]*DEEPSEEK_FALLBACK_MODEL[\s\S]*selectedModel/
  );
  assert.match(edgeFunctionSource, /async function repairModelOutputWithFallback/);
  assert.match(
    edgeFunctionSource,
    /for \(const candidate of modelCandidates\)[\s\S]*const repaired = await requestModelJson[\s\S]*const validated = validateOutput\(parseAndNormalizeModelOutput\(repaired, currentProject, actionType\)\)[\s\S]*return validated/
  );
  assert.doesNotMatch(edgeFunctionSource, /const repaired = await requestModelJsonWithFallback/);
});

test('MVP Builder applies simple text edits before using a model', () => {
  assert.match(edgeFunctionSource, /function applySimpleTextEditToCurrentProject/);
  assert.match(edgeFunctionSource, /function getSimpleTextEditKind/);
  assert.ok(edgeFunctionSource.includes('"hero_title"'));
  assert.ok(edgeFunctionSource.includes('"subheadline"'));
  assert.ok(edgeFunctionSource.includes('"button_text"'));
  assert.match(edgeFunctionSource, /replace\(DASH_TEXT_PATTERN, " "\)/);
  assert.match(edgeFunctionSource, /copy-pasting|DASH_TEXT_PATTERN/);
  assert.match(edgeFunctionSource, /function selectDeterministicEditTarget/);
  assert.ok(edgeFunctionSource.includes('file.path === "index.html"'));
  assert.ok(edgeFunctionSource.includes('file.path === "src/App.tsx"'));
  assert.match(edgeFunctionSource, /if \(deterministicEdit\)[\s\S]*deterministic_edit_accepted/);
  assert.match(edgeFunctionSource, /NO_MATERIAL_CHANGE/);
});

test('MVP Builder parser recovery accepts wrapped JSON, bare HTML, patches, and changed-file merges', () => {
  assert.ok(edgeFunctionSource.includes('<project-output>'));
  assert.match(edgeFunctionSource, /function extractBalancedJsonObject/);
  assert.match(edgeFunctionSource, /function extractHtmlDocument/);
  assert.match(edgeFunctionSource, /project_type: "html_single"/);
  assert.match(edgeFunctionSource, /function normalizeReplaceFilePatch[\s\S]*operation !== "replace_file"/);
  assert.match(edgeFunctionSource, /const rawPath = typeof item\.path === "string" \? item\.path : item\.filename/);
  assert.match(edgeFunctionSource, /return mergeOutputWithCurrentProject\(candidate, currentProject, actionType\)/);
});

test('MVP Builder emits conversational statuses and human error messages', () => {
  assert.match(edgeFunctionSource, /type: "status"/);
  assert.match(edgeFunctionSource, /reserved: "Credits are held while I work\."/);
  assert.match(edgeFunctionSource, /deterministic_edit: "This is a simple text change\. I can apply it directly\."/);
  assert.match(edgeFunctionSource, /model_repair: "The output needs repair\. I am fixing it before applying\."/);
  assert.match(hookSource, /statusText\?: string/);
  assert.match(hookSource, /event\.type === 'status'/);
  assert.match(hookSource, /MVP_BUILDER_HUMAN_ERROR_MESSAGES/);
  assert.match(hookSource, /VALIDATION_FAILED: 'I understood the request, but the code output was malformed\./);
  assert.match(messageItemSource, /const statusText = message\.statusText\?\.trim\(\)/);
});

test('MVP Builder reliability telemetry does not include file contents', () => {
  assert.match(edgeFunctionSource, /mvp_builder_local_repair_used/);
  assert.match(edgeFunctionSource, /mvp_builder_model_repair_used/);
  assert.match(edgeFunctionSource, /mvp_builder_deterministic_edit_used/);
  assert.match(edgeFunctionSource, /mvp_builder_validation_failed_after_all_repair/);
  assert.match(edgeFunctionSource, /function logMVPBuilderFailedAttempt/);
  assert.doesNotMatch(edgeFunctionSource, /emitMVPBuilderTelemetry\([\s\S]{0,400}content/);
});
