import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const dryRunPath = process.argv[2] || 'supabase-migration-dry-run.log';
const reviewed = new Set((process.env.REVIEWED_MIGRATIONS || '')
  .split(',')
  .map((value) => value.trim().replace(/\.sql$/i, ''))
  .filter(Boolean));
const requiredFiles = [
  'supabase/migrations/20260823120000_proof_loop_funnel.sql',
  'supabase/migrations/20260823160000_ct_verified_acquisition_loop.sql',
  'supabase/migrations/20260824120000_outcome_integrated_founder_journey.sql',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) throw new Error(`Required pilot migration is missing: ${file}`);
}

const dryRun = await readFile(dryRunPath, 'utf8');
const pending = [...new Set([...dryRun.matchAll(/\b(\d{14}_[a-zA-Z0-9_-]+)(?:\.sql)?\b/g)].map((match) => match[1]))];
const unexpected = pending.filter((migration) => !reviewed.has(migration) && !reviewed.has(migration.slice(0, 14)));
if (unexpected.length > 0) {
  throw new Error(`Dry-run contains migrations that were not explicitly reviewed: ${unexpected.join(', ')}`);
}
if (pending.length > 0 && reviewed.size === 0) {
  throw new Error('Pending migrations exist, but REVIEWED_MIGRATIONS is empty.');
}

const requiredSql = await readFile(requiredFiles[2], 'utf8');
for (const token of [
  'founder_journeys', 'journey_stage_runs', 'journey_evidence_submissions',
  'reviewer_verified', 'get_outcome_journey_release_health_v1',
]) {
  if (!requiredSql.includes(token)) throw new Error(`Pilot migration is missing required release token: ${token}`);
}

process.stdout.write(JSON.stringify({ verified: true, pending, reviewed: [...reviewed] }, null, 2));
