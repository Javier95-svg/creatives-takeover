import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logError, logInfo, logWarn } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, calendly-webhook-signature, x-calendly-webhook-secret",
};

type DiscoveryCallRow = {
  id: string;
  founder_id: string;
  status: string;
  scheduled_for: string | null;
  provider_event_id: string | null;
  provider_invitee_id: string | null;
  created_at: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getEnv(name: string, fallback = "") {
  return Deno.env.get(name) ?? fallback;
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }

  return null;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function computeDurationMinutes(startIso: string | null, endIso: string | null) {
  const start = parseDate(startIso);
  const end = parseDate(endIso);

  if (!start || !end) return 30;

  const diffMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return diffMinutes > 0 ? diffMinutes : 30;
}

function parseSignatureHeader(headerValue: string | null) {
  if (!headerValue) {
    return { timestamp: null as string | null, signatures: [] as string[] };
  }

  const parts = headerValue.split(",").map((part) => part.trim()).filter(Boolean);
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2) ?? null;
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);

  if (signatures.length === 0 && headerValue.trim()) {
    signatures.push(headerValue.trim());
  }

  return { timestamp, signatures };
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

async function computeHmacHex(secret: string, payload: string) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload));
  return bytesToHex(new Uint8Array(signature));
}

async function isAuthorizedWebhook(req: Request, body: string) {
  const signingKey = getEnv("CALENDLY_WEBHOOK_SIGNING_KEY");
  const fallbackSecret = getEnv("CALENDLY_WEBHOOK_SECRET");

  if (fallbackSecret) {
    const providedSecret = req.headers.get("x-calendly-webhook-secret");
    const urlSecret = new URL(req.url).searchParams.get("secret");
    if (providedSecret === fallbackSecret || urlSecret === fallbackSecret) {
      return true;
    }
  }

  if (!signingKey) {
    return false;
  }

  const { timestamp, signatures } = parseSignatureHeader(req.headers.get("calendly-webhook-signature"));
  if (signatures.length === 0) {
    return false;
  }

  if (timestamp) {
    const timestampSeconds = Number(timestamp);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > 300) {
      return false;
    }
  }

  const signedPayload = timestamp ? `${timestamp}.${body}` : body;
  const expectedSignature = await computeHmacHex(signingKey, signedPayload);

  return signatures.some((signature) => timingSafeEqual(signature.toLowerCase(), expectedSignature.toLowerCase()));
}

function extractUuid(value: string | null) {
  if (!value) return null;
  const match = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

function extractUrlParam(value: string | null, paramName: string) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return firstNonEmptyString(url.searchParams.get(paramName));
  } catch {
    return null;
  }
}

function extractMeetingUrl(payload: Record<string, unknown>) {
  const scheduledEvent = parseJsonObject(payload.scheduled_event);
  const location = parseJsonObject(scheduledEvent.location);
  return firstNonEmptyString(
    location.join_url,
    location.location,
    scheduledEvent.join_url,
    scheduledEvent.location,
    payload.join_url,
  );
}

function extractTrackingCallId(payload: Record<string, unknown>) {
  const tracking = parseJsonObject(payload.tracking);
  const scheduledEvent = parseJsonObject(payload.scheduled_event);
  const scheduledTracking = parseJsonObject(scheduledEvent.tracking);

  return extractUuid(firstNonEmptyString(
    tracking.utm_content,
    scheduledTracking.utm_content,
    extractUrlParam(firstNonEmptyString(payload.cancel_url), "ct_discovery_call_id"),
    extractUrlParam(firstNonEmptyString(payload.reschedule_url), "ct_discovery_call_id"),
  ));
}

