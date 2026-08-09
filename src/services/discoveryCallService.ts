import { supabase } from '@/integrations/supabase/client';
import { createIdempotencyKey } from '@/lib/idempotency';

export type DiscoveryCallWorkflowStatus =
  | 'intent_created'
  | 'pending_mentor_response'
  | 'pending_founder_response'
  | 'scheduled'
  | 'awaiting_outcome'
  | 'completed'
  | 'declined'
  | 'withdrawn'
  | 'expired'
  | 'cancelled_early'
  | 'cancelled_late'
  | 'founder_no_show'
  | 'mentor_no_show';

export type DiscoveryCallCreditState = 'pending' | 'finalized' | 'released' | 'expired' | 'refunded';

export interface DiscoveryCallQuotaStatus {
  success: boolean;
  canBookNow: boolean;
  totalCreditsAvailable: number;
  overageCreditCost: number;
  [key: string]: unknown;
}

export interface SchedulingSlot {
  id: string;
  ordinal: number;
  starts_at: string;
  duration_minutes: number;
  proposed_timezone: string;
}

export interface SchedulingRound {
  id: string;
  round_type: 'initial' | 'reschedule';
  proposer_role: 'founder' | 'mentor' | 'admin';
  responder_role: 'founder' | 'mentor';
  status: 'pending' | 'accepted' | 'declined' | 'superseded' | 'expired';
  counter_depth: number;
  response_due_at: string;
  meeting_url: string | null;
  meeting_instructions: string | null;
  discovery_call_scheduling_slots: SchedulingSlot[];
}

export interface MeetingDetails {
  meetingUrl?: string;
  meetingInstructions?: string;
}

export interface DiscoveryCallBookingItem {
  id: string;
  bookingContext: 'mentor' | 'service';
  mentorId: string | null;
  mentorName: string;
  mentorPicture: string | null;
  status: DiscoveryCallWorkflowStatus;
  workflowVersion: number;
  topic: string | null;
  desiredOutcome: string | null;
  notes: string | null;
  founderTimezone: string | null;
  responseDueAt: string | null;
  scheduledFor: string | null;
  durationMinutes: number;
  meetingUrl: string | null;
  meetingInstructions: string | null;
  creditChargeAmount: number;
  creditsCharged: boolean;
  creditsRefunded: boolean;
  cancelledAt: string | null;
  cancelledReason: string | null;
  calendarSequence: number;
  rounds: SchedulingRound[];
  reservation: {
    status: DiscoveryCallCreditState;
    held_amount: number;
    expires_at: string;
    credit_transaction_id: string | null;
    refund_transaction_id: string | null;
    metadata: Record<string, unknown>;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscoveryCallRequestInput {
  mentorId: string;
  topic: string;
  desiredOutcome: string;
  notes?: string;
  timezone: string;
  slots: Array<{ startsAt: string }>;
  idempotencyKey?: string;
}

export interface DiscoveryCallAvailability {
  success: boolean;
  featureEnabled: boolean;
  available: boolean;
  creditCost: number;
  durationMinutes: number;
  quotaStatus: DiscoveryCallQuotaStatus;
}

export interface MentorDiscoveryPortal {
  callId: string;
  purpose: 'mentor_request_response' | 'mentor_booking_manage';
  founderName: string;
  mentorName: string;
  status: DiscoveryCallWorkflowStatus;
  topic: string | null;
  desiredOutcome: string | null;
  notes: string | null;
  founderTimezone: string;
  mentorTimezone: string;
  responseDueAt: string | null;
  scheduledFor: string | null;
  durationMinutes: number;
  meetingUrl: string | null;
  meetingInstructions: string | null;
  activeRound: SchedulingRound | null;
}

interface ServiceResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  [key: string]: unknown;
}

async function invoke<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) throw new Error(error.message || 'Discovery Call request failed');
  return data as T;
}

export const getDiscoveryCallQuotaStatus = () =>
  invoke<DiscoveryCallQuotaStatus>('discovery-call-service', { action: 'getQuotaStatus' });

export const getDiscoveryCallAvailability = (mentorId: string) =>
  invoke<DiscoveryCallAvailability>('discovery-call-service', { action: 'getAvailability', mentorId });

