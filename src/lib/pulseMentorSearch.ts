import type { Mentor } from '../types/mentor.ts';
import { MENTOR_COACHING_FORMATS, MENTOR_LANGUAGE_LABELS, MENTOR_LANGUAGE_OPTIONS, MENTOR_STARTUP_STAGES } from '../data/mentorTraits.ts';
import { MENTOR_EXPERTISE_OPTIONS } from '../data/mentorExpertise.ts';
import { ANGEL_SECTOR_OPTIONS } from '../data/angelSectors.ts';
import { getMentorTrackExpertise, parseMentorTrack, type MentorRecommendationTrack } from './mentorDemand.ts';

export interface MentorSearchQuery {
  requested: boolean;
  track: MentorRecommendationTrack | null;
  expertise: string[];
  industries: string[];
  startupStages: string[];
  languages: string[];
  coachingFormats: string[];
  timezone: string | null;
  location: string | null;
  maxHourlyRate: number | null;
  keywords: string[];
}

export interface MentorSearchResult {
  mentor: Mentor;
  band: 'A' | 'B' | 'C';
  evidence: string[];
  reason: string;
  fallbackEvidence: string[];
}

const normalized = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9:+/-]+/g, ' ').trim();
const phraseIn = (text: string, phrase: string) => normalized(text).includes(normalized(phrase));
const safeStrings = (value: unknown, max = 8) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map(item => item.trim().slice(0, 80)).slice(0, max)
  : [];
const canonical = (values: unknown, options: readonly string[]) => options.filter(option => safeStrings(values).some(value => normalized(value) === normalized(option)));
const unique = (values: string[]) => [...new Set(values)];

const languageFromText = (text: string) => MENTOR_LANGUAGE_OPTIONS
  .filter(([code, label]) => new RegExp(`\\b${label.toLowerCase()}\\b`, 'i').test(text) || new RegExp(`\\blanguage[: ]+${code}\\b`, 'i').test(text))
  .map(([code]) => code);

const stageFromText = (text: string) => MENTOR_STARTUP_STAGES.filter(stage =>
  new RegExp(`\\b${stage.toLowerCase()}\\b`, 'i').test(text),
);

const trackFromText = (text: string): MentorRecommendationTrack | null => {
  if (/\b(fundrais|investor|pitch deck|venture)\w*/i.test(text)) return 'fundraising';
  if (/\b(gtm|go[- ]to[- ]market|growth|marketing|sales|launch|distribution)\b/i.test(text)) return 'gtm';
  if (/\b(mvp|product|prototype|technical|technology|design|build)\b/i.test(text)) return 'mvp';
  if (/\b(validat|customer discovery|interviews?|problem|pmf)\w*/i.test(text)) return 'validation';
  return null;
};

export function asksForMentor(message: string) {
  return /\b(mentors?|coaches?|advisors?)\b/i.test(message);
}

