import { FOUNDER_TOOL_CATALOG } from '../config/founderToolCatalog.ts';
import { rankMentorsForContext, type MentorRecommendationContext } from './mentorDemand.ts';
import { getMentorProfileUrl } from '../utils/mentorSlug.ts';
import type { Mentor } from '../types/mentor.ts';
import type { PulseHomeAction } from './pulseHome.ts';

export function homeToolActions(keys: unknown): PulseHomeAction[] {
  if (!Array.isArray(keys)) return [];
  return [...new Set(keys)].flatMap(key => {
    const tool = FOUNDER_TOOL_CATALOG.find(tool => tool.key === key);
    return tool ? [{ kind: 'tool' as const, id: tool.key, title: tool.name, reason: tool.purpose, route: tool.route }] : [];
  }).slice(0, 3);
}

export function homeMentorActions(mentors: Mentor[], context: MentorRecommendationContext): PulseHomeAction[] {
  // Popularity alone is not evidence. Fundraising requires that explicit
  // expertise tag; generic strategy/finance matches are insufficient.
  const ranked = rankMentorsForContext(mentors.filter(mentor => mentor.is_active === true), context)
    .filter(item => context.track === 'fundraising'
      ? item.matchedExpertise.includes('Fundraising')
      : item.matchedExpertise.length > 0);
  return ranked.slice(0, 3).map(({ mentor, reason }) => ({
    kind: 'mentor', id: mentor.id, title: mentor.name, reason,
    route: getMentorProfileUrl(mentor.id, mentor.name), image: mentor.picture,
  }));
}
