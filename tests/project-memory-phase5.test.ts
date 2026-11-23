import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

import { ANSWER_OPTIONS, onboardingAnswersProblem } from '../src/lib/onboardingAnswerRules.ts';

// Project memory plan, phase 5 (2026-11-23): the memory systems the project
// ledger replaced are retired (data archived, not dropped), and "what exists
// today" is checked on the server like every other onboarding choice. The SQL
// was also run end to end in an in-memory Postgres (12 scenarios).

const root = new URL('../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const migration = read('supabase/migrations/20261123220000_retire_legacy_memory.sql');

test('the old memory tables are archived with their data, not dropped', () => {
  assert.match(migration, /ALTER TABLE public\.%I SET SCHEMA archive/);
  assert.match(migration, /ARRAY\['conversation_memory', 'project_memory'\]/);
  assert.match(migration, /REVOKE ALL ON SCHEMA archive FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(migration, /DROP TABLE/i);
});

test('the nightly job that failed every night is removed with memory-manager', () => {
  assert.match(migration, /cron\.unschedule\(jobid\) FROM cron\.job WHERE jobname = 'nightly-memory-summarization'/);
  assert.match(migration, /DROP FUNCTION IF EXISTS public\.trigger_memory_summarization\(\)/);
  assert.equal(existsSync(new URL('supabase/functions/memory-manager/index.ts', root)), false);
  assert.doesNotMatch(read('supabase/config.toml'), /functions\.memory-manager/);
});

test('nothing in the app or the AI engine reads the retired memory', () => {
  for (const path of ['src/hooks/useConversationMemory.ts', 'src/hooks/useChatbot-memory-helpers.ts',
    'src/components/ai-cofounder/MemoryTimeline.tsx', 'src/components/ai-cofounder/MemoryCard.tsx']) {
    assert.equal(existsSync(new URL(path, root)), false, path);
  }
  assert.doesNotMatch(read('src/hooks/useChatbot.ts'), /useConversationMemory|createMemory/);
  assert.doesNotMatch(read('supabase/functions/chatbot-ai-engine/index.ts'), /from\('conversation_memory'\)/);
  assert.doesNotMatch(read('src/lib/personaHome.ts'), /personaGuidanceContext/);
});

test('"what exists today" is checked in the database with the app\'s own list', () => {
  const rule = migration.match(/\('productState', ARRAY\[([^\]]+)\]\)/);
  assert.ok(rule, 'productState is in onboarding_answers_problem');
  const server = rule![1].split(',').map((value) => value.trim().replace(/'/g, ''));
  assert.deepEqual(server, [...ANSWER_OPTIONS.productState], 'database and app agree on the options');
  assert.equal(onboardingAnswersProblem({ productState: 'unicorn' }), 'Invalid value for productState');
  assert.equal(onboardingAnswersProblem({ productState: 'mvp_beta' }), null);
});
