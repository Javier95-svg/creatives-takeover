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
export function resolveInvestorSectors(text: string, plannerSectors: unknown = []): AngelSector[] {
  const fromPlanner = Array.isArray(plannerSectors)
    ? ANGEL_SECTOR_OPTIONS.filter(sector => plannerSectors.some(value => typeof value === 'string' && value.toLowerCase() === sector.toLowerCase()))
    : [];
  const fromText = ANGEL_SECTOR_OPTIONS.filter(sector => mentions(text, sector) || (SECTOR_ALIASES[sector] ?? []).some(alias => mentions(text, alias)));
  return [...new Set([...fromPlanner, ...fromText])];
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

/** Where "Visit profile" leads: Find your Angel filtered to that investor. Non-Pro accounts meet the upgrade gate there. */
export function investorProfileRoute(name: string): string {
  return `/investors?q=${encodeURIComponent(name)}&source=pulse`;
}

/**
 * Up to three active angels whose declared sectors match, stage fit as a
 * tie-breaker. Without a sector there is no evidence of fit, so no cards.
 */
export function homeInvestorActions(angels: PulseAngel[], sectors: readonly string[], stages: readonly string[] = []): PulseHomeAction[] {
  if (!sectors.length) return [];
  const wanted = sectors.map(sector => sector.toLowerCase());
  return angels
    .filter(angel => angel.is_active === true && typeof angel.name === 'string' && angel.name.trim())
    .map(angel => {
      const matchedSectors = (angel.sectors ?? []).filter(sector => wanted.includes(sector.toLowerCase()));
      const matchedStages = (angel.investment_stages ?? []).filter(stage => stages.includes(stage));
      return { angel, matchedSectors, matchedStages, score: matchedSectors.length * 2 + (matchedStages.length ? 1 : 0) };
    })
    .filter(item => item.matchedSectors.length > 0)
    // Specialists first: an angel with fewer sectors overall is a stronger signal.
    .sort((a, b) => b.score - a.score || (a.angel.sectors?.length ?? 0) - (b.angel.sectors?.length ?? 0) || a.angel.name.localeCompare(b.angel.name))
    .slice(0, 3)
    .map(({ angel, matchedSectors, matchedStages }) => {
      const stageText = (matchedStages.length ? matchedStages : angel.investment_stages ?? []).slice(0, 3).join(', ');
      const reason = [angel.firm_name?.trim(), `Invests in ${matchedSectors.join(', ')}`, stageText].filter(Boolean).join(' · ');
      return {
        kind: 'investor' as const, id: angel.id, title: angel.name.trim(), reason,
        route: investorProfileRoute(angel.name.trim()),
        image: typeof angel.picture === 'string' && /^https:\/\//.test(angel.picture) ? angel.picture : undefined,
      };
    });
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
