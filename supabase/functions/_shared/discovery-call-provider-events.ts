import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logInfo, logWarn } from "./logger.ts";
import { emitBusinessEvent } from "./analytics.ts";

type SupabaseAdmin = ReturnType<typeof createClient>;

export type DiscoveryCallProviderName = "calendly" | "koalendar" | "email" | "manual" | "other";
export type DiscoveryCallProviderEventType = "booking_created" | "booking_cancelled" | "booking_rescheduled" | "ignored";

export interface DiscoveryCallProviderEvent {
  providerName: DiscoveryCallProviderName;
  eventType: DiscoveryCallProviderEventType;
  providerEventId?: string | null;
  providerInviteeId?: string | null;
  discoveryCallId?: string | null;
  inviteeEmail?: string | null;
  inviteeName?: string | null;
  scheduledFor?: string | null;
  scheduledUntil?: string | null;
  meetingUrl?: string | null;
  cancelerType?: string | null;
  canceledAt?: string | null;
  cancellationReason?: string | null;
  rawPayload: unknown;
  metadata?: Record<string, unknown>;
}

type DiscoveryCallRow = {
  id: string;
  founder_id: string;
  mentor_id: string;
  status: string;
  scheduled_for: string | null;
  provider_name: string | null;
  provider_event_id: string | null;
  provider_invitee_id: string | null;
  created_at: string;
};

type MatchResult =
  | { status: "matched"; call: DiscoveryCallRow; matchedBy: string; confidence: number }
  | { status: "pending_review"; call: DiscoveryCallRow | null; matchedBy: "unmatched"; confidence: number; reason: string };

export function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }

  return null;
}

export function parseJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function extractUuid(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

export function extractUrlParam(value: string | null | undefined, paramName: string) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return firstNonEmptyString(url.searchParams.get(paramName));
  } catch {
    return null;
  }
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function computeDurationMinutes(startIso: string | null | undefined, endIso: string | null | undefined) {
  const start = parseDate(startIso);
  const end = parseDate(endIso);

  if (!start || !end) return 30;

  const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return diffMinutes > 0 ? diffMinutes : 30;
}

function getEnv(name: string, fallback = "") {
  return Deno.env.get(name) ?? fallback;
}

function normalizeProviderName(value: string | null | undefined): DiscoveryCallProviderName {
  const normalized = (value ?? "").toLowerCase().trim();
  if (["calendly", "koalendar", "email", "manual", "other"].includes(normalized)) {
    return normalized as DiscoveryCallProviderName;
  }
  return "other";
}

function buildNormalizedPayload(event: DiscoveryCallProviderEvent) {
  return {
    providerName: event.providerName,
    eventType: event.eventType,
    providerEventId: event.providerEventId ?? null,
    providerInviteeId: event.providerInviteeId ?? null,
    discoveryCallId: event.discoveryCallId ?? null,
    inviteeEmail: event.inviteeEmail ?? null,
    inviteeName: event.inviteeName ?? null,
    scheduledFor: event.scheduledFor ?? null,
    scheduledUntil: event.scheduledUntil ?? null,
    meetingUrl: event.meetingUrl ?? null,
    cancelerType: event.cancelerType ?? null,
    canceledAt: event.canceledAt ?? null,
    cancellationReason: event.cancellationReason ?? null,
    metadata: event.metadata ?? {},
  };
}

async function resolveFounderId(supabaseAdmin: SupabaseAdmin, email: string | null | undefined) {
  if (!email) return null;

  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .select("user_id")
    .ilike("email", email)
    .limit(2);

  if (error) throw error;
  if (!data || data.length !== 1) return null;
  return data[0].user_id as string;
}

