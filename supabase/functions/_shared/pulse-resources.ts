import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { LAUNCH_DIRECTORIES } from '../../../src/data/launchDirectories.ts';
import type { PulseHomeAction } from '../../../src/lib/pulseHome.ts';

export const PULSE_RESOURCE_KINDS = ['cofounder', 'vc', 'accelerator', 'directory', 'community'] as const;
export type PulseResourceKind = typeof PULSE_RESOURCE_KINDS[number];
export interface PulseResourceSearch {
  kind: PulseResourceKind;
  state: 'available' | 'no_match' | 'unavailable';
  actions: PulseHomeAction[];
  evidence: Array<{ kind: PulseResourceKind; id: string; title: string; route: string; basis: string; summary: string; updatedAt?: string | null }>;
}

const normalize = (value: unknown) => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const STOP = new Set(['find', 'show', 'recommend', 'suggest', 'browse', 'looking', 'need', 'want', 'some', 'with', 'that', 'this', 'from', 'cofounder', 'co', 'founder', 'venture', 'capital', 'accelerator', 'directory', 'directories', 'community', 'posts', 'rooms']);
const terms = (query: string) => [...new Set(normalize(query).split(/\s+/).filter(value => value.length > 2 && !STOP.has(value)))].slice(0, 10);
const score = (text: string, query: string) => {
  const haystack = normalize(text);
  const wanted = terms(query);
  return wanted.length ? wanted.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0) : 1;
};
const pick = <T>(rows: T[], query: string, text: (row: T) => string) => rows
  .map(row => ({ row, score: score(text(row), query) })).filter(item => item.score > 0)
  .sort((left, right) => right.score - left.score).slice(0, 3).map(item => item.row);

export function requestedPulseResources(message: string): PulseResourceKind[] {
  const kinds: PulseResourceKind[] = [];
  if (/\b(co[- ]?founders?|business partners?)\b/i.test(message)) kinds.push('cofounder');
  if (/\b(venture capital|vc firms?|vcs)\b/i.test(message)) kinds.push('vc');
  if (/\b(accelerators?|incubators?|startup programs?)\b/i.test(message)) kinds.push('accelerator');
  if (/\b(launch directories|product directories|where (?:can|should) i (?:list|submit))\b/i.test(message)) kinds.push('directory');
  if (/\b(launchpad|rooms?|community posts?|founder discussions?)\b/i.test(message)) kinds.push('community');
  return kinds;
}

const empty = (kind: PulseResourceKind, state: 'no_match' | 'unavailable'): PulseResourceSearch => ({ kind, state, actions: [], evidence: [] });

