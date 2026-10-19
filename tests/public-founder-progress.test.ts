import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPublicStages, hasPublicEvidence, normalizePublicProgress, type PublicOutcomeRow } from '../src/lib/publicProgress.ts';
import { currentFocusLabel } from '../src/lib/currentFocus.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const outcome = (overrides: Partial<PublicOutcomeRow>): PublicOutcomeRow => ({
  tool: 'icp_builder',
  artifact_type: null,
  status: 'ready',
  completed_at: '2026-08-01T10:00:00Z',
  verified_at: null,
  reviewed_at: null,
  updated_at: '2026-08-01T10:00:00Z',
  verification_mode: 'unverified',
  buyer_proof_earned: false,
  ...overrides,
});

const progress = (outcomes: PublicOutcomeRow[]) => normalizePublicProgress({
  visible: true,
  outcomes,
  evidence: { interviews: { total: 0, verified: 0 }, commitments: { total: 0, verified: 0 }, payments: { total: 0, verified: 0 } },
})!;

test('public stages complete by the dashboard rules and name who checked them', () => {
  const stages = buildPublicStages(progress([
    outcome({ tool: 'icp_builder' }),
    outcome({ tool: 'pmf_lab', verification_mode: 'platform_verified', completed_at: '2026-10-14T09:00:00Z', updated_at: '2026-10-14T09:00:00Z' }),
    outcome({ tool: 'demo_studio', status: 'reviewed', reviewed_at: '2026-09-01T09:00:00Z' }),
  ]));
  assert.deepEqual(stages.map((row) => row.status), ['done', 'done', 'done', 'current', 'upcoming', 'upcoming', 'optional']);
  assert.deepEqual(stages.slice(0, 3).map((row) => row.check), ['founder', 'reviewed', 'verified']);
  assert.equal(stages[1].completedAt, '2026-09-01T09:00:00Z', 'a reviewed outcome is dated by its review');
  assert.equal(stages[6].label, 'Fundraise');
});

test('Launch needs buyer proof and Traction needs a checked outcome, as on the dashboard', () => {
  const withoutProof = buildPublicStages(progress([
    outcome({ tool: 'gtm_strategist', artifact_type: 'first_customer_proof', buyer_proof_earned: false }),
    outcome({ tool: 'traction_engine', status: 'ready' }),
  ]));
  assert.equal(withoutProof[4].status, 'upcoming');
  assert.equal(withoutProof[5].status, 'upcoming');

  const withProof = buildPublicStages(progress([
    outcome({ tool: 'gtm_strategist', artifact_type: 'first_customer_proof', buyer_proof_earned: true }),
    outcome({ tool: 'traction_engine', status: 'verified', verified_at: '2026-10-01T00:00:00Z' }),
  ]));
  assert.equal(withProof[4].status, 'done');
  assert.equal(withProof[5].status, 'done');
  assert.equal(withProof[0].status, 'current', 'the first missing stage is the current one');
});

test('the RPC payload is validated before it reaches the page', () => {
  assert.equal(normalizePublicProgress(null), null);
  assert.equal(normalizePublicProgress([]), null);
  const parsed = normalizePublicProgress({
    visible: 'yes',
    outcomes: [{ tool: 'icp_builder' }, { status: 'ready' }, 'junk', outcome({})],
    evidence: { interviews: { total: 14, verified: 99 }, payments: { total: -3, verified: 2 } },
  })!;
  assert.equal(parsed.visible, false, 'only a literal true makes progress public');
  assert.equal(parsed.outcomes.length, 1);
  assert.deepEqual(parsed.evidence.interviews, { total: 14, verified: 14 }, 'verified never exceeds the total');
  assert.deepEqual(parsed.evidence.payments, { total: 0, verified: 0 });
  assert.equal(hasPublicEvidence(parsed), true);
  assert.equal(hasPublicEvidence(progress([])), false);
});

test('onboarding goal codes read as sentences on the profile', () => {
  assert.equal(currentFocusLabel('reach_three_customers'), 'Reaching three paying customers');
  assert.equal(currentFocusLabel('  validate_problem '), 'Validating the customer problem');
  assert.equal(currentFocusLabel('Interviewing 10 agency owners'), 'Interviewing 10 agency owners');
  assert.equal(currentFocusLabel('   '), null);
  assert.equal(currentFocusLabel(null), null);
});

