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
  "Access-Control-Allow-Headers": "content-type, x-koalendar-webhook-secret",
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

function isAuthorizedWebhook(req: Request) {
  const secret = getEnv("KOALENDAR_WEBHOOK_SECRET");
  if (!secret) return false;

  const providedSecret = req.headers.get("x-koalendar-webhook-secret");
  const urlSecret = new URL(req.url).searchParams.get("secret");
  return providedSecret === secret || urlSecret === secret;
}

function getNestedObject(...values: unknown[]) {
  for (const value of values) {
    const parsed = parseJsonObject(value);
    if (Object.keys(parsed).length > 0) return parsed;
  }

  return {};
}

function getCustomFieldValue(customFields: unknown, keyPattern: RegExp) {
  if (Array.isArray(customFields)) {
    for (const field of customFields) {
      const row = parseJsonObject(field);
      const name = firstNonEmptyString(row.name, row.label, row.key);
      if (name && keyPattern.test(name)) {
        return firstNonEmptyString(row.value, row.answer);
      }
    }
  }

  const customFieldObject = parseJsonObject(customFields);
  for (const [key, value] of Object.entries(customFieldObject)) {
    if (keyPattern.test(key)) {
      return firstNonEmptyString(value);
    }
  }

  return null;
}

function extractTrackingCallId(root: Record<string, unknown>, booking: Record<string, unknown>) {
  const metadata = getNestedObject(root.metadata, booking.metadata);
  const tracking = getNestedObject(root.tracking, booking.tracking);
  const customFields = booking.custom_fields ?? root.custom_fields ?? booking.questions ?? root.questions;

  return extractUuid(firstNonEmptyString(
    metadata.ct_discovery_call_id,
    metadata.discovery_call_id,
    tracking.ct_discovery_call_id,
    tracking.utm_content,
    booking.ct_discovery_call_id,
    root.ct_discovery_call_id,
    getCustomFieldValue(customFields, /ct_discovery_call_id|discovery_call_id/i),
    extractUrlParam(firstNonEmptyString(booking.booking_url, booking.cancel_url, booking.reschedule_url, root.url), "ct_discovery_call_id"),
    extractUrlParam(firstNonEmptyString(booking.booking_url, booking.cancel_url, booking.reschedule_url, root.url), "utm_content"),
  ));
}

function normalizeKoalendarEvent(body: Record<string, unknown>): DiscoveryCallProviderEvent {
  const booking = getNestedObject(body.booking, body.event, body.payload, body.data);
  const invitee = getNestedObject(booking.invitee, booking.customer, booking.guest, body.invitee, body.customer);
  const rawEventType = firstNonEmptyString(body.event, body.type, body.action, booking.status) ?? "booking.created";
  const normalizedRawType = rawEventType.toLowerCase();
  const isCancelled = normalizedRawType.includes("cancel") || normalizedRawType.includes("delete");
  const isRescheduled = normalizedRawType.includes("reschedul");

  const eventType = isCancelled
    ? "booking_cancelled"
    : isRescheduled
      ? "booking_rescheduled"
      : "booking_created";

  const bookingId = firstNonEmptyString(booking.id, booking.uuid, booking.event_id, body.id, body.uuid);
  const inviteeId = firstNonEmptyString(invitee.id, invitee.uuid, booking.invitee_id, booking.guest_id);
  const providerEventId = bookingId ? `${rawEventType}:${bookingId}` : firstNonEmptyString(body.id, body.uuid, rawEventType);

  return {
    providerName: "koalendar",
    eventType,
    providerEventId,
    providerInviteeId: inviteeId,
    discoveryCallId: extractTrackingCallId(body, booking),
    inviteeEmail: firstNonEmptyString(invitee.email, booking.email, body.email),
    inviteeName: firstNonEmptyString(invitee.name, booking.name, booking.invitee_name, body.name),
    scheduledFor: firstNonEmptyString(booking.start_time, booking.starts_at, booking.start, booking.scheduled_for, body.start_time),
    scheduledUntil: firstNonEmptyString(booking.end_time, booking.ends_at, booking.end, body.end_time),
    canceledAt: firstNonEmptyString(booking.canceled_at, booking.cancelled_at, body.canceled_at, body.cancelled_at),
    cancelerType: firstNonEmptyString(booking.canceler_type, booking.cancelled_by, booking.canceled_by, body.canceled_by),
    cancellationReason: firstNonEmptyString(booking.cancellation_reason, booking.cancel_reason, booking.reason, body.reason),
    meetingUrl: firstNonEmptyString(booking.meeting_url, booking.join_url, booking.location, body.meeting_url),
    rawPayload: body,
    metadata: {
      koalendarEventType: rawEventType,
      koalendarBookingId: bookingId,
    },
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return jsonResponse({ ok: true, function: "koalendar-webhook" });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  if (!isAuthorizedWebhook(req)) {
    logWarn("koalendar-webhook:unauthorized");
    return jsonResponse({ ok: false, error: "Unauthorized webhook request" }, 401);
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const parsedBody = await req.json() as Record<string, unknown>;
    const normalizedEvent = normalizeKoalendarEvent(parsedBody);
    const result = await processDiscoveryCallProviderEvent(supabaseAdmin, normalizedEvent);

    const status = result.ok === false ? 409 : 200;
    return jsonResponse({ ok: result.ok !== false, provider: "koalendar", ...result }, status);
  } catch (error) {
    logError("koalendar-webhook:error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
