import { supabase } from '@/integrations/supabase/client';
import { createIdempotencyKey } from '@/lib/idempotency';

export type DiscoveryCallWorkflowStatus =
  | 'intent_created'
  | 'pending_mentor_response'
  | 'pending_founder_response'
  | 'pending_meeting_creation'
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
  meetingProvider: 'google_meet' | 'manual' | 'external' | null;
  calendarProvider: 'google_calendar' | null;
  meetingCreationStatus: 'not_required' | 'pending' | 'created' | 'failed' | 'cancelled';
  externalCalendarHtmlUrl: string | null;
  calendarError: string | null;
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
  bookingMode: 'request' | 'instant' | 'hybrid';
  allowRequestFallback: boolean;
  mentorTimezone: string;
  slots: Array<{ startsAt: string; durationMinutes: number }>;
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

export const getDiscoveryCallAvailability = (mentorId: string, range?: { from: string; to: string }) =>
  invoke<DiscoveryCallAvailability>('discovery-call-service', { action: 'getAvailability', mentorId, ...range });

export function createInstantDiscoveryCallBooking(input: Omit<CreateDiscoveryCallRequestInput, 'slots'> & { startsAt: string }) {
  return invoke<ServiceResult & { callId?: string; scheduledFor?: string; heldCredits?: number }>('discovery-call-service', {
    action: 'createInstantBooking',
    ...input,
    idempotencyKey: input.idempotencyKey || createIdempotencyKey('discovery-call-instant-v4'),
  });
}

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
  booking_mode: 'request' | 'instant' | 'hybrid';
  scheduling_timezone: string;
  minimum_notice_hours: number;
  booking_window_days: number;
  buffer_minutes: number;
  allow_request_fallback: boolean;
  availability_rules?: MentorAvailabilityRule[];
  availability_exceptions?: MentorAvailabilityException[];
  calendar_connection?: MentorCalendarConnection | null;
}

export interface MentorAvailabilityRule {
  id?: string;
  weekday: number;
  start_local_time?: string;
  end_local_time?: string;
  startLocalTime?: string;
  endLocalTime?: string;
  enabled: boolean;
}

export interface MentorAvailabilityException {
  id: string;
  exception_type: 'unavailable' | 'additional';
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

export interface MentorCalendarConnection {
  status: 'active' | 'reauthorization_required' | 'revoked' | 'error';
  google_account_email: string | null;
  last_synced_at: string | null;
  last_error: string | null;
}

export const getAdminMentorDiscoverySettings = (mentorId: string) =>
  invoke<{ success: boolean; settings: AdminMentorDiscoverySettings | null }>('discovery-call-service', { action: 'getAdminSettings', mentorId });

export const updateAdminMentorDiscoverySettings = (input: {
  mentorId: string;
  notificationEmail: string;
  discoveryCallsEnabled: boolean;
  bookingMode?: 'request' | 'instant' | 'hybrid';
  schedulingTimezone?: string;
  minimumNoticeHours?: number;
  bookingWindowDays?: number;
  bufferMinutes?: number;
  allowRequestFallback?: boolean;
  availabilityRules?: Array<{ weekday: number; startLocalTime: string; endLocalTime: string; enabled?: boolean }>;
  legacyProvider?: string | null;
  legacyBookingUrl?: string | null;
}) => invoke<{ success: boolean; settings?: AdminMentorDiscoverySettings; error?: string }>('discovery-call-service', { action: 'updateAdminSettings', ...input });

export const listAdminDiscoveryCalls = () =>
  invoke<{ success: boolean; calls: Array<Record<string, unknown>>; health: Array<Record<string, unknown>>; notifications: Array<Record<string, unknown>>; notificationAlerts: Array<Record<string, unknown>>; events: Array<Record<string, unknown>>; rounds: Array<Record<string, unknown>>; reservations: Array<Record<string, unknown>>; calendarJobs: Array<Record<string, unknown>> }>('discovery-call-service', { action: 'listAdminCalls' });

export const adminOverrideDiscoveryCall = (input: Record<string, unknown>) =>
  invoke<ServiceResult>('discovery-call-service', { action: 'adminOverride', ...input });

export const resendDiscoveryCallNotification = (notificationId: string) =>
  invoke<ServiceResult>('discovery-call-service', { action: 'resendNotification', notificationId });

export const retryDiscoveryCallCalendarOperation = (calendarJobId: string) =>
  invoke<ServiceResult>('discovery-call-service', { action: 'retryCalendarOperation', calendarJobId });

export const createMentorAvailabilityAccess = (mentorId: string) =>
  invoke<ServiceResult & { url?: string }>('discovery-call-service', { action: 'createMentorAvailabilityAccess', mentorId });

export interface MentorAvailabilityPortalData {
  mentor: { id: string; name: string; picture: string | null };
  settings: {
    discovery_calls_enabled: boolean;
    booking_mode: 'request' | 'instant' | 'hybrid';
    scheduling_timezone: string;
    minimum_notice_hours: number;
    booking_window_days: number;
    buffer_minutes: number;
    allow_request_fallback: boolean;
  };
  rules: MentorAvailabilityRule[];
  exceptions: MentorAvailabilityException[];
  calendarConnection: MentorCalendarConnection | null;
}

export const loadMentorAvailabilityPortal = (token: string) =>
  invoke<{ success: boolean } & Partial<MentorAvailabilityPortalData>>('discovery-call-mentor-availability', { action: 'load', token });

export const saveMentorAvailability = (token: string, input: {
  bookingMode: 'request' | 'instant' | 'hybrid'; timezone: string;
  minimumNoticeHours: number; bookingWindowDays: number; bufferMinutes: number;
  allowRequestFallback: boolean;
  rules: Array<{ weekday: number; startLocalTime: string; endLocalTime: string; enabled: boolean }>;
}) => invoke<ServiceResult>('discovery-call-mentor-availability', { action: 'save', token, ...input });

export const addMentorAvailabilityException = (token: string, input: {
  exceptionType: 'unavailable' | 'additional'; startsAt: string; endsAt: string; reason?: string;
}) => invoke<ServiceResult & { exception?: MentorAvailabilityException }>('discovery-call-mentor-availability', { action: 'addException', token, ...input });

export const deleteMentorAvailabilityException = (token: string, exceptionId: string) =>
  invoke<ServiceResult>('discovery-call-mentor-availability', { action: 'deleteException', token, exceptionId });

export const beginMentorGoogleCalendarConnect = (token: string) =>
  invoke<ServiceResult & { authorizationUrl?: string }>('discovery-call-mentor-availability', { action: 'beginGoogleConnect', token });

export const disconnectMentorGoogleCalendar = (token: string) =>
  invoke<ServiceResult>('discovery-call-mentor-availability', { action: 'disconnectGoogle', token });

export function clearLegacyDiscoveryCallRedirects() {
  ['pending_calendly_redirect', 'pending_discovery_call_booking_redirect', 'oauth_discovery_call_booking_redirect', 'oauth_calendly_redirect']
    .forEach((key) => localStorage.removeItem(key));
}
