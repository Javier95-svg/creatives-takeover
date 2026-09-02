import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { discoveryCallCorsHeaders, env, hashDiscoveryCallToken, json } from "../_shared/discovery-call-v2.ts";

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const responses = ["happened", "other_no_show", "self_no_show", "technical_issue"] as const;
type AttendanceResponse = typeof responses[number];

async function rateLimited(req: Request, tokenHash: string) {
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const ipHash = await hashDiscoveryCallToken(ip);
  const bucketKey = `attendance:${tokenHash}:${ipHash}`;
  const { data } = await admin.from("discovery_call_portal_rate_limits").select("request_count, window_started_at").eq("bucket_key", bucketKey).maybeSingle();
  const expired = !data || Date.parse(data.window_started_at) < Date.now() - 15 * 60_000;
  const count = expired ? 1 : Number(data.request_count) + 1;
  await admin.from("discovery_call_portal_rate_limits").upsert({
    bucket_key: bucketKey, request_count: count, window_started_at: expired ? new Date().toISOString() : data?.window_started_at,
    updated_at: new Date().toISOString(),
  });
  return count > 30;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: discoveryCallCorsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405, { "Cache-Control": "no-store" });
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const rawToken = typeof body.token === "string" ? body.token : "";
  if (rawToken.length < 40 || rawToken.length > 200) return json({ success: false, errorCode: "TOKEN_INVALID" }, 404, { "Cache-Control": "no-store" });
  const tokenHash = await hashDiscoveryCallToken(rawToken);
  if (await rateLimited(req, tokenHash)) return json({ success: false, errorCode: "RATE_LIMITED" }, 429, { "Cache-Control": "no-store" });

  const { data: token, error: tokenError } = await admin.from("discovery_call_action_tokens")
    .select("id, discovery_call_id, purpose, recipient_role, expires_at, revoked_at")
    .eq("token_hash", tokenHash).maybeSingle();
  if (tokenError || !token || token.revoked_at || !["founder_attendance_response", "mentor_attendance_response"].includes(token.purpose)) {
    return json({ success: false, errorCode: "TOKEN_INVALID" }, 404, { "Cache-Control": "no-store" });
  }
  if (Date.parse(token.expires_at) <= Date.now()) return json({ success: false, errorCode: "TOKEN_EXPIRED" }, 410, { "Cache-Control": "no-store" });

  const { data: call, error: callError } = await admin.from("discovery_calls")
    .select("id, mentor_name_snapshot, scheduled_for, duration_minutes, status, workflow_version")
    .eq("id", token.discovery_call_id).maybeSingle();
  if (callError || !call || call.workflow_version !== 2) return json({ success: false, errorCode: "TOKEN_INVALID" }, 404, { "Cache-Control": "no-store" });
  const { data: evidence } = await admin.from("discovery_call_attendance_evidence")
    .select("verification_status, founder_response, mentor_response, resolved_at").eq("discovery_call_id", call.id).maybeSingle();
  await admin.from("discovery_call_action_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", token.id);

  if (String(body.action ?? "load") === "load") {
    return json({ success: true, confirmation: {
      role: token.recipient_role, mentorName: call.mentor_name_snapshot, scheduledFor: call.scheduled_for,
      durationMinutes: call.duration_minutes, status: call.status, verificationStatus: evidence?.verification_status ?? "confirmation_required",
      submitted: token.recipient_role === "founder" ? Boolean(evidence?.founder_response) : Boolean(evidence?.mentor_response),
      resolved: Boolean(evidence?.resolved_at),
    } }, 200, { "Cache-Control": "no-store" });
  }

  const response = body.response;
  if (!responses.includes(response as AttendanceResponse)) return json({ success: false, errorCode: "INVALID_REQUEST" }, 422, { "Cache-Control": "no-store" });
  const { data: result, error } = await admin.rpc("record_discovery_call_attendance_response_v5", {
    p_call_id: call.id, p_role: token.recipient_role, p_response: response,
  });
  if (error) return json({ success: false, error: error.message }, 500, { "Cache-Control": "no-store" });
  if (!result?.success) return json(result, result?.errorCode === "STALE_STATE" ? 409 : 422, { "Cache-Control": "no-store" });
  await admin.from("discovery_call_action_tokens").update({ used_at: new Date().toISOString() }).eq("id", token.id);
  void admin.functions.invoke("process-discovery-call-notifications", {
    body: { limit: 50 }, headers: { Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}` },
  });
  return json(result, 200, { "Cache-Control": "no-store" });
});
