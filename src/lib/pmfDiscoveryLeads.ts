import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import type { PMFDiscoveryLeadStatus } from '@/hooks/useCustomerDiscovery';

export type PMFDiscoveryLeadActivityType =
  | 'status_changed'
  | 'note_added'
  | 'outreach_copied'
  | 'outreach_sent'
  | 'interview_scheduled'
  | 'interview_logged';

export type PMFDiscoveryLeadSource = 'reddit' | 'platform' | 'hackernews' | 'x' | 'linkedin' | 'web';

export const LEAD_SOURCE_LABEL: Record<PMFDiscoveryLeadSource, string> = {
  reddit: 'Reddit',
  platform: 'Community',
  hackernews: 'Hacker News',
  x: 'X',
  linkedin: 'LinkedIn',
  web: 'Web',
};

export const leadDisplayHandle = (lead: Pick<PMFDiscoveryLead, 'source' | 'username' | 'display_name'>): string =>
  lead.source === 'reddit' ? `u/${lead.username}` : (lead.display_name || lead.username);

export interface PMFDiscoveryLead {
  id: string;
  user_id: string;
  source: PMFDiscoveryLeadSource;
  username: string;
  display_name?: string | null;
  platform_user_id?: string | null;
  latest_subreddit: string | null;
  profile_url: string | null;
  latest_permalink: string | null;
  latest_pain_quote: string | null;
  status: PMFDiscoveryLeadStatus;
  rank_score: number;
  intent_score: number;
  occurrence_count: number;
  notes: string;
  first_seen_at: string;
  last_seen_at: string;
  contacted_at: string | null;
  interview_scheduled_at: string | null;
  interviewed_at: string | null;
  dismissed_at: string | null;
}

const client = supabase as any;

export async function fetchDiscoveryLeads(userId: string): Promise<PMFDiscoveryLead[]> {
  const { data, error } = await client
    .from('pmf_discovery_leads')
    .select('*')
    .eq('user_id', userId)
    .order('rank_score', { ascending: false })
    .order('last_seen_at', { ascending: false });
  if (error) throw error;
  return (data || []) as PMFDiscoveryLead[];
}

export async function logDiscoveryLeadActivity(
  userId: string,
  leadId: string,
  activityType: PMFDiscoveryLeadActivityType,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await client.from('pmf_discovery_lead_activities').insert({
    user_id: userId,
    lead_id: leadId,
    activity_type: activityType,
    metadata,
  });
  if (error) throw error;
}

export async function updateDiscoveryLeadStatus(
  userId: string,
  leadId: string,
  status: PMFDiscoveryLeadStatus,
) {
  const now = new Date().toISOString();
  const payload: Record<string, string | null> = { status };
  if (status === 'contacted') payload.contacted_at = now;
  if (status === 'interview_scheduled') payload.interview_scheduled_at = now;
  if (status === 'interviewed') payload.interviewed_at = now;
  payload.dismissed_at = status === 'dismissed' ? now : null;
  const { error } = await client.from('pmf_discovery_leads').update(payload).eq('id', leadId).eq('user_id', userId);
  if (error) throw error;
  await logDiscoveryLeadActivity(userId, leadId, 'status_changed', { status });
  if (status === 'contacted') await logDiscoveryLeadActivity(userId, leadId, 'outreach_sent');
  if (status === 'interview_scheduled') await logDiscoveryLeadActivity(userId, leadId, 'interview_scheduled');
  captureEvent(`pmf_discovery_lead_${status}`, { lead_status: status });
}

export async function saveDiscoveryLeadNotes(userId: string, leadId: string, notes: string) {
  const sanitized = notes.trim().slice(0, 4000);
  const { error } = await client.from('pmf_discovery_leads').update({ notes: sanitized }).eq('id', leadId).eq('user_id', userId);
  if (error) throw error;
  await logDiscoveryLeadActivity(userId, leadId, 'note_added', { note_length: sanitized.length });
  captureEvent('pmf_discovery_lead_note_added', { note_length: sanitized.length });
}

