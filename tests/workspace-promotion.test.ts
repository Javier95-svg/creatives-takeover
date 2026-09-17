import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isWorkspaceRoute, workspaceEligible, workspaceReleaseEnabled, defaultWorkspaceDestination, platformUpdates, WORKSPACE_HOME_CONCEPT } from '../src/lib/workspacePolicy.ts';

test('production activation is independent of analytics and supports deployment rollback', () => {
  assert.equal(workspaceReleaseEnabled(undefined), true);
  assert.equal(workspaceReleaseEnabled('true'), true);
  assert.equal(workspaceReleaseEnabled('false'), false);
  assert.equal(workspaceEligible('account-a', false, workspaceReleaseEnabled(undefined), true), true);
  assert.equal(workspaceEligible(undefined, false, workspaceReleaseEnabled(undefined), true), false);
  const provider = readFileSync('src/contexts/WorkspaceRolloutContext.tsx', 'utf8');
  assert.doesNotMatch(provider, /onPosthogReady|reloadFeatureFlags|setTimeout/);
  assert.match(provider, /pending: loading/);
});

test('approved Guided Journey uses live home services behind authenticated eligibility', () => {
  assert.equal(WORKSPACE_HOME_CONCEPT, 'guided-journey');
  const frame = readFileSync('src/components/WorkspaceRouteFrame.tsx', 'utf8');
  assert.match(frame, /if \(!user \|\| !enabled \|\| !applicable\) return/);
  assert.match(frame, /WorkspaceOnboardingGate><PulseHomeLive concept=\{WORKSPACE_HOME_CONCEPT\}/);
  assert.doesNotMatch(frame, /ProductGuidePrototype/);
});

test('workspace requires resolved authentication, configuration and an explicit positive flag', () => {
  for (const user of [undefined, 'account-a']) for (const loading of [true, false]) for (const flag of [undefined, false, true]) for (const configured of [false, true]) {
    assert.equal(workspaceEligible(user, loading, flag, configured), Boolean(user) && !loading && flag === true && configured);
  }
  assert.equal(defaultWorkspaceDestination(false), '/dashboard');
  assert.equal(defaultWorkspaceDestination(true), '/');
});
test('application route catalog includes details and all dashboard destinations', () => {
  for (const path of ['/', '/dashboard', '/dashboard/tasks', '/dashboard/routine', '/dashboard/files', '/dashboard/referral', '/icp-builder', '/demo-studio/projects/123/demos/456/edit', '/mentorship/mentors/123', '/co-founder/create', '/messages/name', '/profile/name', '/account', '/pricing']) assert.ok(isWorkspaceRoute(path), path);
});
test('public, authentication, onboarding, administration and callback routes retain legacy layouts', () => {
  for (const path of ['/build', '/about', '/login', '/signup', '/auth/callback', '/app-entry', '/onboarding', '/setup-quiz', '/reset-password', '/subscription-success', '/p/slug', '/demo/123', '/embed/demo/123', '/w/slug', '/icp/123/public', '/pmf-survey/slug', '/newspaper/rss.xml', '/newspaper/admin', '/demo-studio/try', '/creatives-takeover', '/prototypes/founder-guide', '/dashboard-unrelated']) assert.equal(isWorkspaceRoute(path), false, path);
});
test('updates are real, supported, ordered, deduplicated, capped and internal', () => {
  const row = (id: string, route = '/newspaper/article', type = 'platform_update') => ({ id, notification_type: type, created_at: `2026-09-${id.padStart(2, '0')}T12:00:00Z`, metadata: { title: `Update ${id}`, message: 'Details', route } });
  const updates = platformUpdates([row('1'), row('3', '/marketplace/item'), row('2', '/mentorship/mentors/abc'), row('3', '/marketplace/item'), row('4', '//evil.example'), row('5', '/\\evil.example'), row('6', '/messages', 'message')]);
  assert.deepEqual(updates.map(x => [x.id, x.section]), [['3', 'Marketplace'], ['2', 'Mentorship'], ['1', 'Newspaper']]);
  assert.equal(platformUpdates([row('1'), row('2'), row('3'), row('4')]).length, 3);
  assert.deepEqual(platformUpdates([]), []);
  assert.equal(platformUpdates([{ ...row('7', '/newspaper/story', 'newspaper_article_published') }])[0].section, 'Newspaper');
  assert.equal(platformUpdates([{ ...row('8', '/mentorship', 'mentor_banner_created'), metadata: { route: '/mentorship', mentor_name: 'Test mentor' } }])[0].title, 'New mentor: Test mentor');
});
test('production entry cannot be enabled by preview storage or sample identities', () => {
  for (const file of ['src/main.tsx', 'src/components/WorkspaceRouteFrame.tsx', 'src/contexts/WorkspaceRolloutContext.tsx', 'src/components/workspace/WorkspaceLive.tsx', 'src/components/workspace/WorkspaceLayout.tsx', 'src/components/workspace/WorkspaceSidebar.tsx']) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /getWorkspacePreview|sessionStorage|javo95|\b680\b|\/profile\/javier/);
  }
});
test('additive isolation hardening prevents changing purpose, owner, session and message scope', () => {
  const sql = readFileSync('supabase/migrations/20260916120000_pulse_home_immutable_scope.sql', 'utf8');
  for (const field of ['purpose', 'user_id', 'session_id', 'id']) assert.ok(sql.includes(`OLD.${field} IS DISTINCT FROM NEW.${field}`));
  assert.match(sql, /BEFORE INSERT OR UPDATE OR DELETE ON public.chatbot_messages/);
  assert.match(sql, /auth.role\(\)/);
  assert.doesNotMatch(sql, /DROP TABLE|DELETE FROM|TRUNCATE/i);
});

test('Home validation precedes legacy fallback and does not log message previews', () => {
  const dispatcher = readFileSync('supabase/functions/chatbot-streaming/index.ts', 'utf8');
  assert.ok(dispatcher.indexOf("if (surface === 'pulse_home')") < dispatcher.indexOf('if (!message || !sessionId)'));
  const homeEntry = dispatcher.slice(dispatcher.indexOf('serve(async'), dispatcher.indexOf('if (!message || !sessionId)'));
  assert.doesNotMatch(homeEntry, /messagePreview:/);
  assert.match(readFileSync('src/components/pulse/PulseHomeView.tsx', 'utf8'), /data-telemetry-private/);
});
