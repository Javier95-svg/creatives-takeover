import type { MVPBuilderSetupInput } from '@/lib/mvp-builder/phase1';

export interface EvidenceBackedBuildSpecV1 {
  version: 1;
  generatedAt: string;
  project: { name: string; problem: string; icp: string; coreJob: string };
  evidence: {
    approvedAt: string | null;
    references: Array<{
      artifactId: string;
      immutableVersionId: string;
      artifactType: string;
      verificationMode: 'unverified' | 'founder_reported' | 'corroborated' | 'platform_verified';
      capturedAt: string;
    }>;
  };
  scope: { included: string[]; explicitlyExcluded: string[] };
  userStories: Array<{ story: string; acceptanceCriteria: string[] }>;
  requiredAnalyticsEvents: Array<{ event: string; trigger: string }>;
  openAssumptions: string[];
  killRules: string[];
  technicalConstraints: string[];
}

export function createEvidenceBackedBuildSpecV1(input: MVPBuilderSetupInput, generatedAt = new Date().toISOString()): EvidenceBackedBuildSpecV1 {
  const included = (input.essentialFeatures ?? []).map((value) => value.trim()).filter(Boolean);
  const customer = input.coreCustomer?.trim() || input.validatedTargetSegment.trim() || 'Target customer to validate';
  const coreJob = input.coreJob?.trim() || input.oneLineDescription.trim() || 'Core job to validate';
  const successEvent = input.successEvent?.trim() || 'customer_value_reached';
  const references = (input.evidenceManifest?.sources ?? []).map((source) => ({
    artifactId: source.artifactId || source.sourceId,
    immutableVersionId: source.version,
    artifactType: source.artifactType || source.sourceType,
    verificationMode: source.verificationMode || 'unverified' as const,
    capturedAt: source.capturedAt,
  }));

  return {
    version: 1,
    generatedAt,
    project: { name: input.productName.trim() || 'Untitled MVP', problem: input.validatedProblemStatement.trim(), icp: customer, coreJob },
    evidence: { approvedAt: input.evidenceApprovedAt ?? null, references },
    scope: { included, explicitlyExcluded: ['Automated outbound', 'Unvalidated secondary customer segments', 'Features not listed in included scope'] },
    userStories: included.map((feature) => ({ story: `As ${customer}, I can ${feature} so that I can ${coreJob}.`, acceptanceCriteria: [`The ${feature} path is usable end to end.`, `The ${successEvent} event is emitted when value is reached.`, 'Failure and empty states are explicit.'] })),
    requiredAnalyticsEvents: [{ event: successEvent, trigger: 'When the target customer completes the core value action' }, { event: 'signup_completed', trigger: 'When an account is successfully created' }, { event: 'activated', trigger: 'When the founder-defined activation boundary is met' }],
    openAssumptions: references.length ? ['Imported evidence still needs customer-level interpretation.', 'The proposed scope is sufficient to test the core job.'] : ['The problem and ICP have no pinned evidence source yet.', 'The proposed scope is sufficient to test the core job.'],
    killRules: [`Stop or revise if no target customer reaches ${successEvent} after the agreed test cohort.`, 'Remove features that do not support the core job or produce decision-relevant evidence.'],
    technicalConstraints: ['Preserve the required analytics event names.', 'Do not place secrets in client-side code.', `Template: ${input.template}; palette: ${input.palettePreference}.`],
  };
}

export function evidenceBackedBuildSpecMarkdown(spec: EvidenceBackedBuildSpecV1) {
  const bullets = (values: string[]) => values.length ? values.map((value) => `- ${value}`).join('\n') : '- None recorded';
  return `# Evidence-backed build specification\n\nVersion: ${spec.version}\nGenerated: ${spec.generatedAt}\n\n## Problem and ICP\n\n**Product:** ${spec.project.name}\n\n**Problem:** ${spec.project.problem || 'Not recorded'}\n\n**ICP:** ${spec.project.icp}\n\n**Core job:** ${spec.project.coreJob}\n\n## Pinned evidence\n\n${bullets(spec.evidence.references.map((ref) => `${ref.artifactType} · artifact ${ref.artifactId} · immutable version ${ref.immutableVersionId} · ${ref.verificationMode}`))}\n\n## In scope\n\n${bullets(spec.scope.included)}\n\n## Explicitly excluded\n\n${bullets(spec.scope.explicitlyExcluded)}\n\n## User stories and acceptance criteria\n\n${spec.userStories.length ? spec.userStories.map((item) => `### ${item.story}\n${bullets(item.acceptanceCriteria)}`).join('\n\n') : 'No user stories recorded.'}\n\n## Required analytics\n\n${bullets(spec.requiredAnalyticsEvents.map((item) => `\`${item.event}\` — ${item.trigger}`))}\n\n## Open assumptions\n\n${bullets(spec.openAssumptions)}\n\n## Kill rules\n\n${bullets(spec.killRules)}\n\n## Technical constraints\n\n${bullets(spec.technicalConstraints)}\n`;
}

export function buildSpecFiles(input: MVPBuilderSetupInput, generatedAt = new Date().toISOString()) {
  const spec = createEvidenceBackedBuildSpecV1(input, generatedAt);
  return [
    { path: 'docs/evidence-backed-build-spec.v1.md', content: evidenceBackedBuildSpecMarkdown(spec), language: 'markdown' },
    { path: 'docs/evidence-backed-build-spec.v1.json', content: JSON.stringify(spec, null, 2), language: 'json' },
  ];
}
