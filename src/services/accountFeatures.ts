import { supabase } from '@/integrations/supabase/client';

/**
 * The per type feature reads.
 *
 * Every one of these is a SECURITY DEFINER RPC scoped to auth.uid(), because
 * the underlying tables are readable only by the other side of the interaction:
 * discovery_calls by the founder, mentor_saves by the saver,
 * social_interaction_events by the actor. Widening those policies would expose
 * far more than the one person's own inbox.
 */

export interface MentorBookingSlot {
  id: string;
  startsAt: string;
  durationMinutes: number;
  timezone: string | null;
}

export interface MentorBooking {
  id: string;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  founderName: string | null;
  founderUsername: string | null;
  founderAvatar: string | null;
  serviceId: string | null;
  /** The open round addressed to this mentor, if there is one. */
  roundId: string | null;
  responseDueAt: string | null;
  /** The times the founder proposed. Empty once the round is answered. */
  slots: MentorBookingSlot[];
}

export interface MentorInterestPerson {
  name: string | null;
  username: string | null;
  avatar: string | null;
}

export interface MentorSave extends MentorInterestPerson { savedAt: string }
export interface MentorContact extends MentorInterestPerson { occurredAt: string; interaction: string | null }
export interface MentorInterest { saves: MentorSave[]; contacts: MentorContact[] }

export interface EntityAnalytics {
  totalViews: number;
  uniqueViewers: number;
  byEntity: Array<{ entityType: string; entityId: string; views: number }>;
}

export interface InvestorMatch {
  investmentStage: string | null;
  userId: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  sectors: string[] | null;
  stage: number | null;
  projectTitle: string | null;
  projectSummary: string | null;
  score: number;
}

async function call<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name as never, (args ?? {}) as never);
  if (error) throw error;
  return data as T;
}

/**
 * Accept one of the proposed times, or decline.
 *
 * Goes through the discovery call service, which proves this mentor owns the
 * call and then hands the unchanged state machine the call's own secure token.
 * Credits, calendar creation and the founder's emails all behave exactly as
 * they do when a mentor answers from their inbox.
 */
export async function respondToBooking(input: { callId: string; decision: 'accept' | 'decline'; slotId?: string; reason?: string }) {
  const { data, error } = await supabase.functions.invoke('discovery-call-service', {
    body: { action: 'mentorRespond', ...input },
  });
  if (error) throw new Error(error.message);
  const result = data as { success?: boolean; error?: string } | null;
  if (!result?.success) throw new Error(result?.error ?? 'Could not record your answer.');
  return result;
}

export function listMentorBookings() {
  return call<MentorBooking[]>('mentor_bookings');
}

export function getMentorInterest() {
  return call<MentorInterest>('mentor_interest');
}

/**
 * A marketplace member's enquiries.
 *
 * Same source as a mentor's "who reached out": social_interaction_events where
 * the caller is the counterparty. The saves half of that RPC joins mentors, so
 * it comes back empty here, which is correct rather than a bug.
 */
export async function listEnquiries() {
  const interest = await getMentorInterest();
  return interest.contacts ?? [];
}

export function getEntityAnalytics(days = 30) {
  return call<EntityAnalytics>('entity_analytics', { p_days: days });
}

export function listInvestorMatches() {
  return call<InvestorMatch[]>('investor_matches');
}

/**
 * Records one view of a profile or listing.
 *
 * Failures are swallowed: a view counter must never be the reason a profile
 * page shows an error. The RPC itself drops the owner's own views and
 * deduplicates one viewer per entity per day.
 */
export async function recordEntityView(entityType: 'mentor' | 'service' | 'investor', entityId: string, viewerKey: string) {
  try {
    await call('record_entity_view', { p_entity_type: entityType, p_entity_id: entityId, p_viewer_key: viewerKey });
  } catch {
    // Intentionally silent.
  }
}
