import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('pmf lab opens with an evidence hub before the scoring form', () => {
  const page = read('src/pages/PMFLabPage.tsx');

  assert.match(page, /PMFEvidenceHub/);
  assert.match(
    page,
    /<PMFEvidenceHub[\s\S]*<PMFEvidenceChecklist[\s\S]*<PMFSeanEllisTest[\s\S]*<PMFEvidenceForm/,
  );
  assert.match(page, /Evidence-first PMF preview/);
  assert.doesNotMatch(page, /<PMFEvidenceForm[\s\S]*onSubmit=\{\(\) => \{\}\}/);
});

test('pmf funnel analytics events are wired on client actions', () => {
  const page = read('src/pages/PMFLabPage.tsx');
  const labHook = read('src/hooks/usePMFLab.ts');
  const surveyHook = read('src/hooks/usePMFSurvey.ts');
  const surveyResponseEdge = read('supabase/functions/pmf-survey-respond/index.ts');
  const discoveryEdge = read('supabase/functions/pmf-customer-discovery/index.ts');

  for (const event of [
    'pmf_lab_viewed',
    'pmf_evidence_hub_viewed',
  ]) {
    assert.match(page, new RegExp(event));
  }

  for (const event of [
    'pmf_analysis_started',
    'pmf_analysis_completed',
    'pmf_checklist_saved',
    'pmf_report_saved',
    'pmf_rescore_clicked',
  ]) {
    assert.match(labHook, new RegExp(event));
  }

  assert.match(surveyHook, /pmf_survey_created/);
  assert.match(surveyResponseEdge, /pmf_survey_response_received/);
  assert.match(discoveryEdge, /pmf_customer_discovery_started/);
  assert.match(discoveryEdge, /pmf_customer_discovery_completed/);
  assert.match(discoveryEdge, /pmf_customer_discovery_failed/);
  assert.match(discoveryEdge, /pmf_customer_discovery_degraded/);
  assert.match(discoveryEdge, /pmf_customer_discovery_health_checked/);
});

test('pmf evidence persistence is updated by scoring and survey responses', () => {
  const scorer = read('supabase/functions/pmf-evidence-scorer/index.ts');
  const surveyRespond = read('supabase/functions/pmf-survey-respond/index.ts');
  const surveyHook = read('src/hooks/usePMFSurvey.ts');

  assert.match(scorer, /from\('pmf_validation_evidence' as any\)/);
  assert.match(scorer, /interview_notes_count:\s*loggedInterviewCount/);
  assert.match(surveyRespond, /PMF_REQUIRED_SIGNALS\s*=\s*25/);
  assert.match(surveyRespond, /from\("pmf_validation_evidence"\)/);
  assert.match(surveyRespond, /survey_results_count:\s*total/);
  assert.match(surveyHook, /from\(EVIDENCE\)/);
});

test('pmf required signal migration normalizes old rows to 25', () => {
  const migration = read('supabase/migrations/20260630100000_normalize_pmf_required_signals.sql');

  assert.match(migration, /ALTER COLUMN required_signals SET DEFAULT 25/);
  assert.match(migration, /WHERE required_signals < 25/);
});
