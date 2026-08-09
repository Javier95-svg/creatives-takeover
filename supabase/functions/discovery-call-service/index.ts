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
    return rpcResponse(data, error);
  }

  if (action === "getAvailability") {
    const mentorId = String(body.mentorId ?? "");
    const [{ data: available, error: availabilityError }, { data: quota, error: quotaError }] = await Promise.all([
      admin.rpc("get_mentor_discovery_call_availability", { p_mentor_id: mentorId }),
      admin.rpc("get_discovery_call_quota_status", { p_user_id: user.id }),
    ]);
    if (availabilityError || quotaError) return json({ success: false, error: availabilityError?.message ?? quotaError?.message }, 500);
    return json({
      success: true,
      featureEnabled: isDiscoveryCallV2Enabled(),
      available: Boolean(available) && isDiscoveryCallV2Enabled(),
      creditCost: 10,
      durationMinutes: 30,
      quotaStatus: quota,
    });
  }

  if (action === "createRequest") {
    if (!isDiscoveryCallV2Enabled()) return json({ success: false, errorCode: "FEATURE_DISABLED", error: "Discovery Call requests are not enabled yet." }, 409);
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
      .select("id, mentor_id, mentor_name_snapshot, service_id, service_name_snapshot, status, workflow_version, request_topic, desired_outcome, founder_notes, founder_timezone, response_due_at, scheduled_for, duration_minutes, meeting_url, meeting_instructions, credit_charge_amount, credits_charged, credits_refunded, cancelled_at, cancelled_reason, calendar_sequence, created_at, updated_at")
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
        rounds: roundMap.get(call.id) ?? [],
        reservation: reservationMap.get(call.id) ?? null,
        createdAt: call.created_at,
        updatedAt: call.updated_at,
      })),
    });
  }

  if (action === "acceptMentorCounter" || action === "declineMentorCounter") {
    const token = action === "acceptMentorCounter" ? await actionToken() : null;
    const { data, error } = await admin.rpc("respond_to_discovery_call_counter_v2", {
      p_call_id: String(body.callId ?? ""),
      p_founder_id: user.id,
      p_action: action === "acceptMentorCounter" ? "accept" : "decline",
      p_management_token_hash: token?.hash ?? null,
      p_management_token_ciphertext: token?.ciphertext ?? null,
    });
    if (data?.success) void invokeNotificationWorker();
    return rpcResponse(data, error);
  }

  if (action === "withdrawRequest") {
    const { data, error } = await admin.rpc("withdraw_discovery_call_request_v2", { p_call_id: String(body.callId ?? ""), p_founder_id: user.id });
    if (data?.success) void invokeNotificationWorker();
    return rpcResponse(data, error);
  }

  if (action === "cancel") {
    const { data, error } = await admin.rpc("cancel_discovery_call_v2", {
      p_call_id: String(body.callId ?? ""), p_actor_user_id: user.id,
      p_actor_role: "founder", p_reason: String(body.reason ?? "Founder cancellation"), p_force_refund: false,
    });
    if (data?.success) void invokeNotificationWorker();
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
    const { data, error } = await admin.rpc("respond_to_discovery_call_reschedule_v2", {
      p_call_id: String(body.callId ?? ""), p_actor_user_id: user.id, p_actor_role: "founder",
      p_action: String(body.response ?? ""), p_slot_id: body.slotId ?? null,
      p_counter_starts_at: body.counterStartsAt ?? null, p_meeting_url: body.meetingUrl ?? null,
      p_meeting_instructions: body.meetingInstructions ?? null,
      p_management_token_hash: token?.hash ?? null,
      p_management_token_ciphertext: token?.ciphertext ?? null,
    });
    if (data?.success) void invokeNotificationWorker();
    return rpcResponse(data, error);
  }

  if (["getAdminSettings", "updateAdminSettings", "listAdminCalls", "adminOverride", "resendNotification"].includes(action) && !isAdmin) {
    return json({ success: false, errorCode: "FORBIDDEN", error: "Admin access required" }, 403);
  }

  if (action === "getAdminSettings") {
    const { data, error } = await admin.from("mentor_discovery_call_settings").select("mentor_id, notification_email, discovery_calls_enabled, legacy_provider, legacy_booking_url, updated_at").eq("mentor_id", String(body.mentorId ?? "")).maybeSingle();
    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, settings: data });
  }

  if (action === "updateAdminSettings") {
    const notificationEmail = String(body.notificationEmail ?? "").trim().toLowerCase();
    const enabled = Boolean(body.discoveryCallsEnabled);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail) || (enabled && !notificationEmail)) {
      return json({ success: false, errorCode: "INVALID_REQUEST", error: "A valid notification email is required." }, 422);
    }
    const { data, error } = await admin.from("mentor_discovery_call_settings").upsert({
      mentor_id: String(body.mentorId ?? ""), notification_email: notificationEmail,
      discovery_calls_enabled: enabled,
      legacy_provider: body.legacyProvider || null, legacy_booking_url: body.legacyBookingUrl || null,
    }).select().single();
    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, settings: data });
  }

  if (action === "listAdminCalls") {
    const [{ data: calls, error }, { data: health }, { data: outbox }, { data: events }, { data: rounds }, { data: reservations }] = await Promise.all([
      admin.from("discovery_calls").select("*").eq("workflow_version", 2).order("created_at", { ascending: false }).limit(250),
      admin.from("admin_discovery_call_workflow_health").select("*"),
      admin.from("discovery_call_notification_outbox").select("id, discovery_call_id, template_key, recipient_role, recipient_email, status, attempt_count, max_attempts, last_error, next_attempt_at, sent_at, created_at").order("created_at", { ascending: false }).limit(500),
      admin.from("discovery_call_events").select("id, discovery_call_id, event_type, actor_user_id, payload, created_at").order("created_at", { ascending: false }).limit(1000),
      admin.from("discovery_call_scheduling_rounds").select("*, discovery_call_scheduling_slots(*)").order("created_at", { ascending: false }).limit(500),
      admin.from("discovery_call_credit_reservations").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    if (error) return json({ success: false, error: error.message }, 500);
    return json({ success: true, calls: calls ?? [], health: health ?? [], notifications: outbox ?? [], events: events ?? [], rounds: rounds ?? [], reservations: reservations ?? [] });
  }

  if (action === "adminOverride") {
    const { data, error } = await admin.rpc("admin_update_discovery_call_outcome_v2", {
      p_call_id: String(body.callId ?? ""), p_admin_user_id: user.id,
      p_action: String(body.overrideAction ?? ""), p_reason: String(body.reason ?? ""),
      p_scheduled_for: body.scheduledFor ?? null, p_meeting_url: body.meetingUrl ?? null,
      p_meeting_instructions: body.meetingInstructions ?? null,
    });
    if (data?.success) void invokeNotificationWorker();
    return rpcResponse(data, error);
  }

  if (action === "resendNotification") {
    const { error } = await admin.from("discovery_call_notification_outbox").update({ status: "pending", attempt_count: 0, next_attempt_at: new Date().toISOString(), last_error: null }).eq("id", String(body.notificationId ?? ""));
    if (error) return json({ success: false, error: error.message }, 500);
    void invokeNotificationWorker();
    return json({ success: true });
  }

  return json({ success: false, errorCode: "INVALID_REQUEST", error: "Unsupported Discovery Call action" }, 400);
});
