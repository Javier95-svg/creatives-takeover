import { FOUNDER_TOOL_CATALOG } from '../config/founderToolCatalog.ts';
import { rankMentorsForContext, type MentorRecommendationContext } from './mentorDemand.ts';
import { getMentorProfileUrl } from '../utils/mentorSlug.ts';
import type { Mentor } from '../types/mentor.ts';
import type { PulseHomeAction } from './pulseHome.ts';
import { ANGEL_SECTOR_OPTIONS, type AngelSector } from '../data/angelSectors.ts';

export function homeToolActions(keys: unknown): PulseHomeAction[] {
  if (!Array.isArray(keys)) return [];
  return [...new Set(keys)].flatMap(key => {
    const tool = FOUNDER_TOOL_CATALOG.find(tool => tool.key === key);
    return tool ? [{ kind: 'tool' as const, id: tool.key, title: tool.name, reason: tool.purpose, route: tool.route }] : [];
  }).slice(0, 3);
}

// ---- Angel investors (Find your Angel) ------------------------------------

export interface PulseAngel {
  id: string;
  name: string;
  firm_name: string | null;
  sectors: string[] | null;
  investment_stages: string[] | null;
  picture: string | null;
  is_active: boolean | null;
}

// Words people use for each directory sector, beyond the sector's own name.
const SECTOR_ALIASES: Partial<Record<AngelSector, string[]>> = {
  'AI & Machine Learning': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'genai'],
  'BioTech & Life Sciences': ['biotech', 'life sciences', 'pharma', 'biology'],
  'CleanTech & Climate': ['cleantech', 'climate', 'sustainability', 'carbon'],
  'Consumer & D2C': ['consumer', 'd2c', 'dtc', 'direct to consumer'],
  Cybersecurity: ['cybersecurity', 'cyber security', 'cyber', 'infosec', 'security'],
  'DeepTech & Hardware': ['deeptech', 'deep tech', 'hardware'],
  'Developer Tools': ['developer tools', 'devtools', 'dev tools', 'developer'],
  'E-Commerce & Marketplace': ['ecommerce', 'e-commerce', 'marketplace', 'marketplaces'],
  EdTech: ['edtech', 'education', 'learning'],
  Energy: ['energy'],
  'Enterprise Software': ['enterprise', 'b2b software'],
  FinTech: ['fintech', 'payments', 'banking', 'finance', 'financial'],
  'FoodTech & AgTech': ['foodtech', 'agtech', 'food', 'agriculture'],
  'Gaming & Entertainment': ['gaming', 'games', 'entertainment'],
  GovTech: ['govtech', 'government', 'public sector'],
  HealthTech: ['healthtech', 'health', 'healthcare', 'medtech', 'digital health'],
  'HR Tech & Future of Work': ['hr tech', 'hrtech', 'future of work', 'recruiting', 'hiring'],
  InsurTech: ['insurtech', 'insurance'],
  LegalTech: ['legaltech', 'legal'],
  'Logistics & Supply Chain': ['logistics', 'supply chain'],
  'Manufacturing & Industry 4.0': ['manufacturing', 'industry 4.0', 'industrial'],
  'Media & Creator Economy': ['media', 'creator economy', 'creators', 'creator'],
  'Mobility & Logistics': ['mobility'],
  'Mobility & Transportation': ['mobility', 'transportation', 'transport'],
  'PropTech & Real Estate': ['proptech', 'real estate', 'property'],
  RetailTech: ['retailtech', 'retail'],
  'Robotics & Automation': ['robotics', 'automation', 'robots'],
  SaaS: ['saas', 'software as a service'],
  'Social Impact': ['social impact', 'impact'],
  SpaceTech: ['spacetech', 'space'],
  'Sports & Wellness': ['sports', 'wellness', 'fitness'],
  'Travel & Hospitality': ['travel', 'hospitality', 'tourism'],
  'Web3 & Blockchain': ['web3', 'blockchain', 'crypto'],
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text: string, phrase: string) => new RegExp(`(^|[^a-z0-9])${escapeRegex(phrase)}($|[^a-z0-9])`, 'i').test(text);

