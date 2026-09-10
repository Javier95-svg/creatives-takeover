import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  COMMUNITY_TOPICS,
  getCommunityTopic,
  getCommunityTopicLabel,
  isCommunityTopic,
  normalizeTopic,
  resolveTopicFromTags,
} from '../src/lib/communityTopics.ts';

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');

test('the taxonomy stays small enough that every topic can stay populated', () => {
  assert.equal(COMMUNITY_TOPICS.length, 5);
});

test('every topic carries the copy the composer and filter bar render', () => {
  for (const topic of COMMUNITY_TOPICS) {
    assert.ok(topic.label.length > 0, `${topic.id} needs a label`);
    assert.ok(topic.description.length > 0, `${topic.id} needs a description`);
    assert.ok(topic.prompt.length > 0, `${topic.id} needs a composer prompt`);
  }
});

test('topic ids are tag-safe, so they survive a round trip through community_posts.tags', () => {
  for (const topic of COMMUNITY_TOPICS) {
    assert.match(topic.id, /^[a-z][a-z0-9-]*$/, `${topic.id} is not a safe tag slug`);
  }
});

test('ids are unique', () => {
  const ids = COMMUNITY_TOPICS.map((topic) => topic.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('normalizeTopic accepts known ids and rejects everything else', () => {
  assert.equal(normalizeTopic('finding-customers'), 'finding-customers');
  assert.equal(normalizeTopic('  Finding-Customers  '), 'finding-customers');
  assert.equal(normalizeTopic('illustration'), null, 'the retired creative-arts tags must not resolve');
  assert.equal(normalizeTopic(''), null);
  assert.equal(normalizeTopic(null), null);
  assert.equal(normalizeTopic(undefined), null);
  assert.equal(normalizeTopic(42), null);
});

test('isCommunityTopic narrows only for known ids', () => {
  assert.equal(isCommunityTopic('founder-mindset'), true);
  assert.equal(isCommunityTopic('startup'), false);
  assert.equal(isCommunityTopic(null), false);
});

test('resolveTopicFromTags finds the topic among legacy free-form tags', () => {
  assert.equal(resolveTopicFromTags(['milestone', 'progress', 'validation-pmf']), 'validation-pmf');
  assert.equal(resolveTopicFromTags(['milestone', 'progress']), null, 'legacy-only posts have no topic');
  assert.equal(resolveTopicFromTags([]), null);
  assert.equal(resolveTopicFromTags(null), null);
  assert.equal(resolveTopicFromTags(undefined), null);
});

test('labels render for known topics and fall back to the raw tag for legacy ones', () => {
  assert.equal(getCommunityTopicLabel('pricing-positioning'), 'Pricing & positioning');
  assert.equal(getCommunityTopicLabel('illustration'), 'illustration', 'legacy tags still render');
  assert.equal(getCommunityTopicLabel('   '), null);
  assert.equal(getCommunityTopicLabel(null), null);
});

test('getCommunityTopic returns the full definition or null', () => {
  assert.equal(getCommunityTopic('building-shipping')?.label, 'Building & shipping');
  assert.equal(getCommunityTopic('nope'), null);
});

// The feed ships a topic browser, but the composer used to insert `tags: []` on
// every post, so the browser filtered over a permanently empty dimension. These
// two files import the Supabase browser client and can't be loaded in bare
// Node, so assert the wiring from source.
test('the composer writes the selected topic into community_posts.tags', () => {
  const feed = read('../src/components/community/CommunityFeed.tsx');
  assert.doesNotMatch(
    feed,
    /tags:\s*\[\]/,
    'CommunityFeed must not insert an empty tag array — that is the bug that emptied the topic browser',
  );
  assert.match(feed, /tags:\s*\[payload\.topic\]/);
});

test('topic is a required field on the composer payload', () => {
  const composer = read('../src/components/community/PostComposer.tsx');
  assert.match(composer, /topic:\s*CommunityTopicId;/, 'topic must not be optional');
  assert.match(composer, /if \(!topic\)/, 'publishing without a topic must be blocked');
});

test('the filter bar no longer offers the retired creative-arts taxonomy', () => {
  const feed = read('../src/components/community/CommunityFeed.tsx');
  for (const retired of ['songwriting', 'color-grading', 'streetwear']) {
    assert.ok(!feed.includes(retired), `${retired} should have been removed with the creative-arts tag list`);
  }
});

// The answer SLA is the thing that makes the topic model viable at this scale,
// so the trigger that routes threads to a human has to hold three properties.
const answerSlaMigration = read(
  '../supabase/migrations/20260904120000_community_thread_answer_sla.sql',
);

test('the answer-SLA trigger pins its search_path', () => {
  // It writes notifications to other users' rows, so it must be SECURITY
  // DEFINER — which makes an unpinned search_path the real risk.
  assert.match(answerSlaMigration, /SECURITY DEFINER/);
  assert.match(answerSlaMigration, /SET search_path TO 'public'/);
});

test('a failed notification cannot cost a founder their post', () => {
  assert.match(answerSlaMigration, /EXCEPTION\s+--[\s\S]*?WHEN OTHERS THEN/);
  assert.match(answerSlaMigration, /RETURN NEW;\s*END;/);
});

test('authors are not notified about their own thread', () => {
  assert.match(answerSlaMigration, /ur\.user_id IS DISTINCT FROM NEW\.user_id/);
});

test('the trigger fires on insert into community_posts', () => {
  assert.match(answerSlaMigration, /AFTER INSERT ON public\.community_posts/);
  assert.match(answerSlaMigration, /DROP TRIGGER IF EXISTS/, 'migration must be re-runnable');
});