export async function searchPulseResources(db: SupabaseClient, kinds: readonly PulseResourceKind[], query: string): Promise<PulseResourceSearch[]> {
  return Promise.all(kinds.slice(0, 2).map(async kind => {
    try {
      if (kind === 'directory') {
        const rows = pick(LAUNCH_DIRECTORIES, query, row => `${row.name} ${row.description} ${row.bestFor} ${row.category} ${row.audiences.join(' ')}`);
        return rows.length ? {
          kind, state: 'available' as const,
          actions: rows.map(row => ({ kind, id: row.id, title: row.name, reason: `${row.cost} · Best for ${row.bestFor}`.slice(0, 240), route: `/directories?source=pulse&directory=${encodeURIComponent(row.id)}`, badges: [row.category, row.costType] })),
          evidence: rows.map(row => ({ kind, id: row.id, title: row.name, route: `/directories?source=pulse&directory=${encodeURIComponent(row.id)}`, basis: 'verified_directory_metadata', summary: `${row.description} ${row.recommendation}`.slice(0, 900), updatedAt: row.lastVerifiedAt })),
        } : empty(kind, 'no_match');
      }
      if (kind === 'vc') {
        const { data, error } = await db.from('investors').select('id,slug,name,firm_name,investment_stages,investment_thesis,industries,geographic_focus,logo_url,updated_at').eq('investor_type', 'vc').eq('is_active', true).limit(100);
        if (error) return empty(kind, 'unavailable');
        const rows = pick(data ?? [], query, row => `${row.name} ${row.firm_name} ${row.investment_thesis ?? ''} ${(row.industries ?? []).join(' ')} ${(row.investment_stages ?? []).join(' ')} ${(row.geographic_focus ?? []).join(' ')}`);
        return rows.length ? { kind, state: 'available' as const,
          actions: rows.map(row => ({ kind, id: row.id, slug: row.slug, title: row.firm_name || row.name, reason: [...(row.industries ?? []).slice(0, 2), ...(row.investment_stages ?? []).slice(0, 2)].join(' · ') || 'Active VC directory record.', route: `/insighta/vc/${row.slug}`, image: row.logo_url ?? undefined })),
          evidence: rows.map(row => ({ kind, id: row.id, title: row.firm_name || row.name, route: `/insighta/vc/${row.slug}`, basis: 'active_vc_profile', summary: String(row.investment_thesis ?? '').slice(0, 900), updatedAt: row.updated_at }))
        } : empty(kind, 'no_match');
      }
      if (kind === 'accelerator') {
        const { data, error } = await db.from('funding_opportunities').select('id,slug,title,description,focus_stage,focus_sectors,cohort_geography,program_format,equity_taken,logo_url,updated_at').eq('type', 'accelerator').eq('is_active', true).limit(100);
        if (error) return empty(kind, 'unavailable');
        const rows = pick(data ?? [], query, row => `${row.title} ${row.description} ${(row.focus_stage ?? []).join(' ')} ${(row.focus_sectors ?? []).join(' ')} ${(row.cohort_geography ?? []).join(' ')}`);
        return rows.length ? { kind, state: 'available' as const,
          actions: rows.map(row => ({ kind, id: row.id, slug: row.slug ?? row.id, title: row.title, reason: [...(row.focus_sectors ?? []).slice(0, 2), ...(row.focus_stage ?? []).slice(0, 2), row.program_format].filter(Boolean).join(' · '), route: `/insighta/accelerator/${row.slug ?? row.id}`, image: row.logo_url ?? undefined })),
          evidence: rows.map(row => ({ kind, id: row.id, title: row.title, route: `/insighta/accelerator/${row.slug ?? row.id}`, basis: 'active_accelerator_profile', summary: String(row.description ?? '').slice(0, 900), updatedAt: row.updated_at }))
        } : empty(kind, 'no_match');
      }
      if (kind === 'community') {
        const { data, error } = await db.from('community_posts').select('id,title,content,post_type,topic,project_name,stage,updated_at').eq('is_public', true).is('hidden_at', null).limit(100);
        if (error) return empty(kind, 'unavailable');
        const rows = pick(data ?? [], query, row => `${row.title ?? ''} ${row.content ?? ''} ${row.topic ?? ''} ${row.project_name ?? ''}`);
        return rows.length ? { kind, state: 'available' as const,
          actions: rows.map(row => ({ kind, id: row.id, title: row.title || 'Founder discussion', reason: `${row.post_type || 'discussion'}${row.topic ? ` · ${row.topic}` : ''}`, route: `/rooms/posts/${row.id}` })),
          evidence: rows.map(row => ({ kind, id: row.id, title: row.title || 'Founder discussion', route: `/rooms/posts/${row.id}`, basis: 'published_public_community_post', summary: String(row.content ?? '').slice(0, 700), updatedAt: row.updated_at }))
        } : empty(kind, 'no_match');
      }
      const { data, error } = await db.rpc('browse_cofounder_listings_v1', { p_filters: { query }, p_limit: 20, p_cursor: null });
      if (error) return empty(kind, 'unavailable');
      const items = data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items) ? (data as { items: Record<string, unknown>[] }).items : [];
      const rows = pick(items, query, row => `${row.headline ?? ''} ${row.summary ?? ''} ${(row.industries as string[] | undefined ?? []).join(' ')} ${(row.skillsSought as string[] | undefined ?? []).join(' ')}`);
      return rows.length ? { kind, state: 'available' as const,
        actions: rows.map(row => ({ kind, id: String(row.id), title: String(row.headline ?? 'Co-founder listing'), reason: [...((row.skillsSought as string[] | undefined) ?? []).slice(0, 3), String(row.commitment ?? '')].filter(Boolean).join(' · '), route: `/co-founder/listing/${row.id}` })),
        evidence: rows.map(row => ({ kind, id: String(row.id), title: String(row.headline ?? 'Co-founder listing'), route: `/co-founder/listing/${row.id}`, basis: 'active_cofounder_listing', summary: String(row.summary ?? '').slice(0, 700), updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null }))
      } : empty(kind, 'no_match');
    } catch { return empty(kind, 'unavailable'); }
  }));
}

export function pulseResourceActions(results: PulseResourceSearch[]) {
  return [0, 1, 2].flatMap(index => results.flatMap(result => result.actions[index] ? [result.actions[index]] : [])).slice(0, 3);
}
