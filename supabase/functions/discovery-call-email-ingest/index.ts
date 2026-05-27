import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logError, logWarn } from "../_shared/logger.ts";
import {
  extractUuid,
  firstNonEmptyString,
  processDiscoveryCallProviderEvent,
  type DiscoveryCallProviderEvent,
} from "../_shared/discovery-call-provider-events.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-discovery-call-email-secret",
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

function isAuthorized(req: Request) {
  const secret = getEnv("DISCOVERY_CALL_EMAIL_INGEST_SECRET");
  if (!secret) return false;

  const providedSecret = req.headers.get("x-discovery-call-email-secret");
  const urlSecret = new URL(req.url).searchParams.get("secret");
  return providedSecret === secret || urlSecret === secret;
}

function getBodyText(body: Record<string, unknown>) {
  return [
    firstNonEmptyString(body.subject),
    firstNonEmptyString(body.text),
    firstNonEmptyString(body.html),
    firstNonEmptyString(body.body),
  ].filter(Boolean).join("\n");
}

function extractEmail(value: string | null) {
  if (!value) return null;
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : null;
}

function extractScheduledFor(body: Record<string, unknown>, bodyText: string) {
  const explicit = firstNonEmptyString(
    body.scheduledFor,
    body.scheduled_for,
    body.startTime,
    body.start_time,
  );

  if (explicit && !Number.isNaN(new Date(explicit).getTime())) {
    return explicit;
  }

  const isoMatch = bodyText.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/);
  if (isoMatch && !Number.isNaN(new Date(isoMatch[0]).getTime())) {
    return isoMatch[0];
  }

  return null;
}

function normalizeEmailEvent(body: Record<string, unknown>): DiscoveryCallProviderEvent {
  const bodyText = getBodyText(body);
  const subject = firstNonEmptyString(body.subject) ?? "";
  const lowerSubject = subject.toLowerCase();
  const eventType = lowerSubject.includes("cancel")
    ? "booking_cancelled"
    : lowerSubject.includes("reschedul")
      ? "booking_rescheduled"
      : "booking_created";

  const providerName = firstNonEmptyString(body.providerName, body.provider_name);
  const fromEmail = extractEmail(firstNonEmptyString(body.from, body.sender));
  const replyToEmail = extractEmail(firstNonEmptyString(body.replyTo, body.reply_to));
  const explicitInviteeEmail = extractEmail(firstNonEmptyString(body.inviteeEmail, body.invitee_email, body.email));

  return {
    providerName: "email",
    eventType,
    providerEventId: firstNonEmptyString(body.messageId, body.message_id, body.id, subject),
    providerInviteeId: firstNonEmptyString(body.inviteeId, body.invitee_id),
    discoveryCallId: extractUuid(firstNonEmptyString(body.discoveryCallId, body.discovery_call_id, bodyText)),
    inviteeEmail: explicitInviteeEmail ?? replyToEmail ?? fromEmail,
    inviteeName: firstNonEmptyString(body.inviteeName, body.invitee_name, body.name),
    scheduledFor: extractScheduledFor(body, bodyText),
    scheduledUntil: firstNonEmptyString(body.scheduledUntil, body.scheduled_until, body.endTime, body.end_time),
    meetingUrl: firstNonEmptyString(body.meetingUrl, body.meeting_url, body.joinUrl, body.join_url),
    canceledAt: firstNonEmptyString(body.canceledAt, body.cancelledAt, body.canceled_at, body.cancelled_at),
    cancelerType: firstNonEmptyString(body.cancelerType, body.canceler_type, body.canceledBy, body.cancelled_by),
    cancellationReason: firstNonEmptyString(body.reason, body.cancellationReason, body.cancellation_reason),
    rawPayload: body,
    metadata: {
      emailSubject: subject,
      forwardedProviderName: providerName,
      fromEmail,
    },
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return jsonResponse({ ok: true, function: "discovery-call-email-ingest" });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  if (!isAuthorized(req)) {
    logWarn("discovery-call-email-ingest:unauthorized");
    return jsonResponse({ ok: false, error: "Unauthorized request" }, 401);
  }

  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const parsedBody = await req.json() as Record<string, unknown>;
    const normalizedEvent = normalizeEmailEvent(parsedBody);
    const result = await processDiscoveryCallProviderEvent(supabaseAdmin, normalizedEvent);

    const status = result.ok === false ? 409 : 200;
    return jsonResponse({ ok: result.ok !== false, provider: "email", ...result }, status);
  } catch (error) {
    logError("discovery-call-email-ingest:error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
