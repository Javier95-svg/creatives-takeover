import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  discoveryCallCorsHeaders,
  encryptDiscoveryCallToken,
  env,
  errorStatus,
  generateDiscoveryCallToken,
  hashDiscoveryCallToken,
  json,
} from "../_shared/discovery-call-v2.ts";

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

type Body = Record<string, unknown>;

async function managementToken() {
  const raw = generateDiscoveryCallToken();
  return { hash: await hashDiscoveryCallToken(raw), ciphertext: await encryptDiscoveryCallToken(raw) };
}

async function rateLimited(req: Request, tokenHash: string) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const ipHash = await hashDiscoveryCallToken(ip);
  const bucketKey = `${tokenHash}:${ipHash}`;
  const { data } = await admin.from("discovery_call_portal_rate_limits").select("request_count, window_started_at").eq("bucket_key", bucketKey).maybeSingle();
  const windowExpired = !data || Date.parse(data.window_started_at) < Date.now() - 15 * 60_000;
  const count = windowExpired ? 1 : Number(data.request_count) + 1;
  await admin.from("discovery_call_portal_rate_limits").upsert({
    bucket_key: bucketKey, request_count: count,
    window_started_at: windowExpired ? new Date().toISOString() : data?.window_started_at,
    updated_at: new Date().toISOString(),
  });
  return count > 60;
}

