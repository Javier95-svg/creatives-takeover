import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { loadPulseMemory } from '../supabase/functions/_shared/pulse-context.ts';
import { PulseDatabase } from './helpers/pulseDatabase.ts';

// Project memory plan, phase 4 (2026-11-23): assumptions, journey outcomes,
// handoffs, evidence cases and weekly traction logs belong to a project. The
// SQL (assignment, backfill, per-project uniqueness, owner checks, the weekly
// save) was also run end to end in an in-memory Postgres (29 scenarios).

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('supabase/migrations/20261123180000_project_scoped_evidence.sql');

test('every account-wide evidence table gets a project, filled from its source', () => {
  for (const table of ['journey_assumptions', 'journey_outcomes', 'journey_handoffs', 'prebuild_validation_contexts', 'traction_engine_weekly_logs']) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public\\.projects\\(id\\)`), table);
  }
  assert.match(migration, /TG_TABLE_NAME = 'journey_assumptions'[\s\S]*?FROM public\.icp_analysis_results WHERE id = v_source::uuid AND user_id = NEW\.user_id/);
  assert.match(migration, /TG_TABLE_NAME = 'journey_handoffs'[\s\S]*?FROM public\.journey_outcomes WHERE id = NEW\.source_outcome_id AND user_id = NEW\.user_id/);
  assert.match(migration, /NEW\.project_id := COALESCE\(v_project, public\.ensure_active_project\(NEW\.user_id\)\)/);
  assert.match(migration, /WHERE id = NEW\.project_id AND user_id = NEW\.user_id\) THEN\s*RAISE EXCEPTION 'This project does not belong to this account'/,
    'a project the app names must be the founder\'s own');
});

test('the same assumption and the same week can exist once per startup', () => {
  assert.match(migration, /UNIQUE NULLS NOT DISTINCT \(user_id, project_id, fingerprint\)/);
  assert.match(migration, /UNIQUE NULLS NOT DISTINCT \(user_id, project_id, week_start_date\)/);
  assert.match(migration, /ON CONFLICT \(user_id, project_id, week_start_date\) DO UPDATE/);
  assert.match(read('supabase/functions/journey-outcome-service/index.ts'), /onConflict: 'user_id,project_id,fingerprint'/);
});

test('the backfill is not activity: updated_at triggers are paused, then restored', () => {
  for (const trigger of ['set_journey_outcomes_updated_at', 'set_journey_handoffs_updated_at', 'prebuild_validation_contexts_touch', 'update_traction_engine_weekly_logs_updated_at']) {
    assert.match(migration, new RegExp(`DISABLE TRIGGER ${trigger};`), trigger);
    assert.match(migration, new RegExp(`ENABLE TRIGGER ${trigger};`), trigger);
  }
});

test('a signal updates the assumption in its own startup', () => {
  const service = read('supabase/functions/journey-outcome-service/index.ts');
  assert.match(service, /if \(projectId\) assumptionQuery = assumptionQuery\.eq\('project_id', projectId\)/);
  assert.doesNotMatch(service, /eq\('fingerprint', assumptionFingerprint\)\.single\(\)/, 'one fingerprint can now match two startups');
  assert.match(read('src/pages/TractionEnginePage.tsx'), /projectId: projectIdRef\.current,/);
  assert.match(read('src/hooks/usePMFLab.ts'), /loadActiveProjectId\(user\.id\)\.then\(\(projectId\) => Promise\.all/);
});

test('the tools read only the open startup\'s weeks, cases and handoffs', () => {
  const traction = read('src/pages/TractionEnginePage.tsx');
  assert.match(traction, /logsQuery = logsQuery\.eq\('project_id', projectId\)/);
  assert.match(traction, /ledgerQuery = ledgerQuery\.eq\('project_id', projectIdRef\.current\)/);
  assert.match(read('src/components/gtm/GTMQuickLog.tsx'), /p_log: \{ \.\.\.payload\.logPayload, project_id: projectId \}/);
  assert.match(read('src/components/icp/IcpEvidenceCheck.tsx'), /tractionQuery = tractionQuery\.eq\('project_id', projectId\)/);
  assert.match(read('src/lib/prebuildContext.ts'), /if \(projectId\) query = query\.eq\('project_id', projectId\)/);
  assert.match(read('src/pages/PMFLabPage.tsx'), /listPrebuildContexts\(user\.id, projectContext\.projectId\)/);
  assert.match(read('src/lib/journeyHandoffInbox.ts'), /if \(projectId\) query = query\.eq\("project_id", projectId\)/);
  assert.match(read('src/components/dashboard/CompletionChainResume.tsx'), /if \(projectId\) query = query\.eq\('project_id', projectId\)/);
});

test('Pulse and the tools\' AI context see only this startup\'s assumptions', async () => {
  const db = new PulseDatabase();
  db.tables.journey_assumptions = [
    { user_id: 'owner', project_id: 'orchards', statement: 'Orchard owners pay for fuel tracking', status: 'untested', latest_source_tool: 'icp_builder' },
    { user_id: 'owner', project_id: 'clinics', statement: 'Clinic managers book demos', status: 'confirmed', latest_source_tool: 'pmf_lab' },
  ];
  const memory = await loadPulseMemory(db as never, 'owner', 'orchards');
  assert.deepEqual(memory?.assumptions?.items.map((item) => item.statement), ['Orchard owners pay for fuel tracking']);
  assert.match(memory!.assumptions!.provenance, /for this project/);

  const accountWide = await loadPulseMemory(db as never, 'owner', null);
  assert.equal(accountWide?.assumptions?.items.length, 2, 'an account without a project still sees its assumptions');
  assert.match(accountWide!.assumptions!.provenance, /for this account/);
});
