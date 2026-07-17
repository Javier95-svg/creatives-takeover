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

export interface PMFDiscoveryLead {
  id: string;
  user_id: string;
  source: 'reddit';
  username: string;
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

export async function markDiscoveryLeadsInterviewed(userId: string, leadIds: string[]) {
  const uniqueIds = Array.from(new Set(leadIds.filter(Boolean)));
  await Promise.all(uniqueIds.map(async (leadId) => {
    await updateDiscoveryLeadStatus(userId, leadId, 'interviewed');
    await logDiscoveryLeadActivity(userId, leadId, 'interview_logged');
  }));
}

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export function discoveryLeadsCsv(leads: PMFDiscoveryLead[]): string {
  const headers = ['username', 'status', 'subreddit', 'reddit_url', 'rank_score', 'intent_score', 'occurrences', 'first_seen_at', 'last_seen_at', 'notes'];
  const rows = leads.map((lead) => [
    lead.username,
    lead.status,
    lead.latest_subreddit,
    lead.latest_permalink,
    lead.rank_score,
    lead.intent_score,
    lead.occurrence_count,
    lead.first_seen_at,
    lead.last_seen_at,
    lead.notes,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
