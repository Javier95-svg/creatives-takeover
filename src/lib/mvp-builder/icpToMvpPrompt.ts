import type { StoredIcpArtifact } from '../icpBuilderSession';

// Turns the project's ICP into a first build message for MVP Builder, in the
// shape the start screen asks for: who it is for, the one thing they should get
// done, and how the founder will know it worked.

const clean = (value: string | null | undefined) => (value ?? '').trim().replace(/\s+/g, ' ').replace(/[.。]+$/, '');

export interface MvpProjectStart {
  title: string;
  customer: string;
  prompt: string;
  /** Three starting points for this project: waitlist, request form, booking. */
  examples: string[];
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
  const pain = clean(doc.decisionBrief?.rankedPains?.slice().sort((a, b) => a.rank - b.rank)[0]?.pain || doc.pain.whyItHurts);
  const examples = [
    `A waitlist page for ${title} aimed at ${customer}: a headline about ${success ? success.toLowerCase() : task}, three short benefits, and an email signup.`,
    `A request form where ${customer} ask ${title} to ${task.charAt(0).toLowerCase()}${task.slice(1)}, with a confirmation message.`,
    `A page where ${customer} book a 15-minute call${pain ? ` about ${pain.charAt(0).toLowerCase()}${pain.slice(1)}` : ''}, with name, email and a short note.`,
  ];
  return { title, customer, prompt: parts.filter(Boolean).join(' '), examples };
}