/** Directory sectors named in free text, e.g. "cyber security startups" -> ["Cybersecurity"]. */
export function sectorsInText(text: string): AngelSector[] {
  return ANGEL_SECTOR_OPTIONS.filter(sector => mentions(text, sector) || (SECTOR_ALIASES[sector] ?? []).some(alias => mentions(text, alias)));
}

/** Only real directory sectors survive from the planner's (model-written) list. */
export function validSectors(value: unknown): AngelSector[] {
  if (!Array.isArray(value)) return [];
  return ANGEL_SECTOR_OPTIONS.filter(sector => value.some(item => typeof item === 'string' && item.toLowerCase() === sector.toLowerCase()));
}

/**
 * The sectors to match, split by where they came from. What the user typed is
 * the request; sectors the planner adds (usually the project's own) are shown
 * as such on the card rather than silently changing the results.
 */
export function resolveInvestorSectors(text: string, plannerSectors: unknown = []): { requested: AngelSector[]; fromProject: AngelSector[] } {
  const typed = sectorsInText(text);
  // With nothing typed, rankInvestors treats the planner's sectors as the request.
  return { requested: typed, fromProject: validSectors(plannerSectors).filter(sector => !typed.includes(sector)) };
}

const STAGE_PATTERNS: [string, RegExp][] = [
  ['Pre-Seed', /\bpre[- ]?seed\b/i], ['Seed', /(^|[^-])\bseed\b/i], ['Series A', /\bseries a\b/i],
  ['Series B', /\bseries b\b/i], ['Series C+', /\bseries (c|d|e)\b/i],
];
export function resolveInvestorStages(text: string): string[] {
  return STAGE_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([stage]) => stage);
}

/** True when the message asks to find an investor or angel. */
export function asksForInvestor(text: string): boolean {
  return /\b(angels?|investors?|vcs?|venture capitalists?|backers?)\b/i.test(text);
}

/** "show me more", "any others?", "different ones": a follow-up to an earlier investor answer. */
export function asksForMore(text: string): boolean {
  return /\b(more|others?|another|different|else|next)\b/i.test(text) && text.trim().length <= 120;
}

/**
 * The funding rounds that fit a Startup Development Cycle stage (1 to 7), so a
 * pre-seed founder is not shown Series A-only angels without asking.
 */
const FUNDING_STAGES_BY_CYCLE: Record<number, readonly string[]> = {
  1: ['Pre-Seed'], 2: ['Pre-Seed'], 3: ['Pre-Seed'], 4: ['Pre-Seed', 'Seed'],
  5: ['Seed'], 6: ['Seed', 'Series A'], 7: ['Seed', 'Series A'],
};
export function fundingStagesForCycleStage(stage: unknown): string[] {
  const number = typeof stage === 'number' ? stage : typeof stage === 'string' ? Number(stage) : NaN;
  return [...(FUNDING_STAGES_BY_CYCLE[number] ?? [])];
}

/** Where "Visit profile" leads: Find your Angel filtered to that investor. Non-Pro accounts meet the upgrade gate there. */
export function investorProfileRoute(name: string): string {
  return `/investors?q=${encodeURIComponent(name)}&source=pulse`;
}

// FNV-1a: a small, stable hash so a rotation seed orders ties the same way all day.
function rotationKey(seed: string, id: string): number {
  let hash = 0x811c9dc5;
  for (const char of `${seed}:${id}`) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193); }
  return hash >>> 0;
}