function extractWebhookContext(body: Record<string, unknown>) {
  const payload = parseJsonObject(body.payload);
  const scheduledEvent = parseJsonObject(payload.scheduled_event);
  const cancellation = parseJsonObject(payload.cancellation);
  const inviteeUri = firstNonEmptyString(payload.uri, payload.invitee);
  const eventUri = firstNonEmptyString(scheduledEvent.uri, payload.event);
  const tracking = parseJsonObject(payload.tracking);

  return {
    eventType: firstNonEmptyString(body.event) ?? "unknown",
    payload,
    tracking,
    callId: extractTrackingCallId(payload),
    inviteeEmail: firstNonEmptyString(payload.email, payload.invitee_email),
    inviteeName: firstNonEmptyString(payload.name),
    inviteeUri,
    eventUri,
    scheduledFor: firstNonEmptyString(scheduledEvent.start_time, payload.start_time),
    scheduledUntil: firstNonEmptyString(scheduledEvent.end_time, payload.end_time),
    canceledAt: firstNonEmptyString(cancellation.canceled_at, payload.updated_at, payload.created_at),
    cancelerType: firstNonEmptyString(cancellation.canceler_type, cancellation.canceled_by, payload.canceled_by),
    cancellationReason: firstNonEmptyString(cancellation.reason, payload.reason),
    meetingUrl: extractMeetingUrl(payload),
  };
}

