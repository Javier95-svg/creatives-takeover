import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  discoveryCallCorsHeaders,
  encryptDiscoveryCallToken,
  env,
  errorStatus,
  generateDiscoveryCallToken,
  hashDiscoveryCallToken,
  isDiscoveryCallV2Enabled,
  json,
} from "../_shared/discovery-call-v2.ts";

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

type Body = Record<string, unknown>;

async function actionToken() {
  const raw = generateDiscoveryCallToken();
  return {
    raw,
    hash: await hashDiscoveryCallToken(raw),
    ciphertext: await encryptDiscoveryCallToken(raw),
  };
}

async function invokeNotificationWorker() {
  await admin.functions.invoke("process-discovery-call-notifications", {
    body: { limit: 50 },
    headers: { Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).catch(() => undefined);
}

async function invokeCalendarWorker() {
  await admin.functions.invoke("process-discovery-call-calendar-events", {
    body: { limit: 25 },
    headers: { Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).catch(() => undefined);
}

function rpcResponse(data: Record<string, unknown> | null, error: { message: string } | null) {
  if (error) return json({ success: false, error: error.message }, 500);
  const result = data ?? { success: false, errorCode: "UNKNOWN_ERROR" };
  return json(result, result.success === false ? errorStatus(String(result.errorCode ?? "")) : 200);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: discoveryCallCorsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const { data: authData, error: authError } = await admin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
  const user = authData.user;
  if (authError || !user) return json({ success: false, error: "Authentication required" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const action = typeof body.action === "string" ? body.action : "";
  const isAdmin = user.email?.toLowerCase() === "admin@creatives-takeover.com";

  if (["createIntent", "confirmBooking", "finalizeBooking", "manualConfirmBooking"].includes(action)) {
    return json({ success: false, errorCode: "FEATURE_RETIRED", error: "This provider-based booking action has been retired." }, 410);
  }

  if (action === "getQuotaStatus") {
    const { data, error } = await admin.rpc("get_discovery_call_quota_status", { p_user_id: user.id });
    /*
     * Report the feature flag alongside the quota.
     *
     * Whether Discovery Calls are switched on lives in an edge env var
     * (DISCOVERY_CALL_REQUESTS_V2_ENABLED), while the per-mentor bookable flag
     * comes from a database function that cannot see it. The mentor list and
     * profile only read the database flag, so with the feature off they render
     * an enabled "Request Discovery Call" button that lands on a page refusing
     * the booking. Four founders hit that dead end after the V2 rollout, one of
     * them reloading the same booking page seven times.
     *
     * getAvailability already returns featureEnabled, but it is per-mentor and
     * far too heavy for a list. Attaching it here gives the browse surfaces one
     * cheap, cacheable source of truth.
     */
    if (error) return rpcResponse(data, error);
    return rpcResponse({ ...(data ?? {}), featureEnabled: isDiscoveryCallV2Enabled() }, null);
  }

  if (action === "getAvailability") {
    const mentorId = String(body.mentorId ?? "");
    const from = typeof body.from === "string" ? body.from : new Date().toISOString();
    const to = typeof body.to === "string" ? body.to : new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
    const [{ data: available, error: availabilityError }, { data: quota, error: quotaError }, { data: slotData, error: slotsError }] = await Promise.all([
      admin.rpc("get_mentor_discovery_call_availability", { p_mentor_id: mentorId }),
      admin.rpc("get_discovery_call_quota_status", { p_user_id: user.id }),
      admin.rpc("get_mentor_discovery_slots_v4", { p_mentor_id: mentorId, p_from: from, p_to: to }),
    ]);
    if (availabilityError || quotaError || slotsError) return json({ success: false, error: availabilityError?.message ?? quotaError?.message ?? slotsError?.message }, 500);
    return json({
      success: true,
      featureEnabled: isDiscoveryCallV2Enabled(),
      available: Boolean(available) && isDiscoveryCallV2Enabled(),
      creditCost: 10,
      durationMinutes: 30,
      quotaStatus: quota,
      bookingMode: slotData?.bookingMode ?? "request",
      allowRequestFallback: slotData?.allowRequestFallback !== false,
      mentorTimezone: slotData?.timezone ?? "UTC",
      slots: slotData?.slots ?? [],
    });
  }

  if (action === "createInstantBooking") {
    if (!isDiscoveryCallV2Enabled()) return json({ success: false, errorCode: "FEATURE_DISABLED", error: "Discovery Calls are not enabled yet." }, 409);
    const token = await actionToken();
    const { data, error } = await admin.rpc("create_discovery_call_instant_booking_v4", {
      p_founder_id: user.id,
      p_mentor_id: String(body.mentorId ?? ""),
      p_idempotency_key: String(body.idempotencyKey ?? ""),
      p_topic: String(body.topic ?? ""),
      p_desired_outcome: String(body.desiredOutcome ?? ""),
      p_notes: typeof body.notes === "string" ? body.notes : null,
      p_timezone: String(body.timezone ?? "UTC"),
      p_starts_at: String(body.startsAt ?? ""),
      p_management_token_hash: token.hash,
      p_management_token_ciphertext: token.ciphertext,
    });
    if (data?.success) void invokeCalendarWorker();
    return rpcResponse(data, error);
  }

  if (action === "createRequest") {
    if (!isDiscoveryCallV2Enabled()) return json({ success: false, errorCode: "FEATURE_DISABLED", error: "Discovery Call requests are not enabled yet." }, 409);
    const { data: requestSettings, error: requestSettingsError } = await admin.from("mentor_discovery_call_settings")
      .select("booking_mode, allow_request_fallback").eq("mentor_id", String(body.mentorId ?? "")).maybeSingle();
    if (requestSettingsError) return json({ success: false, error: requestSettingsError.message }, 500);
    if (requestSettings?.booking_mode === "instant" && requestSettings.allow_request_fallback === false) {
      return json({ success: false, errorCode: "MENTOR_UNAVAILABLE", error: "This mentor accepts only published instant-booking times." }, 409);
    }
    const token = await actionToken();
    const slots = Array.isArray(body.slots)
      ? body.slots.map((slot) => typeof slot === "object" && slot && "startsAt" in slot ? String((slot as { startsAt: unknown }).startsAt) : String(slot))
      : [];
    const { data, error } = await admin.rpc("create_discovery_call_request_v2", {
      p_founder_id: user.id,
      p_mentor_id: String(body.mentorId ?? ""),
      p_idempotency_key: String(body.idempotencyKey ?? ""),
      p_topic: String(body.topic ?? ""),
      p_desired_outcome: String(body.desiredOutcome ?? ""),
      p_notes: typeof body.notes === "string" ? body.notes : null,
      p_timezone: String(body.timezone ?? "UTC"),
      p_slots: slots,
      p_token_hash: token.hash,
      p_token_ciphertext: token.ciphertext,
    });
    if (data?.success) void invokeNotificationWorker();
    return rpcResponse(data, error);
  }

  if (action === "listMine") {
    const { data: calls, error } = await admin
      .from("discovery_calls")
      .select("id, mentor_id, mentor_name_snapshot, service_id, service_name_snapshot, status, workflow_version, request_topic, desired_outcome, founder_notes, founder_timezone, response_due_at, scheduled_for, duration_minutes, meeting_url, meeting_instructions, credit_charge_amount, credits_charged, credits_refunded, cancelled_at, cancelled_reason, calendar_sequence, meeting_provider, calendar_provider, meeting_creation_status, external_calendar_html_url, calendar_error, created_at, updated_at")
      .eq("founder_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return json({ success: false, error: error.message }, 500);
    const callIds = (calls ?? []).map((call) => call.id);
    const mentorIds = [...new Set((calls ?? []).map((call) => call.mentor_id).filter(Boolean))];
    const [{ data: rounds }, { data: reservations }, { data: mentors }] = await Promise.all([
      callIds.length ? admin.from("discovery_call_scheduling_rounds").select("id, discovery_call_id, round_type, proposer_role, responder_role, status, counter_depth, response_due_at, meeting_url, meeting_instructions, accepted_slot_id, created_at, discovery_call_scheduling_slots(id, ordinal, starts_at, duration_minutes, proposed_timezone)").in("discovery_call_id", callIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      callIds.length ? admin.from("discovery_call_credit_reservations").select("discovery_call_id, status, held_amount, credit_transaction_id, refund_transaction_id, expires_at, metadata").in("discovery_call_id", callIds) : Promise.resolve({ data: [] }),
      mentorIds.length ? admin.from("mentors").select("id, picture").in("id", mentorIds) : Promise.resolve({ data: [] }),
    ]);
    const roundMap = new Map<string, unknown[]>();
    for (const round of rounds ?? []) roundMap.set(round.discovery_call_id, [...(roundMap.get(round.discovery_call_id) ?? []), round]);
    const reservationMap = new Map((reservations ?? []).map((row) => [row.discovery_call_id, row]));
    const mentorMap = new Map((mentors ?? []).map((row) => [row.id, row.picture]));
    return json({
      success: true,
      bookings: (calls ?? []).map((call) => ({
        id: call.id,
        bookingContext: call.service_id ? "service" : "mentor",
        mentorId: call.mentor_id,
        mentorName: call.service_name_snapshot || call.mentor_name_snapshot,
        mentorPicture: call.mentor_id ? mentorMap.get(call.mentor_id) ?? null : null,
        status: call.status,
        workflowVersion: call.workflow_version,
        topic: call.request_topic,
        desiredOutcome: call.desired_outcome,
        notes: call.founder_notes,
        founderTimezone: call.founder_timezone,
        responseDueAt: call.response_due_at,
        scheduledFor: call.scheduled_for,
        durationMinutes: call.duration_minutes,
        meetingUrl: call.meeting_url,
        meetingInstructions: call.meeting_instructions,
        creditChargeAmount: call.credit_charge_amount,
        creditsCharged: call.credits_charged,
        creditsRefunded: call.credits_refunded,
        cancelledAt: call.cancelled_at,
        cancelledReason: call.cancelled_reason,
        calendarSequence: call.calendar_sequence,
        meetingProvider: call.meeting_provider,
        calendarProvider: call.calendar_provider,
        meetingCreationStatus: call.meeting_creation_status,
        externalCalendarHtmlUrl: call.external_calendar_html_url,
        calendarError: call.calendar_error,
        rounds: roundMap.get(call.id) ?? [],
        reservation: reservationMap.get(call.id) ?? null,
        createdAt: call.created_at,
        updatedAt: call.updated_at,
      })),
    });
  }

  if (action === "acceptMentorCounter" || action === "declineMentorCounter") {
    const token = action === "acceptMentorCounter" ? await actionToken() : null;
    const { data, error } = await admin.rpc("respond_to_discovery_call_counter_v4", {
      p_call_id: String(body.callId ?? ""),
      p_founder_id: user.id,
      p_action: action === "acceptMentorCounter" ? "accept" : "decline",
      p_management_token_hash: token?.hash ?? null,
      p_management_token_ciphertext: token?.ciphertext ?? null,
    });
    if (data?.success) {
      if (action === "acceptMentorCounter") void invokeCalendarWorker();
      void invokeNotificationWorker();
    }
    return rpcResponse(data, error);
  }

  if (action === "withdrawRequest") {
    const { data, error } = await admin.rpc("withdraw_discovery_call_request_v2", { p_call_id: String(body.callId ?? ""), p_founder_id: user.id });
    if (data?.success) void invokeNotificationWorker();
    return rpcResponse(data, error);
  }

  if (action === "cancel") {
    const { data, error } = await admin.rpc("cancel_discovery_call_v4", {
      p_call_id: String(body.callId ?? ""), p_actor_user_id: user.id,
      p_actor_role: "founder", p_reason: String(body.reason ?? "Founder cancellation"), p_force_refund: false,
    });
    if (data?.success) { void invokeNotificationWorker(); void invokeCalendarWorker(); }
    return rpcResponse(data, error);
  }

  if (action === "createReschedule") {
    const slots = Array.isArray(body.slots) ? body.slots.map(String) : [];
    const token = await actionToken();
    const { data, error } = await admin.rpc("create_discovery_call_reschedule_v2", {
      p_call_id: String(body.callId ?? ""), p_actor_user_id: user.id,
      p_proposer_role: "founder", p_timezone: String(body.timezone ?? "UTC"), p_slots: slots,
      p_management_token_hash: token.hash,
      p_management_token_ciphertext: token.ciphertext,
    });
    if (data?.success) void invokeNotificationWorker();
    return rpcResponse(data, error);
  }

  if (action === "respondToReschedule") {
    const token = body.response === "accept" ? await actionToken() : null;
    const { data, error } = await admin.rpc("respond_to_discovery_call_reschedule_v4", {
      p_call_id: String(body.callId ?? ""), p_actor_user_id: user.id, p_actor_role: "founder",
      p_action: String(body.response ?? ""), p_slot_id: body.slotId ?? null,
      p_counter_starts_at: body.counterStartsAt ?? null,
      p_management_token_hash: token?.hash ?? null,
      p_management_token_ciphertext: token?.ciphertext ?? null,
    });
    if (data?.success) { void invokeNotificationWorker(); if (body.response === "accept") void invokeCalendarWorker(); }
    return rpcResponse(data, error);
  }

  if (["getAdminSettings", "updateAdminSettings", "createMentorAvailabilityAccess", "listAdminCalls", "adminOverride", "resendNotification", "retryCalendarOperation"].includes(action) && !isAdmin) {
    return json({ success: false, errorCode: "FORBIDDEN", error: "Admin access required" }, 403);
  }

  if (action === "getAdminSettings") {
    const mentorId = String(body.mentorId ?? "");
    const [{ data, error }, { data: rules }, { data: exceptions }, { data: connection }] = await Promise.all([
      admin.from("mentor_discovery_call_settings").select("mentor_id, notification_email, discovery_calls_enabled, booking_mode, scheduling_timezone, minimum_notice_hours, booking_window_days, buffer_minutes, allow_request_fallback, legacy_provider, legacy_booking_url, updated_at").eq("mentor_id", mentorId).maybeSingle(),
      admin.from("mentor_discovery_availability_rules").select("id, weekday, start_local_time, end_local_time, enabled, effective_from, effective_until").eq("mentor_id", mentorId).order("weekday"),
      admin.from("mentor_discovery_availability_exceptions").select("id, exception_type, starts_at, ends_at, reason").eq("mentor_id", mentorId).gte("ends_at", new Date().toISOString()).order("starts_at"),
      admin.from("mentor_calendar_connections").select("status, google_account_email, last_synced_at, next_sync_at, last_error").eq("mentor_id", mentorId).maybeSingle(),
    ]);
    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, settings: data ? { ...data, availability_rules: rules ?? [], availability_exceptions: exceptions ?? [], calendar_connection: connection ?? null } : null });
  }

  if (action === "updateAdminSettings") {
    const notificationEmail = String(body.notificationEmail ?? "").trim().toLowerCase();
    const enabled = Boolean(body.discoveryCallsEnabled);
    const schedulingTimezone = String(body.schedulingTimezone ?? "UTC");
    const minimumNoticeHours = Number(body.minimumNoticeHours ?? 72);
    const bookingWindowDays = Number(body.bookingWindowDays ?? 60);
    const bufferMinutes = Number(body.bufferMinutes ?? 0);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail) || (enabled && !notificationEmail)) {
      return json({ success: false, errorCode: "INVALID_REQUEST", error: "A valid notification email is required." }, 422);
    }
    try { new Intl.DateTimeFormat("en", { timeZone: schedulingTimezone }).format(); }
    catch { return json({ success: false, errorCode: "INVALID_TIMEZONE", error: "Use a valid IANA timezone." }, 422); }
    if (!Number.isInteger(minimumNoticeHours) || minimumNoticeHours < 1 || minimumNoticeHours > 720
      || !Number.isInteger(bookingWindowDays) || bookingWindowDays < 1 || bookingWindowDays > 60
      || !Number.isInteger(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 120) {
      return json({ success: false, errorCode: "INVALID_AVAILABILITY", error: "Scheduling limits are invalid." }, 422);
    }
    const bookingMode = ["request", "instant", "hybrid"].includes(String(body.bookingMode)) ? String(body.bookingMode) : "request";
    const { data: saved, error } = await admin.rpc("save_mentor_discovery_settings_v4", {
      p_mentor_id: String(body.mentorId ?? ""),
      p_notification_email: notificationEmail,
      p_discovery_calls_enabled: enabled,
      p_booking_mode: bookingMode,
      p_scheduling_timezone: schedulingTimezone,
      p_minimum_notice_hours: minimumNoticeHours,
      p_booking_window_days: bookingWindowDays,
      p_buffer_minutes: bufferMinutes,
      p_allow_request_fallback: body.allowRequestFallback !== false,
      p_legacy_provider: body.legacyProvider || null,
      p_legacy_booking_url: body.legacyBookingUrl || null,
      p_rules: Array.isArray(body.availabilityRules) ? body.availabilityRules : [],
    });
    if (error) return json({ success: false, error: error.message }, 500);
    if (!saved?.success) return json(saved, errorStatus(saved?.errorCode));
    const { data: settings, error: readError } = await admin.from("mentor_discovery_call_settings")
      .select("mentor_id, notification_email, discovery_calls_enabled, booking_mode, scheduling_timezone, minimum_notice_hours, booking_window_days, buffer_minutes, allow_request_fallback, legacy_provider, legacy_booking_url, updated_at")
      .eq("mentor_id", String(body.mentorId ?? "")).single();
    return readError ? json({ success: false, error: readError.message }, 500) : json({ success: true, settings });
  }

  if (action === "createMentorAvailabilityAccess") {
    const token = await actionToken();
    const mentorId = String(body.mentorId ?? "");
    await admin.from("mentor_availability_access_tokens").update({ revoked_at: new Date().toISOString() }).eq("mentor_id", mentorId).is("revoked_at", null);
    const { error } = await admin.from("mentor_availability_access_tokens").insert({
      mentor_id: mentorId, token_hash: token.hash,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(),
    });
    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, url: `${env("APP_URL").replace(/\/$/, "")}/mentorship/calls/availability#token=${encodeURIComponent(token.raw)}` });
  }

  if (action === "listAdminCalls") {
    const [{ data: calls, error }, { data: health, error: healthError }, { data: outbox, error: outboxError }, { data: alerts, error: alertsError }, { data: events, error: eventsError }, { data: rounds, error: roundsError }, { data: reservations, error: reservationsError }, { data: calendarJobs, error: calendarJobsError }] = await Promise.all([
      admin.from("discovery_calls").select("*").eq("workflow_version", 2).order("created_at", { ascending: false }).limit(250),
      admin.from("admin_discovery_call_workflow_health").select("*"),
      admin.from("discovery_call_notification_outbox").select("id, discovery_call_id, template_key, recipient_role, recipient_email, status, send_generation, attempt_count, max_attempts, last_error, next_attempt_at, sent_at, provider_message_id, provider_delivery_status, provider_event_at, delivered_at, delivery_delayed_at, bounced_at, complained_at, suppressed_at, provider_last_error, created_at").order("created_at", { ascending: false }).limit(500),
      admin.from("discovery_call_notification_alerts").select("id, discovery_call_id, outbox_id, severity, alert_type, message, status, metadata, created_at, resolved_at").order("created_at", { ascending: false }).limit(500),
      admin.from("discovery_call_events").select("id, discovery_call_id, event_type, actor_user_id, payload, created_at").order("created_at", { ascending: false }).limit(1000),
      admin.from("discovery_call_scheduling_rounds").select("*, discovery_call_scheduling_slots(*)").order("created_at", { ascending: false }).limit(500),
      admin.from("discovery_call_credit_reservations").select("*").order("created_at", { ascending: false }).limit(500),
      admin.from("discovery_call_calendar_outbox").select("id, discovery_call_id, operation, sequence, status, attempt_count, max_attempts, next_attempt_at, external_event_id, last_error, created_at, completed_at").order("created_at", { ascending: false }).limit(500),
    ]);
    const adminReadError = error ?? healthError ?? outboxError ?? alertsError ?? eventsError ?? roundsError ?? reservationsError ?? calendarJobsError;
    if (adminReadError) return json({ success: false, error: adminReadError.message }, 500);
    return json({ success: true, calls: calls ?? [], health: health ?? [], notifications: outbox ?? [], notificationAlerts: alerts ?? [], events: events ?? [], rounds: rounds ?? [], reservations: reservations ?? [], calendarJobs: calendarJobs ?? [] });
  }

  if (action === "adminOverride") {
    const { data, error } = await admin.rpc("admin_update_discovery_call_outcome_v4", {
      p_call_id: String(body.callId ?? ""), p_admin_user_id: user.id,
      p_action: String(body.overrideAction ?? ""), p_reason: String(body.reason ?? ""),
      p_scheduled_for: body.scheduledFor ?? null, p_meeting_url: body.meetingUrl ?? null,
      p_meeting_instructions: body.meetingInstructions ?? null,
    });
    if (data?.success) { void invokeNotificationWorker(); void invokeCalendarWorker(); }
    return rpcResponse(data, error);
  }

  if (action === "resendNotification") {
    const { data, error } = await admin.rpc("retry_discovery_call_notification_v3", {
      p_outbox_id: String(body.notificationId ?? ""),
      p_admin_user_id: user.id,
    });
    if (error) return json({ success: false, error: error.message }, 500);
    if (!data?.success) return rpcResponse(data, null);
    void invokeNotificationWorker();
    return json({ success: true });
  }

  if (action === "retryCalendarOperation") {
    const { data, error } = await admin.rpc("retry_discovery_call_calendar_job_v4", {
      p_job_id: String(body.calendarJobId ?? ""), p_admin_user_id: user.id,
    });
    if (error) return json({ success: false, error: error.message }, 500);
    if (!data?.success) return rpcResponse(data, null);
    void invokeCalendarWorker();
    return json({ success: true });
  }

  return json({ success: false, errorCode: "INVALID_REQUEST", error: "Unsupported Discovery Call action" }, 400);
});
