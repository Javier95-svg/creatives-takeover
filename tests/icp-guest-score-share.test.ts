import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const guestFunction = readFileSync(
  new URL('../supabase/functions/guest-activation-artifacts/index.ts', import.meta.url),
  'utf8',
);
const exportLib = readFileSync(new URL('../src/lib/icpDraftExport.ts', import.meta.url), 'utf8');
const folio = readFileSync(new URL('../src/components/icp/IcpFolioDocument.tsx', import.meta.url), 'utf8');
const publicScorePage = readFileSync(new URL('../src/pages/IcpPublicScorePage.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

/**
 * The guest share path has one property that matters more than the rest: the
 * edge function is the ONLY way to read a published card, because RLS on
 * guest_activation_artifacts is enabled with no policies. If read_score ever
 * returns the row instead of the card, the entire unlock gate is bypassed by
 * anyone who has a share link.
 */
test('read_score returns only the score card, never the artifact row', () => {
  const op = guestFunction.slice(guestFunction.indexOf('operation === "read_score"'));
  const body = op.slice(0, op.indexOf('if (operation === "create_demo")'));

  assert.match(body, /publicScoreCard/, 'must project the card out of the payload');
  assert.match(body, /scoreCard: card/, 'must return only the card');
  // Selecting the whole row, or returning deep_payload wholesale, would leak
  // the gated draft to anyone holding a share link.
  assert.doesNotMatch(body, /select\("\*"\)/, 'must not select the whole row');
  assert.doesNotMatch(body, /deep_payload:\s/, 'must not return deep_payload');
  assert.doesNotMatch(body, /resume_token_hash/, 'must never echo the token hash');
});

test('publishing a score is rate limited and validates what it will serve publicly', () => {
  const op = guestFunction.slice(guestFunction.indexOf('operation === "publish_score"'));
  const body = op.slice(0, op.indexOf('operation === "read_score"'));

  assert.match(body, /assert_rate_limit/, 'unauthenticated writes must be rate limited');
  assert.match(body, /guest_score_publish/);
  assert.match(body, /resumeToken\.length < 32/, 'the resume token is the authorization');
  assert.match(body, /typeof scoreCard\.displayScore !== "number"/, 'validate before serving publicly');
});

/**
 * prune_expired_guest_activation_artifacts DELETEs rows past expires_at every
 * night, and the guest TTL is 7 days. A share link that dies a week after it is
 * posted is worse than no share link, because the founder never finds out.
 */
test('publishing extends the artifact past the seven-day prune', () => {
  const op = guestFunction.slice(guestFunction.indexOf('operation === "publish_score"'));
  const body = op.slice(0, op.indexOf('operation === "read_score"'));
  assert.match(body, /expires_at: publishedExpiry/);
  assert.match(body, /365 \* 24 \* 60 \* 60 \* 1000/);
});

test('a repeat share reuses the existing slug so posted links keep working', () => {
  const op = guestFunction.slice(guestFunction.indexOf('operation === "publish_score"'));
  assert.match(op.slice(0, 4000), /existing\.share_slug \|\|/);
});

/**
 * The document is presented as two tabs, so one panel is always hidden at
 * capture time. Unmounting or leaving it hidden would produce a PDF containing
 * only whichever tab happened to be open, with no error.
 */
test('the PDF export reveals both tab panels and strips the tab nav', () => {
  assert.match(exportLib, /data-icp-tab-panel/);
  assert.match(exportLib, /classList\.remove\("hidden"\)/);
  assert.match(exportLib, /data-icp-tab-nav/);
});

test('both tab panels stay mounted rather than being conditionally rendered', () => {
  // A ternary that renders null for the inactive tab would defeat the export
  // fix above, so the panels must be present and merely class-hidden.
  assert.match(folio, /data-icp-tab-panel="score"/);
  assert.match(folio, /data-icp-tab-panel="draft"/);
  assert.match(folio, /activeTab === "score" \? "" : "hidden"/);
  assert.match(folio, /activeTab === "draft" \? "" : "hidden"/);
});

test('the unlock gate stays reachable when the score tab is open', () => {
  // The sticky mobile CTA is an anchor to #icp-unlock rendered outside the
  // folio, and an anchor into a hidden subtree scrolls nowhere.
  assert.match(folio, /hashchange/);
  assert.match(folio, /#icp-unlock/);
});

test('the public score page is routed and never touches a draft document', () => {
  assert.match(app, /path="\/idea\/:slug"/);

  /*
   * The strongest guarantee available here is structural: the page has no
   * IcpDraftDocument to render from at all. It reads a single IcpScoreCard,
   * whose contents are separately asserted to carry nothing gated. Grepping
   * for field names would only catch prose - "the experiment to run next"
   * appears in the page's own marketing copy.
   */
  assert.doesNotMatch(publicScorePage, /IcpDraftDocument/);
  assert.doesNotMatch(publicScorePage, /IcpFolioDocument/);
  assert.doesNotMatch(publicScorePage, /draftDocument/);
  assert.match(publicScorePage, /readGuestScoreCard/);
  assert.match(publicScorePage, /IcpScoreCard/);
});