async function findCallById(supabaseAdmin: SupabaseAdmin, id: string) {
  const { data, error } = await supabaseAdmin
    .from("discovery_calls")
    .select("id, founder_id, mentor_id, status, scheduled_for, provider_name, provider_event_id, provider_invitee_id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as DiscoveryCallRow | null;
}

async function resolveDiscoveryCall(supabaseAdmin: SupabaseAdmin, event: DiscoveryCallProviderEvent): Promise<MatchResult> {
  const explicitCallId = extractUuid(event.discoveryCallId ?? null);
  if (explicitCallId) {
    const call = await findCallById(supabaseAdmin, explicitCallId);
    if (call) {
      return {
        status: "matched",
        call,
        matchedBy: event.providerName === "manual" ? "manual" : "tracking_id",
        confidence: 100,
      };
    }
  }

  if (event.providerInviteeId) {
    const { data, error } = await supabaseAdmin
      .from("discovery_calls")
      .select("id, founder_id, mentor_id, status, scheduled_for, provider_name, provider_event_id, provider_invitee_id, created_at")
      .eq("provider_invitee_id", event.providerInviteeId)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return { status: "matched", call: data as DiscoveryCallRow, matchedBy: "provider_invitee_id", confidence: 95 };
    }
  }

  if (event.providerEventId) {
    const { data, error } = await supabaseAdmin
      .from("discovery_calls")
      .select("id, founder_id, mentor_id, status, scheduled_for, provider_name, provider_event_id, provider_invitee_id, created_at")
      .eq("provider_event_id", event.providerEventId)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return { status: "matched", call: data as DiscoveryCallRow, matchedBy: "provider_event_id", confidence: 90 };
    }
  }

  const founderId = await resolveFounderId(supabaseAdmin, event.inviteeEmail);
  if (!founderId) {
    return { status: "pending_review", call: null, matchedBy: "unmatched", confidence: 0, reason: "no_founder_for_email" };
  }

  const fallbackLookbackHours = Number(getEnv("DISCOVERY_CALL_WEBHOOK_LOOKBACK_HOURS", "168"));
  const lookbackHours = Number.isFinite(fallbackLookbackHours) && fallbackLookbackHours > 0
    ? fallbackLookbackHours
    : 168;
  const lookbackIso = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  let query = supabaseAdmin
    .from("discovery_calls")
    .select("id, founder_id, mentor_id, status, scheduled_for, provider_name, provider_event_id, provider_invitee_id, created_at")
    .eq("founder_id", founderId)
    .in("status", ["intent_created", "scheduled"])
    .gte("created_at", lookbackIso)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!["email", "manual", "other"].includes(event.providerName)) {
    query = query.eq("provider_name", event.providerName);
  }

  const { data, error } = await query;
  if (error) throw error;

  if (!data || data.length === 0) {
    return { status: "pending_review", call: null, matchedBy: "unmatched", confidence: 0, reason: "no_recent_intent_for_email" };
  }

  if (data.length > 1) {
    logWarn("discovery-call-provider:ambiguous-email-fallback", {
      providerName: event.providerName,
      inviteeEmail: event.inviteeEmail,
      candidateCallIds: data.map((row: DiscoveryCallRow) => row.id),
    });
    return { status: "pending_review", call: null, matchedBy: "unmatched", confidence: 30, reason: "ambiguous_recent_intent_for_email" };
  }

  return { status: "matched", call: data[0] as DiscoveryCallRow, matchedBy: "email_recent_intent", confidence: 75 };
}

