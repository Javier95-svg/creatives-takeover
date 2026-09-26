import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateHomeActions, type PulseHomeAction } from '../../../src/lib/pulseHome.ts';

export const CATALOG_KINDS = ['article', 'podcast', 'service'] as const;
export type CatalogKind = typeof CATALOG_KINDS[number];
export interface CatalogResult {
  kind: CatalogKind;
  state: 'available' | 'no_match' | 'unavailable';
  actions: PulseHomeAction[];
  evidence: Array<{ id: string; title: string; summary: string; updatedAt: string | null; basis: 'metadata' }>;
}

export function catalogKinds(value: unknown): CatalogKind[] {
  return Array.isArray(value) ? CATALOG_KINDS.filter(kind => value.includes(kind)) : [];
}

// Explicit catalog requests must not be classified as outside Pulse's remit.
export function requestedCatalogKinds(message: string): CatalogKind[] {
  return CATALOG_KINDS.filter(kind => {
    if (kind === 'service' && !/\bmarketplace\b/i.test(message) && !/\b(?:recommend|find|hire|suggest|browse|looking for)\b.*\b(?:services?|providers?)\b/i.test(message)) return false;
    const noun = kind === 'article' ? '(?:newspaper|articles?)' : kind === 'podcast' ? '(?:podcasts?|episodes?)' : '(?:marketplace|services?|providers?)';
    if (new RegExp(`\\b(?:no|not|without)\\s+(?:any\\s+)?${noun}\\b`, 'i').test(message)) return false;
    return new RegExp(`\\b${noun}\\b`, 'i').test(message);
  });
}

export function catalogQuery(value: unknown): string {
  // Return plain search terms, not a model-authored PostgREST expression or URL.
  if (typeof value !== 'string') return '';
  const stop = new Set(['recommend', 'recommendation', 'suggest', 'find', 'show', 'please', 'me', 'an', 'a', 'the', 'of', 'for', 'to', 'my', 'some', 'newspaper', 'article', 'articles', 'podcast', 'podcasts', 'episode', 'episodes', 'marketplace', 'service', 'services', 'provider', 'providers', 'section', 'creatives', 'takeover']);
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter(word => word.length > 1 && !stop.has(word)).slice(0, 12).join(' ').slice(0, 180) ?? '';
}

const BROWSE: Record<CatalogKind, { id: string; title: string; route: string }> = {
  article: { id: 'newspaper', title: 'Browse Newspaper', route: '/newspaper' },
  podcast: { id: 'podcast', title: 'Browse podcasts', route: '/podcast' },
  service: { id: 'marketplace', title: 'Browse Marketplace', route: '/marketplace' },
};

export async function searchPulseCatalog(db: SupabaseClient, kinds: CatalogKind[], query: string): Promise<CatalogResult[]> {
  return Promise.all(kinds.map(async kind => {
    const browse = (state: 'no_match' | 'unavailable'): CatalogResult => ({
      kind, state, evidence: [], actions: [{ kind: 'browse', ...BROWSE[kind], reason: state === 'unavailable' ? 'Search is temporarily unavailable. Browse the catalog directly.' : 'No strong catalog match was found. Browse other options.' }],
    });
    try {
      const { data, error } = await db.rpc('search_pulse_catalog', { p_query: query, p_kinds: [kind], p_limit: 3 });
      if (error) return browse('unavailable');
      const rows = Array.isArray(data) ? data : [];
      const evidence: CatalogResult['evidence'] = [];
      const actions = rows.flatMap(row => {
        if (row.kind !== kind || typeof row.title !== 'string') return [];
        const action = validateHomeActions([{ kind, id: row.id, title: row.title.slice(0, 180), slug: row.slug,
          reason: query ? `Matches the catalog search for ${query}.` : 'A recently published catalog item.', route: '' }]);
        if (action.length) evidence.push({ id: row.id, title: row.title.slice(0, 180), summary: typeof row.summary === 'string' ? row.summary.slice(0, 1200) : '', updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null, basis: 'metadata' });
        return action;
      });
      return actions.length ? { kind, state: 'available' as const, actions, evidence } : browse('no_match');
    } catch { return browse('unavailable'); }
  }));
}

// Give each requested type a slot before showing multiple items from one type.
export function catalogActions(results: CatalogResult[]): PulseHomeAction[] {
  return [0, 1, 2].flatMap(index => results.flatMap(result => result.actions[index] ? [result.actions[index]] : [])).slice(0, 3);
}