async function resolveFounderId(supabaseAdmin: ReturnType<typeof createClient>, email: string | null) {
  if (!email) return null;

  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .select("user_id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.user_id ?? null;
}

async function resolveDiscoveryCall(
  supabaseAdmin: ReturnType<typeof createClient>,
  context: ReturnType<typeof extractWebhookContext>,
) {
  if (context.callId) {
    const { data, error } = await supabaseAdmin
      .from("discovery_calls")
      .select("id, founder_id, status, scheduled_for, provider_event_id, provider_invitee_id, created_at")
      .eq("id", context.callId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as DiscoveryCallRow;
  }

  if (context.inviteeUri) {
    const { data, error } = await supabaseAdmin
      .from("discovery_calls")
      .select("id, founder_id, status, scheduled_for, provider_event_id, provider_invitee_id, created_at")
      .eq("provider_invitee_id", context.inviteeUri)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as DiscoveryCallRow;
  }

  if (context.eventUri) {
    const { data, error } = await supabaseAdmin
      .from("discovery_calls")
      .select("id, founder_id, status, scheduled_for, provider_event_id, provider_invitee_id, created_at")
      .eq("provider_event_id", context.eventUri)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as DiscoveryCallRow;
  }

  const founderId = await resolveFounderId(supabaseAdmin, context.inviteeEmail);
  if (!founderId) {
    return null;
  }

  const fallbackLookbackHours = Number(getEnv("DISCOVERY_CALL_WEBHOOK_LOOKBACK_HOURS", "168"));
  const lookbackHours = Number.isFinite(fallbackLookbackHours) && fallbackLookbackHours > 0
    ? fallbackLookbackHours
    : 168;
  const lookbackIso = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("discovery_calls")
    .select("id, founder_id, status, scheduled_for, provider_event_id, provider_invitee_id, created_at")
    .eq("founder_id", founderId)
    .eq("provider_name", "calendly")
    .in("status", ["intent_created", "scheduled"])
    .gte("created_at", lookbackIso)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) throw error;

  if (!data || data.length === 0) {
    return null;
  }

  if (data.length > 1) {
    logWarn("calendly-webhook:ambiguous-fallback-match", {
      inviteeEmail: context.inviteeEmail,
      candidateCallIds: data.map((row: DiscoveryCallRow) => row.id),
    });
  }

  return data[0] as DiscoveryCallRow;
}

function resolveCancellationStatus(call: DiscoveryCallRow, context: ReturnType<typeof extractWebhookContext>) {
  const normalizedCanceler = (context.cancelerType ?? "").toLowerCase();
  if (["host", "owner", "admin", "mentor"].includes(normalizedCanceler)) {
    return "cancelled_early";
  }

  const scheduledFor = parseDate(call.scheduled_for ?? context.scheduledFor);
  const canceledAt = parseDate(context.canceledAt) ?? new Date();

  if (!scheduledFor) {
    return "cancelled_early";
  }

  const cutoffHoursRaw = Number(getEnv("DISCOVERY_CALL_LATE_CANCELLATION_HOURS", "24"));
  const cutoffHours = Number.isFinite(cutoffHoursRaw) && cutoffHoursRaw >= 0 ? cutoffHoursRaw : 24;
  const diffHours = (scheduledFor.getTime() - canceledAt.getTime()) / 3600000;

  return diffHours < cutoffHours ? "cancelled_late" : "cancelled_early";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return jsonResponse({ ok: true, function: "calendly-webhook" });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const body = await req.text();
  const authorized = await isAuthorizedWebhook(req, body);

  if (!authorized) {
    logWarn("calendly-webhook:unauthorized");
    return jsonResponse({ ok: false, error: "Unauthorized webhook request" }, 401);
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const parsedBody = JSON.parse(body) as Record<string, unknown>;
    const context = extractWebhookContext(parsedBody);

    logInfo("calendly-webhook:received", {
      eventType: context.eventType,
      callId: context.callId,
      inviteeEmail: context.inviteeEmail,
      eventUri: context.eventUri,
      inviteeUri: context.inviteeUri,
    });

    if (!["invitee.created", "invitee.canceled"].includes(context.eventType)) {
      return jsonResponse({ ok: true, ignored: true, eventType: context.eventType });
    }

    const call = await resolveDiscoveryCall(supabaseAdmin, context);
    if (!call) {
      logWarn("calendly-webhook:call-not-found", {
        eventType: context.eventType,
        callId: context.callId,
        inviteeEmail: context.inviteeEmail,
        eventUri: context.eventUri,
        inviteeUri: context.inviteeUri,
      });
      return jsonResponse({ ok: false, error: "Discovery call not found" }, 404);
    }

    if (context.eventType === "invitee.created") {
      const { data, error } = await supabaseAdmin.rpc("finalize_discovery_call_booking", {
        p_call_id: call.id,
        p_scheduled_for: context.scheduledFor,
        p_duration_minutes: computeDurationMinutes(context.scheduledFor, context.scheduledUntil),
        p_provider_name: "calendly",
        p_provider_event_id: context.eventUri,
        p_provider_invitee_id: context.inviteeUri,
        p_meeting_url: context.meetingUrl,
        p_metadata: {
          calendlyTracking: context.tracking,
          calendlyInviteeEmail: context.inviteeEmail,
          calendlyInviteeName: context.inviteeName,
          calendlyEventType: context.eventType,
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        logWarn("calendly-webhook:finalize-failed", {
          callId: call.id,
          error: data?.error,
          errorCode: data?.errorCode,
        });
        return jsonResponse({ ok: false, error: data?.error ?? "Unable to finalize booking" }, 409);
      }

      return jsonResponse({ ok: true, action: "finalized", callId: call.id, result: data });
    }

    const nextStatus = resolveCancellationStatus(call, context);
    const { data, error } = await supabaseAdmin.rpc("update_discovery_call_status", {
      p_call_id: call.id,
      p_new_status: nextStatus,
      p_actor_user_id: call.founder_id,
      p_reason: context.cancellationReason,
      p_metadata: {
        calendlyTracking: context.tracking,
        calendlyInviteeEmail: context.inviteeEmail,
        calendlyInviteeName: context.inviteeName,
        calendlyInviteeUri: context.inviteeUri,
        calendlyEventUri: context.eventUri,
        calendlyEventType: context.eventType,
        calendlyCancelerType: context.cancelerType,
        calendlyCanceledAt: context.canceledAt,
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.success) {
      logWarn("calendly-webhook:status-update-failed", {
        callId: call.id,
        nextStatus,
        error: data?.error,
        errorCode: data?.errorCode,
      });
      return jsonResponse({ ok: false, error: data?.error ?? "Unable to update discovery call status" }, 409);
    }

    return jsonResponse({ ok: true, action: "status_updated", callId: call.id, result: data });
  } catch (error) {
    logError("calendly-webhook:error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});