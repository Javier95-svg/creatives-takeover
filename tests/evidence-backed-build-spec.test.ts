import test from 'node:test';
import assert from 'node:assert/strict';

import { createEvidenceBackedBuildSpecV1, evidenceBackedBuildSpecMarkdown } from '../src/lib/evidenceBackedBuildSpec.ts';

test('EvidenceBackedBuildSpecV1 pins immutable evidence and portable acceptance criteria', () => {
  const spec = createEvidenceBackedBuildSpecV1({
    productName: 'Compass', oneLineDescription: 'Prioritize founder evidence', validatedProblemStatement: 'Founders build before validating', validatedTargetSegment: 'First-time B2B SaaS founders', keyPainLanguage: 'I do not know what to test', template: 'saas_landing', palettePreference: 'minimal', coreCustomer: 'First-time B2B SaaS founder', coreJob: 'choose the next evidence action', successEvent: 'decision_changed', essentialFeatures: ['record customer evidence'], evidenceApprovedAt: '2026-08-15T10:00:00Z', evidenceManifest: { version: 2, generatedAt: '2026-08-15T09:00:00Z', sources: [{ sourceId: 'source-1', sourceType: 'pmf_lab', version: 'immutable-v3', capturedAt: '2026-08-14T10:00:00Z', confidence: 0.8, provenance: 'platform', artifactId: 'artifact-1', verificationMode: 'platform_verified' }] },
  }, '2026-08-15T12:00:00Z');
  assert.equal(spec.version, 1);
  assert.deepEqual(spec.evidence.references[0], { artifactId: 'artifact-1', immutableVersionId: 'immutable-v3', artifactType: 'pmf_lab', verificationMode: 'platform_verified', capturedAt: '2026-08-14T10:00:00Z' });
  assert.ok(spec.userStories[0].acceptanceCriteria.includes('The decision_changed event is emitted when value is reached.'));
  assert.match(evidenceBackedBuildSpecMarkdown(spec), /immutable version immutable-v3/);
});
