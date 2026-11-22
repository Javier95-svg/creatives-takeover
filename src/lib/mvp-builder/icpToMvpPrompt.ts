import type { StoredIcpArtifact } from '../icpBuilderSession';
import { alternativesToBeat, answeredWhatTheyGet } from '../icpValuePosition.ts';

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
  // Since 2026-11-22 MVP Builder makes a clickable prototype of the one
  // workflow; the page that collects signups is Demo Studio's concept page.
  // Everything shown should serve what the customer gets, and if the draft
  // names an easy alternative, the prototype has to show why this beats it.
  const value = clean(answeredWhatTheyGet(doc));
  const toBeat = alternativesToBeat(doc, 1)[0];
  const lowerFirst = (text: string) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  const parts = [
    `A clickable prototype of ${title} for ${customer}.`,
    `The one thing they should get done: ${task}.`,
    value ? `Lead with what they get: ${lowerFirst(value)}.` : '',
    toBeat ? `Make clear why this is better for them than ${lowerFirst(clean(toBeat.option))}.` : '',
    'Show that one workflow screen by screen, from the first step to the result, with realistic sample data.',
    success ? `It works if ${lowerFirst(success)}.` : '',
    'End on one clear call to action so you can count who gets to the result. Skip the marketing landing page.',
  ];
  const pain = clean(doc.decisionBrief?.rankedPains?.slice().sort((a, b) => a.rank - b.rank)[0]?.pain || doc.pain.whyItHurts);
  const examples = [
    `A clickable prototype where ${customer} ${lowerFirst(task)}, from the first screen to the result, with sample data.`,
    `The screen ${customer} would check each week to see ${success ? lowerFirst(success) : 'their progress'}, filled with realistic sample data.`,
    `A short guided flow where ${customer} answer three questions${pain ? ` about ${lowerFirst(pain)}` : ''} and see a tailored result.`,
  ];
  return { title, customer, prompt: parts.filter(Boolean).join(' '), examples };
}