async function beginProviderEventRecord(
  supabaseAdmin: SupabaseAdmin,
  event: DiscoveryCallProviderEvent,
  match: MatchResult,
) {
  const normalizedPayload = buildNormalizedPayload(event);

  if (event.providerEventId) {
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("discovery_call_provider_events")
      .select("id, match_status, processed_at, discovery_call_id")
      .eq("provider_name", event.providerName)
      .eq("provider_event_type", event.eventType)
      .eq("provider_event_id", event.providerEventId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.processed_at && existing.match_status !== "failed") {
      return { duplicate: true, eventId: existing.id as string, discoveryCallId: existing.discovery_call_id as string | null };
    }
  }

  const { data, error } = await supabaseAdmin
    .from("discovery_call_provider_events")
    .insert({
      provider_name: normalizeProviderName(event.providerName),
      provider_event_type: event.eventType,
      provider_event_id: event.providerEventId ?? null,
      provider_invitee_id: event.providerInviteeId ?? null,
      discovery_call_id: match.status === "matched" ? match.call.id : null,
      matched_by: match.status === "matched" ? match.matchedBy : "unmatched",
      match_status: match.status,
      confidence: match.confidence,
      scheduled_for: event.scheduledFor ?? null,
      meeting_url: event.meetingUrl ?? null,
      invitee_email: event.inviteeEmail ?? null,
      invitee_name: event.inviteeName ?? null,
      normalized_payload: normalizedPayload,
      raw_payload: event.rawPayload ?? {},
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" && event.providerEventId) {
      const { data: existing } = await supabaseAdmin
        .from("discovery_call_provider_events")
        .select("id, discovery_call_id")
        .eq("provider_name", event.providerName)
        .eq("provider_event_type", event.eventType)
        .eq("provider_event_id", event.providerEventId)
        .maybeSingle();

      return { duplicate: true, eventId: existing?.id as string | undefined, discoveryCallId: existing?.discovery_call_id as string | null };
    }

    throw error;
  }

  return { duplicate: false, eventId: data.id as string, discoveryCallId: null };
}

async function finishProviderEventRecord(
  supabaseAdmin: SupabaseAdmin,
  providerEventRecordId: string | undefined,
  payload: {
    matchStatus: "matched" | "pending_review" | "ignored" | "failed";
    discoveryCallId?: string | null;
    processingError?: string | null;
  },
) {
  if (!providerEventRecordId) return;

  const { error } = await supabaseAdmin
    .from("discovery_call_provider_events")
    .update({
      match_status: payload.matchStatus,
      discovery_call_id: payload.discoveryCallId ?? null,
      processing_error: payload.processingError ?? null,
      processed_at: payload.matchStatus === "pending_review" ? null : new Date().toISOString(),
    })
    .eq("id", providerEventRecordId);

  if (error) throw error;
}

function resolveCancellationStatus(call: DiscoveryCallRow, event: DiscoveryCallProviderEvent) {
  const normalizedCanceler = (event.cancelerType ?? "").toLowerCase();
  if (["host", "owner", "admin", "mentor", "organizer"].includes(normalizedCanceler)) {
    return "cancelled_early";
  }

  const scheduledFor = parseDate(call.scheduled_for ?? event.scheduledFor);
  const canceledAt = parseDate(event.canceledAt) ?? new Date();

  if (!scheduledFor) {
    return "cancelled_early";
  }

  const cutoffHoursRaw = Number(getEnv("DISCOVERY_CALL_LATE_CANCELLATION_HOURS", "24"));
  const cutoffHours = Number.isFinite(cutoffHoursRaw) && cutoffHoursRaw >= 0 ? cutoffHoursRaw : 24;
  const diffHours = (scheduledFor.getTime() - canceledAt.getTime()) / 3600000;

  return diffHours < cutoffHours ? "cancelled_late" : "cancelled_early";
}

