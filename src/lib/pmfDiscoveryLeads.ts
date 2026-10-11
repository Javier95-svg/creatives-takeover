import { supabase } from '@/integrations/supabase/client';
import { captureEvent, trackCustomerEvidenceRecorded } from '@/lib/analytics';
import type { PMFDiscoveryLeadStatus } from '@/hooks/useCustomerDiscovery';
import { completeReturnCue, scheduleReturnCue } from '@/lib/returnCues';

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
  // Platform members are found through Rooms replies.
  platform: 'Rooms',
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
  /** The search that last found this person, if a search found them. */
  latest_discovery_id?: string | null;
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
  /** When the founder planned to follow up, and the return cue that reminds them. */
  follow_up_at?: string | null;
  follow_up_cue_id?: string | null;
}

const client = supabase as any;

/** The people for one idea, plus anyone not tied to an idea (found before ideas existed). */
export async function fetchDiscoveryLeads(userId: string, validationContextId: string | null): Promise<PMFDiscoveryLead[]> {
  let query = client
    .from('pmf_discovery_leads')
    .select('*')
    .eq('user_id', userId);
  query = validationContextId
    ? query.or(`validation_context_id.eq.${validationContextId},validation_context_id.is.null`)
    : query.is('validation_context_id', null);
  const { data, error } = await query
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

/** Why someone left the list: "said_no" is a reply, unlike a lead that was never a fit. */
export type PMFDiscoveryLeadDismissReason = 'said_no';

export async function updateDiscoveryLeadStatus(
  userId: string,
  leadId: string,
  status: PMFDiscoveryLeadStatus,
  reason?: PMFDiscoveryLeadDismissReason,
) {
  const now = new Date().toISOString();
  const payload: Record<string, string | null> = { status };
  if (status === 'contacted') payload.contacted_at = now;
  if (status === 'interview_scheduled') payload.interview_scheduled_at = now;
  if (status === 'interviewed') payload.interviewed_at = now;
  payload.dismissed_at = status === 'dismissed' ? now : null;
  const { error } = await client.from('pmf_discovery_leads').update(payload).eq('id', leadId).eq('user_id', userId);
  if (error) throw error;
  await logDiscoveryLeadActivity(userId, leadId, 'status_changed', reason ? { status, reason } : { status });
  if (status === 'contacted') await logDiscoveryLeadActivity(userId, leadId, 'outreach_sent');
  if (status === 'interview_scheduled') await logDiscoveryLeadActivity(userId, leadId, 'interview_scheduled');
  captureEvent(`pmf_discovery_lead_${status}`, reason ? { lead_status: status, reason } : { lead_status: status });
  const evidenceType = status === 'saved'
    ? 'prospect_qualified'
    : status === 'contacted'
      ? 'outreach_sent'
      : status === 'interview_scheduled'
        ? 'interview_scheduled'
        : status === 'interviewed'
          ? 'interview_completed'
          : status === 'dismissed'
            ? 'customer_lost'
            : null;
  if (evidenceType) {
    trackCustomerEvidenceRecorded({
      loop: 'PROVE',
      evidence_type: evidenceType,
      contact_source: 'pmf_discovery',
      verification_mode: status.startsWith('interview') ? 'customer_action' : 'imported',
    });
  }
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
export async function upsertExternalLead(userId: string, validationContextId: string, mention: ExternalMentionSeed): Promise<PMFDiscoveryLead> {
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
      validation_context_id: validationContextId,
      source: mention.platform,
      normalized_username: username.toLowerCase(),
      username,
      profile_url: profileUrl,
      latest_permalink: mention.url,
      latest_pain_quote: mention.snippet?.trim() || mention.title,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: LEAD_CONFLICT })
    .select('*')
    .single();
  if (error) throw error;
  captureEvent('pmf_discovery_external_lead_saved', { platform: mention.platform, has_username: Boolean(mention.username) });
  return data as PMFDiscoveryLead;
}

/** One row per person per idea. */
const LEAD_CONFLICT = 'user_id,validation_context_id,source,normalized_username';

export interface PlatformLeadSeed {
  validationContextId: string;
  platformUserId: string;
  username: string;
  displayName?: string | null;
  painQuote?: string | null;
  rankScore?: number;
}

/**
 * Remind the founder to follow up with someone they messaged: an in-app
 * notification and, within the email limits, an email that names the person.
 */
export async function scheduleLeadFollowUp(userId: string, lead: PMFDiscoveryLead, when: Date) {
  const cue = await scheduleReturnCue({
    sourceSection: 'bizmap',
    entityType: 'pmf_discovery_lead',
    entityId: lead.id,
    reasonKey: 'discovery_follow_up_due',
    scheduledFor: when.toISOString(),
    ctaUrl: `/pmf-lab?mode=discover&lead=${encodeURIComponent(lead.id)}`,
    dedupeKey: `pmf-lead-follow-up:${lead.id}`,
    metadata: { name: leadDisplayHandle(lead), kind: 'discovery' },
  });
  const { error } = await client.from('pmf_discovery_leads')
    .update({ follow_up_at: when.toISOString(), follow_up_cue_id: cue.id })
    .eq('id', lead.id).eq('user_id', userId);
  if (error) throw error;
  captureEvent('pmf_discovery_follow_up_scheduled', { days_ahead: Math.round((when.getTime() - Date.now()) / 86_400_000) });
}

/** The follow-up is no longer needed: they replied, booked, or were not a fit. */
export async function clearLeadFollowUp(userId: string, lead: PMFDiscoveryLead) {
  if (!lead.follow_up_at && !lead.follow_up_cue_id) return;
  if (lead.follow_up_cue_id) {
    await completeReturnCue(lead.follow_up_cue_id).catch((error) => console.warn('Could not complete the follow-up reminder:', error));
  }
  const { error } = await client.from('pmf_discovery_leads')
    .update({ follow_up_at: null, follow_up_cue_id: null })
    .eq('id', lead.id).eq('user_id', userId);
  if (error) throw error;
}

/**
 * Save a platform member, such as someone who replied in Rooms, as a discovery lead (source = 'platform').
 * Upserts on (user_id, validation_context_id, source, normalized_username) so
 * repeat saves refresh the snapshot instead of duplicating the lead.
 */
export async function upsertPlatformLead(userId: string, seed: PlatformLeadSeed): Promise<PMFDiscoveryLead> {
  const username = seed.username.trim();
  const { data, error } = await client
    .from('pmf_discovery_leads')
    .upsert({
      user_id: userId,
      validation_context_id: seed.validationContextId,
      source: 'platform',
      normalized_username: username.toLowerCase(),
      username,
      display_name: seed.displayName?.trim() || null,
      platform_user_id: seed.platformUserId,
      profile_url: `/profile/${encodeURIComponent(username)}`,
      latest_pain_quote: seed.painQuote?.trim() || null,
      rank_score: Math.max(0, Math.min(100, Math.round(seed.rankScore ?? 0))),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: LEAD_CONFLICT })
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