async function wakeWorker() {
  await admin.functions.invoke("process-discovery-call-notifications", {
    body: { limit: 50 }, headers: { Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).catch(() => undefined);
}

async function wakeCalendarWorker() {
  await admin.functions.invoke("process-discovery-call-calendar-events", {
    body: { limit: 25 }, headers: { Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}` },
  }).catch(() => undefined);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: discoveryCallCorsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405, { "Cache-Control": "no-store" });
  const body = await req.json().catch(() => ({})) as Body;
  const rawToken = typeof body.token === "string" ? body.token : "";
  if (rawToken.length < 40 || rawToken.length > 200) return json({ success: false, errorCode: "TOKEN_INVALID" }, 404, { "Cache-Control": "no-store" });
  const tokenHash = await hashDiscoveryCallToken(rawToken);
  if (await rateLimited(req, tokenHash)) return json({ success: false, errorCode: "RATE_LIMITED" }, 429, { "Cache-Control": "no-store" });

  const { data: tokenRow, error: tokenError } = await admin.from("discovery_call_action_tokens")
    .select("id, discovery_call_id, round_id, purpose, expires_at, used_at, revoked_at")
    .eq("token_hash", tokenHash).maybeSingle();
  if (tokenError || !tokenRow || tokenRow.revoked_at) return json({ success: false, errorCode: "TOKEN_INVALID" }, 404, { "Cache-Control": "no-store" });
  if (Date.parse(tokenRow.expires_at) <= Date.now()) return json({ success: false, errorCode: "TOKEN_EXPIRED" }, 410, { "Cache-Control": "no-store" });

  const action = String(body.action ?? "load");
  if (tokenRow.used_at && tokenRow.purpose === "mentor_request_response") {
    return json({ success: false, errorCode: "STALE_STATE", message: "This response link has already been used." }, 409, { "Cache-Control": "no-store" });
  }

  const { data: call, error: callError } = await admin.from("discovery_calls")
    .select("id, founder_id, mentor_id, mentor_name_snapshot, status, workflow_version, request_topic, desired_outcome, founder_notes, founder_timezone, response_due_at, scheduled_for, duration_minutes, meeting_url, meeting_instructions, calendar_sequence")
    .eq("id", tokenRow.discovery_call_id).single();
  if (callError || !call || call.workflow_version !== 2) return json({ success: false, errorCode: "TOKEN_INVALID" }, 404, { "Cache-Control": "no-store" });

  if (action === "load") {
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", call.founder_id).maybeSingle();
    const { data: mentor } = await admin.from("mentors").select("timezone").eq("id", call.mentor_id).maybeSingle();
    const { data: rounds } = await admin.from("discovery_call_scheduling_rounds")
      .select("id, round_type, proposer_role, responder_role, status, counter_depth, response_due_at, meeting_url, meeting_instructions, discovery_call_scheduling_slots(id, ordinal, starts_at, duration_minutes, proposed_timezone)")
      .eq("discovery_call_id", call.id).eq("status", "pending").order("created_at", { ascending: false }).limit(1);
    await admin.from("discovery_call_action_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", tokenRow.id);
    return json({
      success: true,
      portal: {
        callId: call.id, purpose: tokenRow.purpose, founderName: profile?.full_name || "Founder",
        mentorName: call.mentor_name_snapshot, status: call.status,
        topic: call.request_topic, desiredOutcome: call.desired_outcome, notes: call.founder_notes,
        founderTimezone: call.founder_timezone, mentorTimezone: mentor?.timezone || "UTC", responseDueAt: call.response_due_at,
        scheduledFor: call.scheduled_for, durationMinutes: call.duration_minutes,
        meetingUrl: call.meeting_url, meetingInstructions: call.meeting_instructions,
        activeRound: rounds?.[0] ?? null,
      },
    }, 200, { "Cache-Control": "no-store" });
  }

  let data: Record<string, unknown> | null = null;
  let error: { message: string } | null = null;
  if (["acceptSlot", "counter", "decline"].includes(action) && tokenRow.purpose === "mentor_request_response") {
    const nextToken = action === "acceptSlot" ? await managementToken() : null;
    const result = await admin.rpc("respond_to_discovery_call_request_v4", {
      p_call_id: call.id, p_token_hash: tokenHash,
      p_action: action === "acceptSlot" ? "accept" : action,
      p_slot_id: body.slotId ?? null, p_counter_starts_at: body.counterStartsAt ?? null,
      p_reason: body.reason ?? null, p_management_token_hash: nextToken?.hash ?? null,
      p_management_token_ciphertext: nextToken?.ciphertext ?? null,
    });
    data = result.data; error = result.error;
  } else if (action === "cancelBooking" && tokenRow.purpose === "mentor_booking_manage") {
    const result = await admin.rpc("cancel_discovery_call_v4", {
      p_call_id: call.id, p_actor_user_id: null, p_actor_role: "mentor",
      p_reason: String(body.reason ?? "Mentor cancellation"), p_force_refund: true,
    });
    data = result.data; error = result.error;
  } else if (action === "createReschedule" && tokenRow.purpose === "mentor_booking_manage") {
    const result = await admin.rpc("create_discovery_call_reschedule_v2", {
      p_call_id: call.id, p_actor_user_id: null, p_proposer_role: "mentor",
      p_timezone: String(body.timezone ?? "UTC"),
      p_slots: Array.isArray(body.slots) ? body.slots.map(String) : [],
      p_management_token_hash: null,
      p_management_token_ciphertext: null,
    });
    data = result.data; error = result.error;
  } else if (["acceptReschedule", "counterReschedule", "declineReschedule"].includes(action) && tokenRow.purpose === "mentor_booking_manage") {
    const nextToken = action === "acceptReschedule" ? await managementToken() : null;
    const result = await admin.rpc("respond_to_discovery_call_reschedule_v4", {
      p_call_id: call.id, p_actor_user_id: null, p_actor_role: "mentor",
      p_action: action === "acceptReschedule" ? "accept" : action === "counterReschedule" ? "counter" : "decline",
      p_slot_id: body.slotId ?? null, p_counter_starts_at: body.counterStartsAt ?? null,
      p_management_token_hash: nextToken?.hash ?? null,
      p_management_token_ciphertext: nextToken?.ciphertext ?? null,
    });
    data = result.data; error = result.error;
  } else {
    return json({ success: false, errorCode: "FORBIDDEN" }, 403, { "Cache-Control": "no-store" });
  }

  if (error) return json({ success: false, error: error.message }, 500, { "Cache-Control": "no-store" });
  if (data?.success) {
    void wakeWorker();
    if (["acceptSlot", "acceptReschedule", "cancelBooking"].includes(action)) void wakeCalendarWorker();
  }
  return json(data ?? { success: false }, data?.success === false ? errorStatus(String(data.errorCode ?? "")) : 200, { "Cache-Control": "no-store" });
});