async function invokeDiscoveryCallNotification(
  supabaseAdmin: SupabaseAdmin,
  discoveryCallId: string | null,
  eventType: string,
  providerEventRecordId?: string,
) {
  try {
    const { error } = await supabaseAdmin.functions.invoke("notify-discovery-call-event", {
      body: {
        discoveryCallId,
        eventType,
        providerEventRecordId: providerEventRecordId ?? null,
      },
    });

    if (error) {
      logWarn("discovery-call-provider:notification-failed", {
        discoveryCallId,
        eventType,
        error: error.message,
      });
    }
  } catch (error) {
    logWarn("discovery-call-provider:notification-exception", {
      discoveryCallId,
      eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleBookingCreatedOrRescheduled(
  supabaseAdmin: SupabaseAdmin,
  event: DiscoveryCallProviderEvent,
  call: DiscoveryCallRow,
  providerEventRecordId?: string,
) {
  if (!event.scheduledFor) {
    await finishProviderEventRecord(supabaseAdmin, providerEventRecordId, {
      matchStatus: "pending_review",
      discoveryCallId: call.id,
      processingError: "scheduled_for_missing",
    });
    return { ok: true, action: "pending_review", callId: call.id, reason: "scheduled_for_missing" };
  }

  if (event.eventType === "booking_rescheduled" && call.status === "scheduled") {
    const updatePayload: Record<string, unknown> = {
      scheduled_for: event.scheduledFor,
      duration_minutes: computeDurationMinutes(event.scheduledFor, event.scheduledUntil),
      provider_name: event.providerName,
    };

    if (event.meetingUrl) updatePayload.meeting_url = event.meetingUrl;
    if (event.providerEventId) updatePayload.provider_event_id = event.providerEventId;
    if (event.providerInviteeId) updatePayload.provider_invitee_id = event.providerInviteeId;

    const { error: updateError } = await supabaseAdmin
      .from("discovery_calls")
      .update(updatePayload)
      .eq("id", call.id);

    if (updateError) throw updateError;

    await supabaseAdmin.rpc("log_discovery_call_event", {
      p_discovery_call_id: call.id,
      p_event_type: "rescheduled",
      p_actor_user_id: call.founder_id,
      p_payload: {
        scheduledFor: event.scheduledFor,
        providerName: event.providerName,
        providerEventRecordId: providerEventRecordId ?? null,
      },
    });

    await finishProviderEventRecord(supabaseAdmin, providerEventRecordId, {
      matchStatus: "matched",
      discoveryCallId: call.id,
    });
    await invokeDiscoveryCallNotification(supabaseAdmin, call.id, "rescheduled", providerEventRecordId);
    return { ok: true, action: "rescheduled", callId: call.id };
  }

  const { data, error } = await supabaseAdmin.rpc("finalize_discovery_call_booking", {
    p_call_id: call.id,
    p_scheduled_for: event.scheduledFor,
    p_duration_minutes: computeDurationMinutes(event.scheduledFor, event.scheduledUntil),
    p_provider_name: event.providerName,
    p_provider_event_id: event.providerEventId ?? null,
    p_provider_invitee_id: event.providerInviteeId ?? null,
    p_meeting_url: event.meetingUrl ?? null,
    p_metadata: {
      providerEvent: buildNormalizedPayload(event),
      providerEventRecordId: providerEventRecordId ?? null,
      ...(event.metadata ?? {}),
    },
  });

  if (error) throw error;

  if (!data?.success) {
    await finishProviderEventRecord(supabaseAdmin, providerEventRecordId, {
      matchStatus: "failed",
      discoveryCallId: call.id,
      processingError: data?.error ?? "finalize_failed",
    });
    return { ok: false, action: "failed", callId: call.id, error: data?.error ?? "Unable to finalize booking" };
  }

  await finishProviderEventRecord(supabaseAdmin, providerEventRecordId, {
    matchStatus: "matched",
    discoveryCallId: call.id,
  });

  // Surface auto-confirmed (provider/email/admin) discovery-call charges in the
  // same credit_action_completed taxonomy as every other spend. This path charges
  // inside finalize_discovery_call_booking (SQL) and otherwise bypasses the event.
  const chargedCredits = Number(data?.chargedCredits ?? 0);
  if (chargedCredits > 0) {
    await emitBusinessEvent({
      eventName: "credit_action_completed",
      userId: call.founder_id,
      properties: {
        feature_key: "DISCOVERY_CALL",
        credit_cost: chargedCredits,
        source_tool: "discovery_call",
        operation_id: call.id,
      },
    });
  }

  await invokeDiscoveryCallNotification(supabaseAdmin, call.id, "scheduled", providerEventRecordId);
  return { ok: true, action: "finalized", callId: call.id, result: data };
}

async function handleBookingCancelled(
  supabaseAdmin: SupabaseAdmin,
  event: DiscoveryCallProviderEvent,
  call: DiscoveryCallRow,
  providerEventRecordId?: string,
) {
  const nextStatus = resolveCancellationStatus(call, event);
  const { data, error } = await supabaseAdmin.rpc("update_discovery_call_status", {
    p_call_id: call.id,
    p_new_status: nextStatus,
    p_actor_user_id: call.founder_id,
    p_reason: event.cancellationReason ?? null,
    p_metadata: {
      providerEvent: buildNormalizedPayload(event),
      providerEventRecordId: providerEventRecordId ?? null,
      providerCancelerType: event.cancelerType ?? null,
      providerCanceledAt: event.canceledAt ?? null,
      ...(event.metadata ?? {}),
    },
  });

  if (error) throw error;

  if (!data?.success) {
    await finishProviderEventRecord(supabaseAdmin, providerEventRecordId, {
      matchStatus: "failed",
      discoveryCallId: call.id,
      processingError: data?.error ?? "status_update_failed",
    });
    return { ok: false, action: "failed", callId: call.id, error: data?.error ?? "Unable to update booking status" };
  }

  await finishProviderEventRecord(supabaseAdmin, providerEventRecordId, {
    matchStatus: "matched",
    discoveryCallId: call.id,
  });
  await invokeDiscoveryCallNotification(supabaseAdmin, call.id, nextStatus, providerEventRecordId);
  return { ok: true, action: "status_updated", callId: call.id, status: nextStatus, result: data };
}

export async function processDiscoveryCallProviderEvent(
  supabaseAdmin: SupabaseAdmin,
  event: DiscoveryCallProviderEvent,
) {
  logInfo("discovery-call-provider:received", {
    providerName: event.providerName,
    eventType: event.eventType,
    discoveryCallId: event.discoveryCallId,
    providerEventId: event.providerEventId,
    providerInviteeId: event.providerInviteeId,
    inviteeEmail: event.inviteeEmail,
  });

  const match = await resolveDiscoveryCall(supabaseAdmin, event);
  const providerEventRecord = await beginProviderEventRecord(supabaseAdmin, event, match);

  if (providerEventRecord.duplicate) {
    return {
      ok: true,
      action: "ignored",
      reason: "duplicate_provider_event",
      providerEventRecordId: providerEventRecord.eventId,
      callId: providerEventRecord.discoveryCallId,
    };
  }

  if (event.eventType === "ignored") {
    await finishProviderEventRecord(supabaseAdmin, providerEventRecord.eventId, {
      matchStatus: "ignored",
      discoveryCallId: match.status === "matched" ? match.call.id : null,
    });
    return { ok: true, action: "ignored", providerEventRecordId: providerEventRecord.eventId };
  }

  if (match.status === "pending_review") {
    await finishProviderEventRecord(supabaseAdmin, providerEventRecord.eventId, {
      matchStatus: "pending_review",
      discoveryCallId: null,
      processingError: match.reason,
    });
    await invokeDiscoveryCallNotification(supabaseAdmin, null, "pending_review", providerEventRecord.eventId);
    return {
      ok: true,
      action: "pending_review",
      reason: match.reason,
      providerEventRecordId: providerEventRecord.eventId,
    };
  }

  if (event.eventType === "booking_cancelled") {
    return handleBookingCancelled(supabaseAdmin, event, match.call, providerEventRecord.eventId);
  }

  return handleBookingCreatedOrRescheduled(supabaseAdmin, event, match.call, providerEventRecord.eventId);
}
