/**
 * The topic taxonomy for founder discussion.
 *
 * The community feed already ships a topic browser — tag counting, tag
 * filtering, and a curated list — but the composer wrote `tags: []` on every
 * insert, so the browser filtered over a permanently empty dimension. These
 * five topics are what the composer now writes.
 *
 * Five, not thirty: a topic with no threads in it reads as a dead room, and
 * thirty topics across a few dozen weekly posts guarantees twenty-five of them.
 * The five are the ranked founder pains from the 2026-07-27 ICP research
 * (customer acquisition first at 32%, isolation as a severity-4 pain), not
 * invented categories — the previous list was a creative-arts taxonomy
 * inherited from the original positioning and matched nothing founders post.
 *
 * Kept free of Supabase and analytics imports so it stays loadable by
 * node:test.
 */

export type CommunityTopicId =
  | 'finding-customers'
  | 'pricing-positioning'
  | 'validation-pmf'
  | 'building-shipping'
  | 'founder-mindset';

export type CommunityTopic = {
  id: CommunityTopicId;
  label: string;
  /** Shown under the topic picker, to make the choice obvious without a guide. */
  description: string;
  /** Seeds the composer body so the box is never blank. */
  prompt: string;
};

export const COMMUNITY_TOPICS: readonly CommunityTopic[] = [
  {
    id: 'finding-customers',
    label: 'Finding customers',
    description: 'Outreach, channels, first users, and why nobody is replying.',
    prompt: 'What have you tried to reach customers, and what happened?',
  },
  {
    id: 'pricing-positioning',
    label: 'Pricing & positioning',
    description: 'What to charge, who it is for, and how to say it.',
    prompt: 'What are you charging, and what makes you unsure about it?',
  },
  {
    id: 'validation-pmf',
    label: 'Validation & PMF',
    description: 'Interviews, evidence, and deciding whether to keep going.',
    prompt: 'What evidence do you have so far, and what would change your mind?',
  },
  {
    id: 'building-shipping',
    label: 'Building & shipping',
    description: 'Scope, tools, and getting something in front of people.',
    prompt: 'What are you building, and where are you stuck?',
  },
  {
    id: 'founder-mindset',
    label: 'Founder mindset',
    description: 'Focus, doubt, burnout, and the parts nobody posts about.',
    prompt: 'What is actually hard right now?',
  },
] as const;

const TOPIC_IDS: ReadonlySet<string> = new Set(COMMUNITY_TOPICS.map((topic) => topic.id));

/** True when `value` is a topic id this build knows about. */
export function isCommunityTopic(value: unknown): value is CommunityTopicId {
  return typeof value === 'string' && TOPIC_IDS.has(value);
}

/**
 * Resolve arbitrary stored input to a known topic id, or null.
 *
 * Posts predate the taxonomy and carry free-form tags, so callers must handle
 * null rather than assume every post has a topic.
 */
export function normalizeTopic(value: unknown): CommunityTopicId | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return isCommunityTopic(trimmed) ? trimmed : null;
}

/** The first recognised topic in a post's tag array, or null. */
export function resolveTopicFromTags(tags: readonly unknown[] | null | undefined): CommunityTopicId | null {
  if (!Array.isArray(tags)) return null;
  for (const tag of tags) {
    const topic = normalizeTopic(tag);
    if (topic) return topic;
  }
  return null;
}

/** The topic definition for an id, or null when unrecognised. */
export function getCommunityTopic(value: unknown): CommunityTopic | null {
  const id = normalizeTopic(value);
  return id ? COMMUNITY_TOPICS.find((topic) => topic.id === id) ?? null : null;
}

/** Human label for an id, falling back to the raw tag so unknown tags still render. */
export function getCommunityTopicLabel(value: unknown): string | null {
  const topic = getCommunityTopic(value);
  if (topic) return topic.label;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}