export function parseMentorSearch(message: string, planner: unknown = {}, inherited?: MentorSearchQuery | null): MentorSearchQuery {
  const data = planner && typeof planner === 'object' && !Array.isArray(planner) ? planner as Record<string, unknown> : {};
  const plannedTrack = typeof data.track === 'string' ? parseMentorTrack(data.track) : null;
  const track = plannedTrack ?? trackFromText(message) ?? inherited?.track ?? null;
  const expertise = unique([
    ...canonical(data.expertise, MENTOR_EXPERTISE_OPTIONS),
    ...MENTOR_EXPERTISE_OPTIONS.filter(value => phraseIn(message, value)),
  ]);
  const industries = unique([
    ...canonical(data.industries, ANGEL_SECTOR_OPTIONS),
    ...ANGEL_SECTOR_OPTIONS.filter(value => phraseIn(message, value)),
  ]);
  const plannedLanguages = safeStrings(data.languages).flatMap(value => {
    const match = MENTOR_LANGUAGE_OPTIONS.find(([code, label]) => normalized(value) === normalized(code) || normalized(value) === normalized(label));
    return match ? [match[0]] : [];
  });
  const rawTimezone = typeof data.timezone === 'string' ? data.timezone.trim().slice(0, 80) : '';
  const textTimezone = message.match(/\b(?:UTC|GMT)\s*[+-]\s*\d{1,2}(?::\d{2})?\b/i)?.[0]?.replace(/\s+/g, '') ?? null;
  const maxRate = typeof data.maxHourlyRate === 'number' && Number.isFinite(data.maxHourlyRate)
    ? Math.max(0, Math.round(data.maxHourlyRate < 1000 ? data.maxHourlyRate * 100 : data.maxHourlyRate))
    : (() => { const match = message.match(/(?:under|max(?:imum)?|budget)\s*\$?\s*(\d{2,5})/i); return match ? Number(match[1]) * 100 : null; })();
  const keywords = unique(safeStrings(data.keywords, 10).concat(message.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length >= 5 && !/^(mentor|coach|advisor|looking|someone|need|find|please)$/.test(word)).slice(0, 10)));
  const result: MentorSearchQuery = {
    requested: true,
    track,
    expertise: expertise.length ? expertise : inherited?.expertise ?? [],
    industries: industries.length ? industries : inherited?.industries ?? [],
    startupStages: unique([...canonical(data.startupStages, MENTOR_STARTUP_STAGES), ...stageFromText(message)]).length
      ? unique([...canonical(data.startupStages, MENTOR_STARTUP_STAGES), ...stageFromText(message)]) : inherited?.startupStages ?? [],
    languages: unique([...plannedLanguages, ...languageFromText(message)]).length ? unique([...plannedLanguages, ...languageFromText(message)]) : inherited?.languages ?? [],
    coachingFormats: canonical(data.coachingFormats, MENTOR_COACHING_FORMATS).length
      ? canonical(data.coachingFormats, MENTOR_COACHING_FORMATS) : inherited?.coachingFormats ?? [],
    timezone: rawTimezone || textTimezone || inherited?.timezone || null,
    location: typeof data.location === 'string' && data.location.trim() ? data.location.trim().slice(0, 80) : inherited?.location ?? null,
    maxHourlyRate: maxRate ?? inherited?.maxHourlyRate ?? null,
    keywords: keywords.length ? keywords : inherited?.keywords ?? [],
  };
  return result;
}

const rotationKey = (seed: string, id: string) => {
  let hash = 0x811c9dc5;
  for (const char of `${seed}:${id}`) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193); }
  return hash >>> 0;
};
const listMatches = (actual: readonly string[] | undefined, requested: readonly string[]) => requested.filter(item => (actual ?? []).some(value => normalized(value) === normalized(item)));