export interface InvestorQuery {
  /** Sectors the user asked for. When empty, fromProject is the request. */
  requested: readonly string[];
  /** Sectors added from saved context (the project), labelled as such on the card. */
  fromProject?: readonly string[];
  /** Rounds the user named ("seed", "Series A"). */
  stages?: readonly string[];
  /** Rounds implied by the project's stage, used when the user named none. */
  projectStages?: readonly string[];
  /** Angels already shown in this conversation. */
  excludeIds?: readonly string[];
  /** Orders equal scores; user id + UTC date keeps answers stable for a day. */
  seed?: string;
}

export interface InvestorRanking {
  actions: PulseHomeAction[];
  /** Every angel that matches the sectors, including ones already shown. */
  totalMatches: number;
  /** Matches not yet shown in this conversation, after this answer. */
  remaining: number;
}

/**
 * Up to three angels, scored on evidence: +2 per requested sector they declare,
 * +1 per project sector, +1.5 for a round the user named or +1 for a round that
 * fits the project's stage, +0.5 for specialists (two sectors or fewer). Equal
 * scores rotate daily per user instead of falling back to A to Z.
 * Without a sector there is no evidence of fit, so no cards.
 */
export function rankInvestors(angels: PulseAngel[], query: InvestorQuery): InvestorRanking {
  const requested = (query.requested.length ? query.requested : query.fromProject ?? []).map(sector => sector.toLowerCase());
  const extra = (query.requested.length ? query.fromProject ?? [] : []).map(sector => sector.toLowerCase());
  const projectLabelled = !query.requested.length;
  if (!requested.length) return { actions: [], totalMatches: 0, remaining: 0 };
  const namedStages = query.stages ?? [];
  const impliedStages = namedStages.length ? [] : query.projectStages ?? [];
  const excluded = new Set(query.excludeIds ?? []);
  const seed = query.seed ?? '';

  const scored = angels
    .filter(angel => angel.is_active === true && typeof angel.name === 'string' && angel.name.trim())
    .map(angel => {
      const sectors = angel.sectors ?? [];
      const matched = sectors.filter(sector => requested.includes(sector.toLowerCase()));
      const matchedExtra = sectors.filter(sector => extra.includes(sector.toLowerCase()));
      const angelStages = angel.investment_stages ?? [];
      const namedFit = angelStages.filter(stage => namedStages.includes(stage));
      const impliedFit = angelStages.filter(stage => impliedStages.includes(stage));
      const score = matched.length * 2 + matchedExtra.length + (namedFit.length ? 1.5 : impliedFit.length ? 1 : 0) + (sectors.length <= 2 ? 0.5 : 0);
      return { angel, matched, matchedExtra, stageFit: namedFit.length ? namedFit : impliedFit, impliedFit: !namedFit.length && impliedFit.length > 0, score };
    })
    .filter(item => item.matched.length > 0)
    .sort((a, b) => b.score - a.score || rotationKey(seed, a.angel.id) - rotationKey(seed, b.angel.id));

  const fresh = scored.filter(item => !excluded.has(item.angel.id));
  const picked = fresh.slice(0, 3);
  const actions = picked.map(({ angel, matched, matchedExtra, stageFit, impliedFit }) => {
    const sectorText = `Invests in ${matched.join(', ')}${projectLabelled ? ' (your project’s sector)' : ''}${matchedExtra.length ? ` + ${matchedExtra.join(', ')} (your project)` : ''}`;
    const stages = (stageFit.length ? stageFit : angel.investment_stages ?? []).slice(0, 3).join(', ');
    const stageText = stages ? `${stages}${stageFit.length ? (impliedFit ? ' (fits your stage)' : ' (your round)') : ''}` : '';
    return {
      kind: 'investor' as const, id: angel.id, title: angel.name.trim(),
      reason: [angel.firm_name?.trim(), sectorText, stageText].filter(Boolean).join(' · '),
      route: investorProfileRoute(angel.name.trim()),
      image: typeof angel.picture === 'string' && /^https:\/\//.test(angel.picture) ? angel.picture : undefined,
    };
  });
  return { actions, totalMatches: scored.length, remaining: Math.max(0, fresh.length - picked.length) };
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