export interface ExternalMentionSeed {
  platform: 'x' | 'linkedin';
  title: string;
  url: string;
  snippet?: string;
  username?: string;
}

/**
 * Save a web-search X/LinkedIn mention as a low-confidence lead. These are
 * "verify manually" — the URL is the source of truth, the handle best-effort.
 */
export async function upsertExternalLead(userId: string, mention: ExternalMentionSeed): Promise<PMFDiscoveryLead> {
  const username = (mention.username || mention.title).trim().slice(0, 80);
  const profileUrl = mention.username
    ? (mention.platform === 'x'
      ? `https://x.com/${encodeURIComponent(mention.username)}`
      : `https://www.linkedin.com/in/${encodeURIComponent(mention.username)}`)
    : mention.url;
  const { data, error } = await client
    .from('pmf_discovery_leads')
    .upsert({
      user_id: userId,
      source: mention.platform,
      normalized_username: username.toLowerCase(),
      username,
      profile_url: profileUrl,
      latest_permalink: mention.url,
      latest_pain_quote: mention.snippet?.trim() || mention.title,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'user_id,source,normalized_username' })
    .select('*')
    .single();
  if (error) throw error;
  captureEvent('pmf_discovery_external_lead_saved', { platform: mention.platform, has_username: Boolean(mention.username) });
  return data as PMFDiscoveryLead;
}

export interface PlatformLeadSeed {
  platformUserId: string;
  username: string;
  displayName?: string | null;
  painQuote?: string | null;
  rankScore?: number;
}

/**
 * Save a validation-network member as a discovery lead (source = 'platform').
 * Upserts on (user_id, source, normalized_username) so repeat saves refresh
 * the snapshot instead of duplicating the lead.
 */
export async function upsertPlatformLead(userId: string, seed: PlatformLeadSeed): Promise<PMFDiscoveryLead> {
  const username = seed.username.trim();
  const { data, error } = await client
    .from('pmf_discovery_leads')
    .upsert({
      user_id: userId,
      source: 'platform',
      normalized_username: username.toLowerCase(),
      username,
      display_name: seed.displayName?.trim() || null,
      platform_user_id: seed.platformUserId,
      profile_url: `/profile/${encodeURIComponent(username)}`,
      latest_pain_quote: seed.painQuote?.trim() || null,
      rank_score: Math.max(0, Math.min(100, Math.round(seed.rankScore ?? 0))),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'user_id,source,normalized_username' })
    .select('*')
    .single();
  if (error) throw error;
  captureEvent('pmf_discovery_platform_lead_saved', { match_score: seed.rankScore ?? 0 });
  return data as PMFDiscoveryLead;
}

export async function markDiscoveryLeadsInterviewed(userId: string, leadIds: string[]) {
  const uniqueIds = Array.from(new Set(leadIds.filter(Boolean)));
  await Promise.all(uniqueIds.map(async (leadId) => {
    await updateDiscoveryLeadStatus(userId, leadId, 'interviewed');
    await logDiscoveryLeadActivity(userId, leadId, 'interview_logged');
  }));
}

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export function discoveryLeadsCsv(leads: PMFDiscoveryLead[]): string {
  const headers = ['username', 'source', 'status', 'community', 'source_url', 'rank_score', 'intent_score', 'occurrences', 'first_seen_at', 'last_seen_at', 'notes'];
  const rows = leads.map((lead) => [
    lead.username,
    lead.source,
    lead.status,
    lead.latest_subreddit,
    lead.latest_permalink || lead.profile_url,
    lead.rank_score,
    lead.intent_score,
    lead.occurrence_count,
    lead.first_seen_at,
    lead.last_seen_at,
    lead.notes,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export async function fetchLeadActivities(userId: string, leadId: string, limit = 20): Promise<Array<{
  id: string;
  activity_type: PMFDiscoveryLeadActivityType;
  metadata: Record<string, unknown>;
  occurred_at: string;
}>> {
  const { data, error } = await client
    .from('pmf_discovery_lead_activities')
    .select('id, activity_type, metadata, occurred_at')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('occurred_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
