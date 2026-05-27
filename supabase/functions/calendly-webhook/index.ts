import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logError, logWarn } from "../_shared/logger.ts";
import {
  extractUrlParam,
  extractUuid,
  firstNonEmptyString,
  parseJsonObject,
  processDiscoveryCallProviderEvent,
  type DiscoveryCallProviderEvent,
} from "../_shared/discovery-call-provider-events.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, calendly-webhook-signature, x-calendly-webhook-secret",
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

function normalizeCalendlyEvent(body: Record<string, unknown>): DiscoveryCallProviderEvent {
  const payload = parseJsonObject(body.payload);
  const scheduledEvent = parseJsonObject(payload.scheduled_event);
  const cancellation = parseJsonObject(payload.cancellation);
  const eventName = firstNonEmptyString(body.event) ?? "unknown";
  const inviteeUri = firstNonEmptyString(payload.uri, payload.invitee);
  const eventUri = firstNonEmptyString(scheduledEvent.uri, payload.event);
  const tracking = parseJsonObject(payload.tracking);

  const eventType = eventName === "invitee.created"
    ? "booking_created"
    : eventName === "invitee.canceled"
      ? "booking_cancelled"
      : "ignored";

  return {
    providerName: "calendly",
    eventType,
    providerEventId: eventUri ? `${eventName}:${eventUri}` : firstNonEmptyString(body.uuid, body.id, eventName),
    providerInviteeId: inviteeUri,
    discoveryCallId: extractTrackingCallId(payload),
    inviteeEmail: firstNonEmptyString(payload.email, payload.invitee_email),
    inviteeName: firstNonEmptyString(payload.name),
    scheduledFor: firstNonEmptyString(scheduledEvent.start_time, payload.start_time),
    scheduledUntil: firstNonEmptyString(scheduledEvent.end_time, payload.end_time),
    canceledAt: firstNonEmptyString(cancellation.canceled_at, payload.updated_at, payload.created_at),
    cancelerType: firstNonEmptyString(cancellation.canceler_type, cancellation.canceled_by, payload.canceled_by),
    cancellationReason: firstNonEmptyString(cancellation.reason, payload.reason),
    meetingUrl: extractMeetingUrl(payload),
    rawPayload: body,
    metadata: {
      calendlyTracking: tracking,
      calendlyEventType: eventName,
      calendlyEventUri: eventUri,
      calendlyInviteeUri: inviteeUri,
    },
  };
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
    const normalizedEvent = normalizeCalendlyEvent(parsedBody);
    const result = await processDiscoveryCallProviderEvent(supabaseAdmin, normalizedEvent);

    const status = result.ok === false ? 409 : 200;
    return jsonResponse({ ok: result.ok !== false, provider: "calendly", ...result }, status);
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
