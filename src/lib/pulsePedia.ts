import { PEDIA_ENTRIES, entryPlainText } from '../data/startupPedia/index.ts';
import type { PediaEntry } from '../data/startupPedia/types.ts';
import type { PulseHomeAction } from './pulseHome.ts';

export interface PulsePediaEvidence {
  id: string;
  title: string;
  route: string;
  basis: 'startup_pedia_passage';
  passage: string;
  updatedAt: string;
}

const STOP = new Set(['what', 'does', 'mean', 'tell', 'about', 'define', 'explain', 'startup', 'pedia', 'guide', 'find', 'show', 'please', 'with', 'that', 'this']);
const normalize = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (value: string) => [...new Set(normalize(value).split(/\s+/).filter(token => token.length > 1 && !STOP.has(token)))];
const includesPhrase = (haystack: string, phrase: string) => haystack === phrase || haystack.includes(` ${phrase} `) || haystack.startsWith(`${phrase} `) || haystack.endsWith(` ${phrase}`);

function scoreEntry(entry: PediaEntry, query: string) {
  const phrase = normalize(query);
  const queryTokens = tokens(query);
  if (!queryTokens.length) return 0;
  const title = normalize(entry.title);
  const aliases = [...(entry.acronyms ?? []), ...(entry.aliases ?? [])].map(normalize);
  const summary = normalize(`${entry.answer} ${entry.metaDescription} ${entry.topic}`);
  const body = normalize(entryPlainText(entry));
  let score = includesPhrase(title, phrase) ? 120 : 0;
  if (aliases.some(alias => alias === phrase)) score += 140;
  for (const token of queryTokens) {
    if (title.split(' ').includes(token)) score += 24;
    if (aliases.some(alias => alias.split(' ').includes(token))) score += 32;
    if (summary.includes(token)) score += 8;
    if (body.includes(token)) score += 2;
  }
  return score;
}

function relevantPassage(entry: PediaEntry, query: string) {
  const queryTokens = tokens(query);
  const candidates = [entry.answer, ...entry.sections.flatMap(section => [section.heading, section.body]), ...entry.faqs.flatMap(faq => [faq.question, faq.answer])];
  const selected = [...candidates].sort((left, right) =>
    queryTokens.filter(token => normalize(right).includes(token)).length - queryTokens.filter(token => normalize(left).includes(token)).length,
  )[0] ?? entry.answer;
  return selected.replace(/\s+/g, ' ').slice(0, 700);
}

export function asksForPedia(message: string) {
  const trimmed = message.trim();
  if (/^(?:what (?:is|are|does)|define|explain)\s+(?:my|our|your)\b/i.test(trimmed)) return false;
  return /\b(startup[ -]?pedia|startup glossary)\b/i.test(trimmed)
    || /^(?:what (?:is|are|does)|define|meaning of|explain)\b/i.test(trimmed);
}

export function searchPulsePedia(query: string, limit = 3): { actions: PulseHomeAction[]; evidence: PulsePediaEvidence[] } {
  const ranked = PEDIA_ENTRIES.map(entry => ({ entry, score: scoreEntry(entry, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, Math.max(0, Math.min(limit, 3)));
  return {
    actions: ranked.map(({ entry }) => ({ kind: 'pedia', id: entry.slug, slug: entry.slug, title: entry.title,
      reason: entry.answer.slice(0, 220), route: `/startup-pedia/${entry.slug}`, badges: [entry.topic] })),
    evidence: ranked.map(({ entry }) => ({ id: entry.slug, title: entry.title, route: `/startup-pedia/${entry.slug}`,
      basis: 'startup_pedia_passage', passage: relevantPassage(entry, query), updatedAt: entry.modifiedAt })),
  };
}
