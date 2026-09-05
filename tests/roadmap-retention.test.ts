import test from 'node:test';
import assert from 'node:assert/strict';
import { COPY, DAY, SEGMENTS, assignVariants, buildRoadmapEmail, canonicalTool, copyText, resolveRetention, type RetentionContext, type Segment } from '../supabase/functions/_shared/roadmap-retention.ts';
import { latestTimestamp, loadRoadmapContext } from '../supabase/functions/_shared/roadmap-retention-context.ts';
import { buildAuthenticatedReturnUrl, isInactiveSequence } from '../supabase/functions/_shared/inactive-retention-email.ts';

const now = Date.parse('2026-09-04T12:00:00Z');
const ago = (days: number) => new Date(now - days * DAY).toISOString();
const base = (): RetentionContext => ({
  userId: 'founder', quizCompleted: true, quizGoal: 'validate_problem', industry: 'Food & retail',
  lastActivityAt: ago(2), lastLoginAt: ago(4), historyComplete: true, tools: [],
  evidence: { outcomes: [], firstCustomerSprintCompletedAt: null, fundraisingReadinessCompletedAt: null, pitchDeckCompletedAt: null, savedInvestorCount: 0 },
});
function fixture(segment: Segment): RetentionContext {
  const context = base();
  if (segment === 'unfinished_tool' || segment === 'dormant') context.tools = [{ tool: 'mvp_builder', status: 'progress', occurredAt: ago(3), step: 'scope review' }];
  if (segment === 'completed_stage') context.evidence.outcomes = [{ tool: 'icp_builder', status: 'ready', completed_at: ago(4) }];
  if (segment === 'dormant') { context.lastActivityAt = ago(30); context.tools[0].occurredAt = ago(30); }
  return context;
}

