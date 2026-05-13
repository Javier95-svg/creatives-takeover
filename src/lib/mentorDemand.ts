import type { Mentor } from '@/types/mentor';

export type MentorRecommendationTrack = 'validation' | 'gtm' | 'mvp' | 'fundraising';

export interface MentorMarketplaceContext {
  track: MentorRecommendationTrack;
  source?: string;
}

export interface MentorRecommendationContext {
  track: MentorRecommendationTrack;
  startupIndustry?: string[] | null;
  summaryInsight?: string | null;
  targetAudience?: string | null;
  extraKeywords?: string[] | null;
}

export interface MentorRecommendationResult {
  mentor: Mentor;
  score: number;
  reason: string;
  matchedExpertise: string[];
}

const TRACK_CONFIG: Record<
  MentorRecommendationTrack,
  {
    expertise: string[];
    title: string;
    description: string;
    browseLabel: string;
    keywords: string[];
  }
> = {
  validation: {
    expertise: ['Strategy', 'Product Development', 'Business Development', 'Sales'],
    title: 'Talk to a mentor before you build',
    description:
      'These mentors are strongest at pressure-testing validation signals, helping you interpret objections, and deciding what to change before you commit more time to the product.',
    browseLabel: 'Browse validation mentors',
    keywords: ['validation', 'customer discovery', 'interviews', 'problem', 'evidence', 'pmf', 'product market fit', 'pivot'],
  },
  gtm: {
    expertise: ['Growth Marketing', 'Sales', 'Business Development', 'Strategy', 'Content Creation'],
    title: 'Pressure-test your GTM plan with a mentor',
    description:
      'These mentors are the best fit for founders who have a launch plan but want sharper channel priorities, messaging, and execution feedback before they waste the first launch cycle.',
    browseLabel: 'Browse GTM mentors',
    keywords: ['go to market', 'launch', 'distribution', 'messaging', 'acquisition', 'growth', 'positioning', 'channels'],
  },
  mvp: {
    expertise: ['Product Development', 'Technology', 'Design', 'Operations'],
    title: 'Get execution feedback before you build',
    description:
      'These mentors are best for MVP scoping, technical tradeoffs, and narrowing product scope so you do not overbuild the first version.',
    browseLabel: 'Browse MVP mentors',
    keywords: ['mvp', 'scope', 'product', 'build', 'technology', 'design', 'prototype'],
  },
  fundraising: {
    expertise: ['Fundraising', 'Finance', 'Strategy', 'Business Development'],
    title: 'Refine your fundraising approach with a mentor',
    description:
      'These mentors are strongest at fundraising strategy, investor readiness, outreach, and founder positioning ahead of real investor conversations.',
    browseLabel: 'Browse fundraising mentors',
    keywords: ['fundraising', 'investors', 'pitch', 'deck', 'finance', 'outreach', 'venture'],
  },
};

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'your',
  'that',
  'this',
  'from',
  'into',
  'have',
  'will',
  'their',
  'about',
  'after',
  'before',
  'they',
  'them',
  'what',
  'when',
  'where',
  'which',
  'just',
  'need',
  'gets',
  'make',
  'more',
]);

