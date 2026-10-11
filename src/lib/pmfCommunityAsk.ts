import type { PMFValidationStage } from '../hooks/useCustomerDiscovery.ts';

/**
 * The question a founder can post in Rooms from Customer Discovery: which
 * room, which kind of post, and a first draft built from who has the problem
 * and what it is. Always shown in the composer to edit before posting. Pure,
 * so node tests load it.
 */

export type CommunityAskKind = 'discussion' | 'feedback';

/** Marks a Rooms post as asked from Customer Discovery (kept in source_data). */
export const PMF_DISCOVERY_ORIGIN = 'pmf_discovery';

const ROOM_BY_STAGE: Record<PMFValidationStage, { room: string; roomLabel: string; kind: CommunityAskKind }> = {
  problem_discovery: { room: 'customers', roomLabel: 'Customer discovery', kind: 'discussion' },
  solution_validation: { room: 'product', roomLabel: 'Product & UX', kind: 'feedback' },
  pricing: { room: 'pricing', roomLabel: 'Pricing', kind: 'feedback' },
};

export function askRoom(stage: PMFValidationStage) {
  return ROOM_BY_STAGE[stage] ?? ROOM_BY_STAGE.problem_discovery;
}

/** "freelance designers" → "Freelance designers"; a blank audience asks everyone. */
function addressee(audience: string): string {
  const trimmed = audience.trim().replace(/[.!?]+$/, '');
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : 'Founders';
}

export function draftCommunityQuestion(input: { stage: PMFValidationStage; audience: string; problem: string }) {
  const { room, roomLabel, kind } = askRoom(input.stage);
  const who = addressee(input.audience);
  const audience = input.audience.trim() || 'people';
  const problem = input.problem.trim();
  // The title addresses the audience; the problem, a full sentence, goes in the body.
  const drafts: Record<PMFValidationStage, { title: string; body: string }> = {
    problem_discovery: {
      title: `${who}: does this happen to you?`,
      body: `I'm looking into a problem I think ${audience} have:\n\n${problem}\n\nIf this sounds like you, how do you handle it today, and what's the most annoying part? No pitch, I'm just trying to learn.`,
    },
    solution_validation: {
      title: `${who}: would you try a fix for this?`,
      body: `I'm working on a way to solve this for ${audience}:\n\n${problem}\n\nIf you've dealt with it, would you try a solution? What would it need to do for you to switch from what you use today?`,
    },
    pricing: {
      title: `${who}: what does this cost you today?`,
      body: `A question for ${audience}:\n\n${problem}\n\nIf this is you, what does it cost you today, in time or money? And what would make it worth paying to fix?`,
    },
  };
  const draft = drafts[input.stage] ?? drafts.problem_discovery;
  return { room, roomLabel, kind, title: draft.title.slice(0, 140), body: draft.body.slice(0, 5000) };
}