test('all segments resolve with verified signal and a specific destination', () => {
  for (const segment of SEGMENTS) {
    const decision = resolveRetention(fixture(segment), now)!;
    assert.equal(decision.segment, segment);
    assert.notEqual(decision.path, '/dashboard');
    assert.ok(decision.signal.length > 12);
  }
});
test('48 hour eligibility, recent activity, missing time and 30 day precedence', () => {
  assert.equal(resolveRetention({ ...base(), lastActivityAt: ago(2 - 1 / DAY) }, now), null);
  assert.equal(resolveRetention(base(), now)?.segment, 'quiz_only');
  assert.equal(resolveRetention({ ...base(), lastActivityAt: null }, now), null);
  assert.equal(resolveRetention({ ...fixture('unfinished_tool'), lastActivityAt: ago(30) }, now)?.segment, 'dormant');
  assert.equal(resolveRetention({ ...fixture('unfinished_tool'), lastActivityAt: ago(30 - 1 / DAY) }, now)?.segment, 'unfinished_tool');
  assert.equal(resolveRetention({ ...base(), lastActivityAt: ago(-1) }, now), null);
});
test('unknown history does not imply no tool visits; no quiz data means no generic fallback', () => {
  assert.equal(resolveRetention({ ...base(), historyComplete: false }, now), null);
  assert.equal(resolveRetention({ ...base(), quizGoal: null, industry: null, ideaStage: null }, now), null);
  assert.equal(resolveRetention({ ...base(), unavailableTools: ['icp_builder'] }, now), null);
});
test('unfinished work wins over stage handoff; starting next stage prevents a stage email', () => {
  const context = fixture('completed_stage');
  context.tools.push({ tool: 'demo_studio', status: 'opened', occurredAt: ago(3) });
  assert.equal(resolveRetention(context, now)?.segment, 'unfinished_tool');
  context.tools[0].status = 'completed';
  assert.equal(resolveRetention(context, now), null);
});
test('latest event for a project wins; completed artifacts and reopened completed tools are not abandonment', () => {
  const context = base();
  context.tools = [
    { tool: 'icp_builder', projectId: 'one', status: 'opened', occurredAt: ago(4) },
    { tool: 'icp_builder', projectId: 'one', status: 'completed', occurredAt: ago(3) },
  ];
  assert.equal(resolveRetention(context, now), null);
  context.evidence.outcomes = [{ tool: 'icp_builder', status: 'ready', completed_at: ago(4) }];
  context.tools = [{ tool: 'icp_builder', projectId: 'one', status: 'opened', occurredAt: ago(3) }];
  assert.equal(resolveRetention(context, now)?.segment, 'completed_stage');
});
test('draft output does not complete a stage, and completed stage VI never invents stage VIII', () => {
  const context = base();
  context.evidence.outcomes = [{ tool: 'icp_builder', status: 'draft', updated_at: ago(3) }];
  assert.equal(resolveRetention(context, now), null);
  context.evidence.outcomes = ['icp_builder', 'demo_studio', 'pmf_lab', 'mvp_builder', 'gtm_strategist', 'traction_engine'].map(tool => ({ tool, status: 'verified', completed_at: ago(3), artifact_type: tool === 'gtm_strategist' ? 'first_customer_proof' : undefined, quality_checks: { buyerProofEarned: true } }));
  assert.equal(resolveRetention(context, now), null);
  context.tools = [{ tool: 'insighta_test', status: 'opened', occurredAt: ago(3) }];
  assert.equal(resolveRetention(context, now)?.tool, 'insighta_test');
});
test('saved destinations require verification and safe canonical routes; historical names resolve', () => {
  const context = fixture('unfinished_tool');
  context.tools = [{ tool: 'ICP Draft', projectId: 'one', status: 'progress', occurredAt: ago(3), path: '/icp/draft/one', savedDestinationVerified: true }];
  assert.equal(resolveRetention(context, now)?.path, '/icp/draft/one');
  context.tools[0].savedDestinationVerified = false;
  assert.equal(resolveRetention(context, now)?.path, '/icp-builder');
  for (const path of ['//evil.example/x', 'https://evil.example', '/dashboard', '/mvp-builder', '/\\evil.example']) {
    context.tools[0].path = path; context.tools[0].savedDestinationVerified = true;
    assert.equal(resolveRetention(context, now)?.path, '/icp-builder');
  }
  assert.equal(canonicalTool('Score Viability')?.route, '/icp-builder');
});
test('all 48 subject and body combinations are specific, concise, escaped and dash free', () => {
  for (const segment of SEGMENTS) {
    const decision = resolveRetention(fixture(segment), now)!;
    decision.signal = copyText('Your food-tech goal — <script>alert("x")</script> & next step.');
    assert.equal(COPY[segment].subjects.length, 4);
    assert.equal(COPY[segment].bodies.length, 3);
    for (let subject = 0; subject < 4; subject++) for (let body = 0; body < 3; body++) {
      const email = buildRoadmapEmail(decision, { subject, body }, { ctaUrl: 'https://example.com/next-step?a=1&b=2', preferencesUrl: '/preferences', unsubscribeUrl: '/unsubscribe' });
      for (const text of [email.subject, email.text, email.preheader, email.ctaLabel]) assert.doesNotMatch(text, /[\p{Dash_Punctuation}\u2212\u00ad]/u);
      assert.ok(email.text.includes(decision.signal));
      assert.ok(email.text.split(/\s+/).length >= 35 && email.text.split(/\s+/).length <= 80);
      assert.equal((email.html.match(/<a /g) ?? []).length, 3);
      assert.doesNotMatch(email.html, /<script>/);
      assert.match(email.html, /&lt;script&gt;/);
      assert.doesNotMatch(email.text, /congrat|come back|Hi |Hello |under a minute/i);
    }
  }
});
test('experiment assignment is stable, separate from touches, and changes only the tested dimension', () => {
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < 4000; i++) {
    const config = { phase: 'subject' as const, selectedSubject: 2, version: 1 };
    const variants = assignVariants(String(i), 'quiz_only', config);
    assert.deepEqual(assignVariants(String(i), 'quiz_only', config), variants);
    counts[variants.subject]++; assert.equal(variants.body, 0);
    const body = assignVariants(String(i), 'quiz_only', { ...config, phase: 'body' });
    assert.equal(body.subject, 2); assert.ok(body.body >= 0 && body.body < 3);
  }
  counts.forEach(count => assert.ok(count > 900 && count < 1100));
  assert.throws(() => assignVariants('u', 'dormant', { phase: 'body', selectedSubject: 5, version: 1 }));
});
test('login days remain distinct from inactivity and login link preserves verified project', () => {
  const decision = resolveRetention(base(), now)!;
  assert.equal(decision.daysInactive, 2); assert.equal(decision.daysSinceLogin, 4);
  assert.equal(resolveRetention({ ...base(), lastLoginAt: null }, now)?.daysSinceLogin, null);
  const url = new URL(buildAuthenticatedReturnUrl({ appUrl: 'https://creatives-takeover.com', targetPath: '/icp/draft/one?mode=edit', logId: 'id', templateKey: 'test' }));
  assert.ok(url.searchParams.get('return')?.startsWith('/icp/draft/one?mode=edit&'));
  for (const sequence of ['activation_nudge', 'progress_nudge', 'activation_day2', 'routine_reminder', 'weekly_digest', 'reengagement_60d']) assert.equal(isInactiveSequence(sequence), true);
});
test('latest activity uses the most recent real timestamp, not profile modification time', () => {
  assert.equal(latestTimestamp([ago(8), 'bad', ago(2), null]), ago(2));
  assert.equal(latestTimestamp([null, 'bad']), null);
});
test('context loader fails closed on source errors', async () => {
  const builder: any = new Proxy({}, { get: (_target, key) => key === 'then' ? (resolve: any) => resolve({ error: { message: 'offline' } }) : () => builder });
  await assert.rejects(loadRoadmapContext({ from: () => builder }, 'user', ago(4), { tracking_started_at: ago(10), unavailable_tools: [] }), /context unavailable/);
});

test('context loader verifies saved project ownership and skips deleted project work', async () => {
  const rows: Record<string, unknown> = {
    profiles: { created_at: ago(10), quiz_completed: true, current_focus: 'validate_problem', last_activity_at: ago(3), subscription_tier: 'pro' },
    retention_user_activity: { last_activity_at: ago(3) },
    retention_tool_activity: [{ tool: 'icp_builder', project_id: 'one', status: 'progress', step: 'customer definition', path: '/icp/draft/one', occurred_at: ago(3) }],
    journey_outcomes: [], onboarding_sessions: { answers: { primaryGoal: 'validate_problem' } },
    icp_analysis_results: { id: 'one' },
  };
  const filters: unknown[][] = [];
  const db = { from: (table: string) => {
    const builder: any = new Proxy({}, { get: (_target, key) => key === 'then'
      ? (resolve: any) => resolve({ data: rows[table] ?? null, error: null })
      : (...args: unknown[]) => { if (key === 'eq') filters.push([table, ...args]); return builder; } });
    return builder;
  } };
  const settings = { tracking_started_at: ago(20), unavailable_tools: [] };
  const context = await loadRoadmapContext(db, 'user', ago(4), settings);
  assert.equal(resolveRetention(context, now)?.path, '/icp/draft/one');
  assert.ok(filters.some(filter => filter.join(':') === 'icp_analysis_results:user_id:user'));
  assert.equal(context.marketplaceVisitedAt, null);
  assert.equal(context.expertSupportVisitedAt, null);
  rows.icp_analysis_results = null;
  assert.equal(resolveRetention(await loadRoadmapContext(db, 'user', ago(4), settings), now), null);
});
