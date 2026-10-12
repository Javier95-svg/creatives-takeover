import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { buildSequenceCopy, SEQUENCE_TYPES } from '../supabase/functions/_shared/retention-sequence-copy.ts';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const facts = { firstName: 'Maya', projectTitle: 'Invoice Nudge' } as Parameters<typeof buildSequenceCopy>[1];

test('the reply email says who replied to which post, and counts replies that waited', () => {
  assert.ok(SEQUENCE_TYPES.includes('rooms_reply'));
  const one = buildSequenceCopy('rooms_reply', facts, { replierName: 'Leo Martins', postTitle: 'Would you pay $29 a month?', replyCount: 1 });
  assert.equal(one.subject, 'Leo Martins replied to your post');
  assert.equal(one.opener, 'Leo Martins replied to "Would you pay $29 a month?" in Rooms.');
  assert.equal(one.defaultCtaLabel, 'Read the reply');

  const three = buildSequenceCopy('rooms_reply', facts, { replierName: 'Ana', postTitle: 'Pricing check', replyCount: 3 });
  assert.equal(three.subject, '3 new replies to your post');
  assert.match(three.opener, /has 3 new replies in Rooms, the latest from Ana\./);
  assert.equal(three.defaultCtaLabel, 'Read the replies');

  assert.equal(buildSequenceCopy('rooms_reply', facts, {}).subject, 'You have a reply in Rooms');
});

test('a reply from someone else queues one email per post per day, and opening the post cancels it', () => {
  const migration = source('supabase/migrations/20261018120000_rooms_reply_emails.sql');
  // Never about your own reply, a hidden reply or a hidden post.
  assert.match(migration, /v_post\.user_id = NEW\.user_id OR v_post\.hidden_at IS NOT NULL/);
  assert.match(migration, /IF NEW\.hidden_at IS NOT NULL THEN\s+RETURN NEW;/);
  assert.match(migration, /'rooms-reply:' \|\| v_post\.id::text \|\| ':' \|\| to_char\(now\(\) AT TIME ZONE 'UTC', 'YYYY-MM-DD'\)/);
  assert.match(migration, /now\(\) \+ interval '30 minutes'/);
  // The bell already rang through notify_post_comment.
  assert.match(migration, /'kind', 'rooms'\),\s+now\(\)\s+\)/);
  assert.match(migration, /AFTER INSERT ON public\.post_comments/);
  assert.match(migration, /WHERE cue\.email_delivered_at IS NULL/);
  assert.match(migration, /ARRAY\['dashboard', 'bizmap', 'insighta', 'network', 'resources', 'community'\]/);
  // Its own spacing and cap; unsubscribes and preferences still apply.
  assert.match(migration, /CASE WHEN v_reply THEN interval '12 hours' ELSE interval '48 hours' END/);
  assert.match(migration, /< CASE WHEN v_reply THEN 5 ELSE 3 END/);
  assert.match(migration, /u\.unsubscribed IS TRUE/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.complete_rooms_reply_cues_v1\(uuid\) TO authenticated;/);
  assert.match(migration, /WHERE user_id = auth\.uid\(\)/);

  const page = source('src/pages/launchpad/LaunchpadPostDetail.tsx');
  assert.match(page, /const repliesToRead = isOwn && Boolean\(data\?\.comment_count\);/);
  assert.match(page, /if \(repliesToRead && id\) void markRepliesRead\(id\);/);
});

test('the reply email reaches mentors, skips AI rewriting and is not held to the 6-day guard', () => {
  const sender = source('supabase/functions/send-retention-email/index.ts');
  assert.match(sender, /sequence === "rooms_reply" \? \{ data: null \} : await supabase\s+\.from\("mentors"\)/);
  assert.match(sender, /if \(args\.sequence === "rooms_reply" \|\| !shouldUseAi/);
  assert.match(sender, /sequence !== "task_plan_digest" && sequence !== "rooms_reply"\)/);
  assert.match(source('supabase/functions/_shared/retention-personalizer.ts'), /rooms_reply: "Someone replied to their post in Rooms/);

  const cues = source('supabase/functions/process-return-cues/index.ts');
  assert.match(cues, /const ROOMS_REPLY = 'rooms_reply_received';/);
  assert.match(cues, /sequence: 'rooms_reply',\s+replierName: names\.get\(cue\.cue_id\),\s+postTitle: reply\?\.title,\s+replyCount: reply\?\.replies,/);
});