export function createDiscoveryCallRequest(input: CreateDiscoveryCallRequestInput) {
  return invoke<ServiceResult & { callId?: string; responseDueAt?: string; heldCredits?: number }>('discovery-call-service', {
    action: 'createRequest',
    ...input,
    idempotencyKey: input.idempotencyKey || createIdempotencyKey('discovery-call-request-v2'),
  });
}

export const listMyDiscoveryCalls = () =>
  invoke<{ success: boolean; bookings: DiscoveryCallBookingItem[] }>('discovery-call-service', { action: 'listMine' });

export const acceptMentorCounter = (callId: string) =>
  invoke<ServiceResult>('discovery-call-service', { action: 'acceptMentorCounter', callId });

export const declineMentorCounter = (callId: string) =>
  invoke<ServiceResult>('discovery-call-service', { action: 'declineMentorCounter', callId });

export const withdrawDiscoveryCallRequest = (callId: string) =>
  invoke<ServiceResult>('discovery-call-service', { action: 'withdrawRequest', callId });

export const cancelDiscoveryCall = (callId: string, reason: string) =>
  invoke<ServiceResult>('discovery-call-service', { action: 'cancel', callId, reason });

export const createDiscoveryCallReschedule = (input: { callId: string; timezone: string; slots: string[] }) =>
  invoke<ServiceResult>('discovery-call-service', { action: 'createReschedule', ...input });

export const respondToDiscoveryCallReschedule = (input: {
  callId: string;
  response: 'accept' | 'counter' | 'decline';
  slotId?: string;
  counterStartsAt?: string;
  meetingUrl?: string;
  meetingInstructions?: string;
}) => invoke<ServiceResult>('discovery-call-service', { action: 'respondToReschedule', ...input });

export const loadMentorDiscoveryPortal = (token: string) =>
  invoke<{ success: boolean; portal?: MentorDiscoveryPortal; errorCode?: string; message?: string }>('discovery-call-mentor-response', { action: 'load', token });

export const respondAsMentor = (token: string, input: {
  action: 'acceptSlot' | 'counter' | 'decline' | 'cancelBooking' | 'createReschedule' | 'acceptReschedule' | 'counterReschedule' | 'declineReschedule';
  slotId?: string;
  counterStartsAt?: string;
  meetingUrl?: string;
  meetingInstructions?: string;
  reason?: string;
  timezone?: string;
  slots?: string[];
}) => invoke<ServiceResult>('discovery-call-mentor-response', { token, ...input });

export interface AdminMentorDiscoverySettings {
  mentor_id: string;
  notification_email: string;
  discovery_calls_enabled: boolean;
  legacy_provider: 'calendly' | 'koalendar' | 'google_calendar' | 'cal_com' | 'other' | null;
  legacy_booking_url: string | null;
}

export const getAdminMentorDiscoverySettings = (mentorId: string) =>
  invoke<{ success: boolean; settings: AdminMentorDiscoverySettings | null }>('discovery-call-service', { action: 'getAdminSettings', mentorId });

export const updateAdminMentorDiscoverySettings = (input: {
  mentorId: string;
  notificationEmail: string;
  discoveryCallsEnabled: boolean;
  legacyProvider?: string | null;
  legacyBookingUrl?: string | null;
}) => invoke<{ success: boolean; settings?: AdminMentorDiscoverySettings; error?: string }>('discovery-call-service', { action: 'updateAdminSettings', ...input });

export const listAdminDiscoveryCalls = () =>
  invoke<{ success: boolean; calls: Array<Record<string, unknown>>; health: Array<Record<string, unknown>>; notifications: Array<Record<string, unknown>>; notificationAlerts: Array<Record<string, unknown>>; events: Array<Record<string, unknown>>; rounds: Array<Record<string, unknown>>; reservations: Array<Record<string, unknown>> }>('discovery-call-service', { action: 'listAdminCalls' });

export const adminOverrideDiscoveryCall = (input: Record<string, unknown>) =>
  invoke<ServiceResult>('discovery-call-service', { action: 'adminOverride', ...input });

export const resendDiscoveryCallNotification = (notificationId: string) =>
  invoke<ServiceResult>('discovery-call-service', { action: 'resendNotification', notificationId });

export function clearLegacyDiscoveryCallRedirects() {
  ['pending_calendly_redirect', 'pending_discovery_call_booking_redirect', 'oauth_discovery_call_booking_redirect', 'oauth_calendly_redirect']
    .forEach((key) => localStorage.removeItem(key));
}