export function rankMentorsForSearch(mentors: Mentor[], query: MentorSearchQuery, options: {
  excludeIds?: readonly string[]; impressions?: Readonly<Record<string, number>>; seed?: string;
} = {}): MentorSearchResult[] {
  const excluded = new Set(options.excludeIds ?? []);
  // Fundraising recommendations require that explicit directory tag; generic
  // strategy/finance experience is not evidence of investor-process expertise.
  const requiredExpertise = query.expertise.length ? query.expertise
    : query.track === 'fundraising' ? ['Fundraising']
    : query.track ? getMentorTrackExpertise(query.track) : [];
  return mentors.filter(mentor => mentor.is_active === true && !excluded.has(mentor.id)).flatMap(mentor => {
    const text = [mentor.bio, mentor.name, ...(mentor.expertise ?? []), ...(mentor.industries ?? []), mentor.location, mentor.nationality].filter(Boolean).join(' ');
    const evidence: string[] = [];
    const fallbackEvidence: string[] = [];
    let structuredRequirements = 0;
    let structuredMatches = 0;
    let hardFailure = false;
    const checkList = (label: string, requested: string[], actual: string[] | undefined, display = (value: string) => value) => {
      if (!requested.length) return;
      structuredRequirements += requested.length;
      const matches = listMatches(actual, requested);
      structuredMatches += matches.length;
      evidence.push(...matches.map(value => display(value)));
      const missing = requested.filter(value => !matches.includes(value));
      if (!missing.length) return;
      if (!(actual ?? []).length && missing.every(value => phraseIn(text, display(value)) || phraseIn(text, value))) fallbackEvidence.push(...missing.map(value => `${display(value)} (profile text)`));
      else hardFailure = true;
    };
    if (requiredExpertise.length) {
      const matches = listMatches(mentor.expertise, requiredExpertise);
      if (!matches.length) return [];
      evidence.push(...matches);
      if (query.expertise.length && matches.length < query.expertise.length) return [];
      if (query.expertise.length) { structuredRequirements += query.expertise.length; structuredMatches += matches.length; }
    }
    checkList('industry', query.industries, mentor.industries);
    checkList('language', query.languages, mentor.languages, value => MENTOR_LANGUAGE_LABELS[value] ?? value);
    checkList('stage', query.startupStages, mentor.startup_stages, value => `${value} stage`);
    checkList('format', query.coachingFormats, mentor.coaching_formats);
    if (query.timezone) {
      structuredRequirements++;
      if (mentor.timezone && normalized(mentor.timezone) === normalized(query.timezone)) { structuredMatches++; evidence.push(mentor.timezone); }
      else if (!mentor.timezone && phraseIn(text, query.timezone)) fallbackEvidence.push(`${query.timezone} (profile text)`);
      else hardFailure = true;
    }
    if (query.location) {
      structuredRequirements++;
      if (mentor.location && phraseIn(mentor.location, query.location)) { structuredMatches++; evidence.push(mentor.location); }
      else if (!mentor.location && (phraseIn(text, query.location) || phraseIn(mentor.nationality ?? '', query.location))) fallbackEvidence.push(`${query.location} (profile text)`);
      else hardFailure = true;
    }
    if (query.maxHourlyRate !== null) {
      const rate = mentor.hourly_rate_per_hour || mentor.hourly_rate;
      if (rate > query.maxHourlyRate) hardFailure = true;
      else evidence.push(`Within ${Math.round(query.maxHourlyRate / 100)} budget`);
    }
    if (hardFailure) return [];
    const keywordHits = query.keywords.filter(keyword => phraseIn(text, keyword)).slice(0, 2);
    const band: 'A' | 'B' | 'C' = fallbackEvidence.length ? 'C' : structuredRequirements > 0 && structuredMatches === structuredRequirements ? 'A' : 'B';
    const verified = unique(evidence).slice(0, 5);
    const reason = fallbackEvidence.length
      ? `Possible fit from legacy profile text: ${fallbackEvidence.join(', ')}. Verify these traits with the mentor.`
      : verified.length ? `Verified fit: ${verified.join(', ')}.`
      : keywordHits.length ? `Relevant profile themes: ${keywordHits.join(', ')}.`
      : 'Relevant expertise for this request.';
    return [{ mentor, band, evidence: verified, fallbackEvidence, reason }];
  }).sort((left, right) => {
    const bands = { A: 0, B: 1, C: 2 } as const;
    return bands[left.band] - bands[right.band]
      || (options.impressions?.[left.mentor.id] ?? 0) - (options.impressions?.[right.mentor.id] ?? 0)
      || right.evidence.length - left.evidence.length
      || rotationKey(options.seed ?? '', left.mentor.id) - rotationKey(options.seed ?? '', right.mentor.id);
  });
}

export function mentorSearchRoute(query: MentorSearchQuery) {
  const params = new URLSearchParams({ mentorSource: 'pulse', sort: 'recommended' });
  if (query.track) params.set('mentorTrack', query.track);
  if (query.expertise.length) params.set('expertise', query.expertise.join(','));
  if (query.industries.length) params.set('industries', query.industries.join(','));
  if (query.languages.length) params.set('languages', query.languages.join(','));
  if (query.startupStages.length) params.set('stages', query.startupStages.join(','));
  if (query.coachingFormats.length) params.set('coachingFormats', query.coachingFormats.join(','));
  if (query.timezone) params.set('timezone', query.timezone);
  if (query.location) params.set('location', query.location);
  if (query.maxHourlyRate !== null) params.set('maxRate', String(query.maxHourlyRate));
  return `/mentorship?${params.toString()}`;
}

export function mentorQueryFingerprint(query: MentorSearchQuery) {
  const canonical = JSON.stringify({ ...query, keywords: [...query.keywords].sort() });
  let hash = 0x811c9dc5;
  for (const char of canonical) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 0x01000193); }
  return `mentor_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