test('progress is public only by opt-in and never exposes the work itself', () => {
  const sql = read('../supabase/migrations/20261020100000_public_founder_progress.sql');
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /SET search_path = public/);
  assert.match(sql, /user_preferences->>'public_progress_visible'/);
  assert.match(sql, /NOT v_visible AND v_profile_id IS DISTINCT FROM auth\.uid\(\)/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.public_founder_progress_v1\(text\) FROM PUBLIC/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.public_founder_progress_v1\(text\) TO anon, authenticated/);
  assert.match(sql, /o\.status IN \('ready', 'verified', 'reviewed'\)/, 'drafts never count');
  const output = sql.slice(sql.indexOf('RETURN jsonb_build_object'));
  for (const secret of ['artifact_id', 'evidence_manifest', 'e.amount', 'interviewee_name', 'main_feedback', 'o.quality_checks,']) {
    assert.ok(!output.includes(secret), `${secret} must stay private`);
  }
});

test('the public view gates the stage and carries the founder story', () => {
  const sql = read('../supabase/migrations/20261020090000_public_profile_story_fields.sql');
  assert.match(sql, /WHEN column_name = 'assigned_stage'\s*THEN 'CASE WHEN COALESCE\(p\.user_preferences->>''public_stage_visible'', ''false''\) = ''true'' THEN p\.assigned_stage END AS assigned_stage'/);
  assert.match(sql, /p\.founder_role, p\.startup_description, p\.current_focus, p\.startup_links FROM public\.profiles p/);
  assert.match(sql, /public\.profile_is_search_indexable\(p\) AS seo_indexable/);
  assert.match(sql, /ORDER BY ordinal_position/);
  assert.match(sql, /GRANT SELECT ON TABLE public\.public_profiles TO anon, authenticated/);
});

test('a visitor sees a stage only once the gated projection is live', () => {
  const profile = read('../src/pages/Profile.tsx');
  assert.match(profile, /STORY_PUBLIC_PROFILE_SELECT/);
  assert.match(profile, /assigned_stage: stageIsGated \? profile\.assigned_stage \?\? null : null/);
  assert.match(profile, /isOwnProfile \|\| profile\.assigned_stage !== null/);
  const card = read('../api/og-profile.tsx');
  assert.match(card, /stageIsGated && typeof row\.assigned_stage === 'number'/);
});

test('a profile link never opens somebody else', () => {
  const profile = read('../src/pages/Profile.tsx');
  assert.doesNotMatch(profile, /queryPublicProfile\(\s*'full_name'/);
  assert.doesNotMatch(profile, /baseUsername/);
  assert.match(profile, /ilike\('username', escapeLikePattern\(value\)\)/);
  assert.match(profile, /https\?:\\\/\\\//, 'visitor links are limited to http and https');
});

test('shared profiles preview as their own card', () => {
  const vercel = read('../vercel.json');
  assert.match(vercel, /"\/og\/profile\/:username", "destination": "\/api\/og-profile\?username=:username"/);
  assert.match(read('../api/public-entity.ts'), /\/og\/profile\/\$\{encodeURIComponent\(profile\.username\)\}/);
  assert.match(read('../src/pages/Profile.tsx'), /og\/profile\/\$\{encodeURIComponent\(profile\.username\)\}/);
});

test('drafted updates never travel through the URL', () => {
  const drafts = read('../src/lib/profileUpdateDraft.ts');
  assert.match(drafts, /sessionStorage\.setItem\(journeyDraftKey\(userId\)/);
  assert.match(drafts, /\?compose=\$\{source\}/);
  assert.doesNotMatch(drafts, /compose=\$\{source\}&/);
  const checkin = read('../src/components/cohort/FounderCohortView.tsx');
  assert.match(checkin, /checkinUpdateDraft\(week, existing\.wins \?\? \[\], existing\.next_week_goals \?\? \[\], existing\.help_needed\)/);
  const share = checkin.slice(checkin.indexOf('const shareOnProfile'), checkin.indexOf('const onSubmit'));
  assert.doesNotMatch(share, /blockers/, 'blockers stay between the founder and the program');
});
