/**
 * Launchpad topics. A fixed list, mirrored by the launchpad_topics table so a
 * post or a follow cannot name a topic that is not here. Each topic points at
 * the CT tool that does the work it is about, so a thread is one click from
 * the tool rather than a dead end.
 */
export type LaunchpadTopicGroup = 'stage' | 'craft';

export interface LaunchpadTopic {
  slug: string;
  label: string;
  group: LaunchpadTopicGroup;
  description: string;
  /** Workspace tool names, resolved through WORKSPACE_ROUTES. */
  tools: readonly string[];
  /** What to write about, for the empty state and the composer placeholder. */
  prompt: string;
}

export const LAUNCHPAD_TOPICS: readonly LaunchpadTopic[] = [
  { slug: 'validation', label: 'Validation', group: 'stage', description: 'Testing whether the problem is real before building.', tools: ['PMF Lab', 'ICP Builder'], prompt: 'Share an interview insight or the assumption you are testing this week.' },
  { slug: 'building', label: 'Building', group: 'stage', description: 'Turning a validated idea into a first version.', tools: ['MVP Builder', 'Tech Stack Builder'], prompt: 'What are you building, and what did you cut from the first version?' },
  { slug: 'launch', label: 'Launch', group: 'stage', description: 'Getting the product in front of its first users.', tools: ['Demo Studio', 'Directories'], prompt: 'Ask for feedback on your launch page or share where you are launching.' },
  { slug: 'traction', label: 'Traction', group: 'stage', description: 'Growing usage and proving people stay.', tools: ['Traction Engine', 'GTM Strategist'], prompt: 'Which channel is working, and which one did you drop?' },
  { slug: 'fundraising', label: 'Fundraising', group: 'stage', description: 'Raising from angels, accelerators and funds.', tools: ['VC Search', 'Find your Angel', 'Pitch Deck Analyzer'], prompt: 'Ask for a pitch review or share what investors pushed back on.' },
  // Skill rooms are kept to what founders ask about most and nothing else in
  // CT covers: team search lives in Find a Co-Founder, stack choices in Tech
  // Stack Builder and the Building room.
  { slug: 'customers', label: 'Customer discovery', group: 'craft', description: 'Finding, interviewing and winning the people you build for.', tools: ['ICP Builder', 'GTM Strategist', 'Directories'], prompt: 'Share what customer interviews taught you, or how you found your first users.' },
  { slug: 'pricing', label: 'Pricing', group: 'craft', description: 'Plans, price points and how you charge.', tools: ['GTM Strategist'], prompt: 'Share your pricing and ask whether it makes sense to a buyer.' },
  { slug: 'product', label: 'Product & UX', group: 'craft', description: 'Features, onboarding and what users actually do.', tools: ['MVP Builder', 'Demo Studio'], prompt: 'Ask for feedback on a screen, flow or feature.' },
  { slug: 'founder-life', label: 'Founder life', group: 'craft', description: 'Focus, motivation and building alongside a job.', tools: ['Find a Mentor'], prompt: 'Share a lesson, a hard week or what keeps you going.' },
];

export const LAUNCHPAD_TOPIC_GROUP_LABEL: Record<LaunchpadTopicGroup, string> = {
  stage: 'By stage',
  craft: 'By craft',
};

const BY_SLUG = new Map(LAUNCHPAD_TOPICS.map((topic) => [topic.slug, topic]));

export function launchpadTopic(slug: string | null | undefined): LaunchpadTopic | null {
  return slug ? BY_SLUG.get(slug) ?? null : null;
}

/** Rooms are the topics, presented as places to talk. */
export const ROOMS_PATH = '/rooms';

export function roomPath(slug: string) {
  return `${ROOMS_PATH}/${slug}`;
}

export function postPath(id: string) {
  return `${ROOMS_PATH}/posts/${id}`;
}

/** Rooms that were merged away, and where their links and posts went (20261009120000). */
export const RETIRED_ROOMS: Readonly<Record<string, string>> = {
  distribution: 'customers',
  'tech-stack': 'building',
  team: 'founder-life',
};
