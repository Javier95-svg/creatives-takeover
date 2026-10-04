import type { StoredIcpArtifact } from '../icpBuilderSession';

// Turns the project's ICP into a first build message for MVP Builder, in the
// shape the start screen asks for: who it is for, the one thing they should get
// done, and how the founder will know it worked.

const clean = (value: string | null | undefined) => (value ?? '').trim().replace(/\s+/g, ' ').replace(/[.。]+$/, '');

export interface MvpProjectStart {
  title: string;
  customer: string;
  prompt: string;
}

export function icpArtifactToMvpStart(artifact: StoredIcpArtifact, projectTitle: string): MvpProjectStart | null {
  const doc = artifact.draftDocument;
  const customer = clean(doc.decisionBrief?.primarySegment || doc.customer.roleLine || doc.gatePreview.roleLine);
  const feature = doc.build.coreFeatures?.[0];
  const task = clean(feature?.description || feature?.title || doc.build.valueProposition);
  const success = clean(doc.build.outcome);
  if (!customer || !task) return null;
  const title = clean(projectTitle) || 'my product';
  const parts = [
    `A first version of ${title} for ${customer}.`,
    `The one thing they should get done: ${task}.`,
    success ? `It works if ${success.charAt(0).toLowerCase()}${success.slice(1)}.` : '',
    'Keep it to one page with a clear signup or request form.',
  ];
  return { title, customer, prompt: parts.filter(Boolean).join(' ') };
}
