import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  decryptDiscoveryCallToken,
  discoveryCallCorsHeaders,
  env,
  isAuthorizedWorker,
  json,
} from "../_shared/discovery-call-v2.ts";
import { buildDiscoveryCallEmail, buildDiscoveryCallIcs } from "../_shared/discovery-call-emails.ts";

interface OutboxRow {
  id: string;
  created_at: string;
  send_generation: number;
  template_key: string;
  recipient_role: string;
  recipient_email: string;
  payload: Record<string, unknown>;
  secure_token_ciphertext: string | null;
}

const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

function actionUrl(template: string, role: string, token: string | null, payload: Record<string, unknown>) {
  const appUrl = env("APP_URL").replace(/\/$/, "");
  if (["attendance_confirmation_required", "attendance_confirmation_reminder"].includes(template) && token) {
    return `${appUrl}/mentorship/calls/attendance?token=${encodeURIComponent(token)}`;
  }
  if (role === "mentor") return token ? `${appUrl}/mentorship/calls/respond#token=${encodeURIComponent(token)}` : null;
  if (role === "admin") return `${appUrl}/mentorship/admin/discovery-calls?call=${encodeURIComponent(String(payload.callId ?? ""))}`;
  return `${appUrl}/mentorship/my-bookings?call=${encodeURIComponent(String(payload.callId ?? ""))}`;
}

function base64Content(value: string) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(value)));
}

async function sendWithResend(input: {
  apiKey: string;
  idempotencyKey: string;
  outboxId: string;
  sendGeneration: number;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
  attachment: string | null;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: `Creatives Takeover <${input.fromEmail}>`,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      tags: [
        { name: "category", value: "discovery_call" },
        { name: "outbox_id", value: input.outboxId },
        { name: "send_generation", value: String(input.sendGeneration) },
      ],
      ...(input.attachment
        ? { attachments: [{ filename: "discovery-call.ics", content: input.attachment }] }
        : {}),
    }),
  });
  const responseBody = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof responseBody.message === "string"
      ? responseBody.message
      : `Resend returned HTTP ${response.status}`;
    throw new Error(message);
  }
  if (typeof responseBody.id !== "string" || !responseBody.id) {
    throw new Error("Resend accepted the request without returning an email ID");
  }
  return responseBody.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: discoveryCallCorsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);
  if (!isAuthorizedWorker(req)) return json({ success: false, error: "Unauthorized" }, 401);

  const apiKey = env("RESEND_API_KEY");
  const fromEmail = env("FROM_EMAIL");
  const appUrl = env("APP_URL");
  if (!apiKey || !fromEmail || !appUrl) return json({ success: false, error: "Email delivery is not configured" }, 503);
  if (/^https:\/\/(www\.)?creatives-takeover\.com/i.test(appUrl) && fromEmail.toLowerCase().endsWith("@resend.dev")) {
    return json({ success: false, error: "A verified production FROM_EMAIL is required" }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const requestedLimit = Number((body as Record<string, unknown>).limit ?? 25);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 25, 100));
  const { data, error } = await admin.rpc("claim_discovery_call_notifications", { p_limit: limit });
  if (error) return json({ success: false, error: error.message }, 500);

  let sent = 0;
  let failed = 0;
  for (const row of (data ?? []) as OutboxRow[]) {
    try {
      const token = row.secure_token_ciphertext
        ? await decryptDiscoveryCallToken(row.secure_token_ciphertext)
        : null;
      const email = buildDiscoveryCallEmail({
        template: row.template_key,
        recipientRole: row.recipient_role,
        payload: row.payload ?? {},
        actionUrl: actionUrl(row.template_key, row.recipient_role, token, row.payload ?? {}),
      });
      // Google Calendar already sends the canonical REQUEST/UPDATE/CANCEL to
      // every attendee. Attaching a second ICS would create duplicate events.
      const calendarManagedExternally = row.payload?.calendarManagedExternally === true
        || (typeof row.payload?.meetingUrl === "string" && row.payload.meetingUrl.startsWith("https://meet.google.com/"));
      const includeCalendar = !calendarManagedExternally
        && ["booking_confirmed", "reschedule_confirmed", "booking_cancelled"].includes(row.template_key);
      const stablePayload = { ...(row.payload ?? {}), notificationCreatedAt: row.created_at };
      const ics = includeCalendar
        ? buildDiscoveryCallIcs(stablePayload, row.template_key === "booking_cancelled")
        : null;
      const providerMessageId = await sendWithResend({
        apiKey,
        idempotencyKey: `discovery-call/${row.id}/${row.send_generation}`,
        outboxId: row.id,
        sendGeneration: row.send_generation,
        fromEmail,
        to: row.recipient_email,
        subject: email.subject,
        html: email.html,
        attachment: ics ? base64Content(ics) : null,
      });
      const { error: completionError } = await admin.rpc("complete_discovery_call_notification", {
        p_outbox_id: row.id,
        p_success: true,
        p_provider_message_id: providerMessageId,
        p_error: null,
      });
      if (completionError) throw new Error(`Unable to record Resend acceptance: ${completionError.message}`);
      sent += 1;
    } catch (deliveryError) {
      await admin.rpc("complete_discovery_call_notification", {
        p_outbox_id: row.id,
        p_success: false,
        p_provider_message_id: null,
        p_error: deliveryError instanceof Error ? deliveryError.message : String(deliveryError),
      });
      failed += 1;
    }
  }
  return json({ success: true, claimed: (data ?? []).length, sent, failed });
});