const TRACK_REASON_BY_EXPERTISE: Partial<Record<MentorRecommendationTrack, Partial<Record<string, string>>>> = {
  validation: {
    Strategy: 'Strong fit for interpreting mixed validation signals and deciding what to test next.',
    'Product Development': 'Useful when you need to separate real feature demand from noisy feedback.',
    'Business Development': 'Useful when interviews are not translating into strong conversion or buying intent.',
    Sales: 'Helpful for turning raw customer conversations into a clearer commercial signal.',
  },
  gtm: {
    'Growth Marketing': 'Best fit for sharpening channel priorities and launch experiments before execution.',
    Sales: 'Best fit for founders who need stronger outbound motion and first-customer conversations.',
    'Business Development': 'Useful when partnerships and distribution need to become part of the launch plan.',
    Strategy: 'Helpful for turning a broad GTM plan into a narrower execution focus.',
    'Content Creation': 'Useful when messaging and launch content need more clarity and consistency.',
  },
  mvp: {
    'Product Development': 'Best fit for narrowing MVP scope and prioritizing the right first build.',
    Technology: 'Helpful for technical tradeoffs and architecture decisions before implementation.',
    Design: 'Useful when usability and product clarity need to improve before release.',
    Operations: 'Useful for turning build plans into a tighter execution process.',
  },
  fundraising: {
    Fundraising: 'Best fit for investor readiness, story sharpening, and fundraising process strategy.',
    Finance: 'Helpful when the model, numbers, or funding narrative need work before outreach.',
    Strategy: 'Useful for tightening the company story and stage fit before investor conversations.',
    'Business Development': 'Useful when partnerships and traction need to become part of the investor narrative.',
  },
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function getIndustryKeywords(startupIndustry?: string[] | null): string[] {
  return Array.from(
    new Set(
      (startupIndustry ?? [])
        .flatMap((industry) => tokenize(industry))
        .slice(0, 12),
    ),
  );
}

function buildMentorSearchText(mentor: Mentor): string {
  return [
    mentor.name,
    mentor.bio,
    ...(mentor.expertise ?? []),
    ...(mentor.universities ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function getMentorTrackConfig(track: MentorRecommendationTrack) {
  return TRACK_CONFIG[track];
}

export function getMentorTrackExpertise(track: MentorRecommendationTrack): string[] {
  return TRACK_CONFIG[track].expertise;
}

export function buildMentorMarketplaceRoute({ track, source }: MentorMarketplaceContext): string {
  const params = new URLSearchParams();
  params.set('mentorTrack', track);
  if (source) {
    params.set('mentorSource', source);
  }

  return `/mentorship?${params.toString()}`;
}

export function parseMentorTrack(value: string | null): MentorRecommendationTrack | null {
  if (value === 'validation' || value === 'gtm' || value === 'mvp' || value === 'fundraising') {
    return value;
  }

  return null;
}

function getMatchedExpertise(mentor: Mentor, track: MentorRecommendationTrack) {
  const mentorExpertise = mentor.expertise ?? [];
  return TRACK_CONFIG[track].expertise.filter((expertise) =>
    mentorExpertise.some((value) => value.toLowerCase() === expertise.toLowerCase()),
  );
}

function getReason(track: MentorRecommendationTrack, matchedExpertise: string[], matchedIndustry: boolean) {
  const firstExpertise = matchedExpertise[0];
  const expertiseReason =
    (firstExpertise && TRACK_REASON_BY_EXPERTISE[track]?.[firstExpertise]) ||
    TRACK_CONFIG[track].description;

  if (matchedIndustry) {
    return `${expertiseReason} Their profile also overlaps with your niche.`;
  }

  return expertiseReason;
}

export function getMentorRecommendationTitle(track: MentorRecommendationTrack) {
  return TRACK_CONFIG[track].title;
}

export function getMentorRecommendationDescription(track: MentorRecommendationTrack) {
  return TRACK_CONFIG[track].description;
}

export function getMentorRecommendationBrowseLabel(track: MentorRecommendationTrack) {
  return TRACK_CONFIG[track].browseLabel;
}

export function rankMentorsForContext(
  mentors: Mentor[],
  context: MentorRecommendationContext,
): MentorRecommendationResult[] {
  const industryKeywords = getIndustryKeywords(context.startupIndustry);
  const contextualKeywords = Array.from(
    new Set([
      ...TRACK_CONFIG[context.track].keywords,
      ...(context.extraKeywords ?? []).flatMap((keyword) => tokenize(keyword)),
      ...tokenize(context.summaryInsight ?? ''),
      ...tokenize(context.targetAudience ?? ''),
    ]),
  );

  return mentors
    .map((mentor) => {
      const searchText = buildMentorSearchText(mentor);
      const matchedExpertise = getMatchedExpertise(mentor, context.track);
      const matchedIndustry = industryKeywords.some((keyword) => searchText.includes(keyword));
      const keywordHits = contextualKeywords.filter((keyword) => searchText.includes(keyword)).length;

      let score = 0;
      score += matchedExpertise.length * 18;
      score += keywordHits * 3;
      score += matchedIndustry ? 10 : 0;
      score += mentor.is_featured ? 12 : 0;
      score += (mentor.rating ?? 0) * 4;
      score += Math.min(mentor.review_count ?? 0, 20) * 0.4;
      score += mentor.calendly_url ? 4 : 0;

      return {
        mentor,
        score,
        reason: getReason(context.track, matchedExpertise, matchedIndustry),
        matchedExpertise,
      };
    })
    .sort((left, right) => right.score - left.score)
    .filter((item) => item.score > 0);
}
