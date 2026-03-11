import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-resend-webhook-secret",
};

type NotificationStatus = "pending" | "sending" | "sent" | "failed" | "skipped";

interface NotificationRow {
  id: string;
  status: NotificationStatus;
  delivered_at: string | null;
  metadata: Record<string, unknown> | null;
}

interface NormalizedWebhookEvent {
  type: string;
  resendEmailId: string;
  eventCreatedAtIso: string | null;
  errorMessage: string | null;
}

function getEnv(name: string): string {
  return (Deno.env.get(name) ?? "").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTimestamp(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function normalizeEvent(payload: unknown): NormalizedWebhookEvent | null {
  const topLevel = asRecord(payload);
  const data = asRecord(topLevel.data);

  const type =
    asString(topLevel.type) ||
    asString(topLevel.event) ||
    asString(data.type) ||
    asString(data.event);

  const resendEmailId =
    asString(data.email_id) ||
    asString(data.emailId) ||
    asString(data.id) ||
    asString(topLevel.email_id) ||
    asString(topLevel.emailId) ||
    asString(topLevel.id);

  if (!type || !resendEmailId) return null;

  const eventCreatedAtIso = normalizeTimestamp(
    asString(topLevel.created_at) ||
      asString(topLevel.createdAt) ||
      asString(data.created_at) ||
      asString(data.createdAt),
  );

  const errorMessage =
    asString(data.reason) ||
    asString(data.error) ||
    asString(topLevel.reason) ||
    asString(topLevel.error) ||
    asString(topLevel.message);

  return {
    type: type.toLowerCase(),
    resendEmailId,
    eventCreatedAtIso,
    errorMessage,
  };
}

function isFailureEvent(eventType: string): boolean {
  return [
    "email.bounced",
    "email.complained",
    "email.failed",
    "email.delivery_failed",
    "bounced",
    "complained",
    "failed",
    "delivery_failed",
  ].includes(eventType);
}

function isDeliveredEvent(eventType: string): boolean {
  return ["email.delivered", "delivered"].includes(eventType);
}

function isOpenedOrClickedEvent(eventType: string): boolean {
  return [
    "email.opened",
    "email.clicked",
    "opened",
    "clicked",
  ].includes(eventType);
}

const supabaseUrl = getEnv("SUPABASE_URL");
const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const webhookSecret = getEnv("RESEND_WEBHOOK_SECRET");
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ ok: false, error: "Supabase env vars are not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (webhookSecret) {
      const urlSecret = new URL(req.url).searchParams.get("secret");
      const headerSecret = req.headers.get("x-resend-webhook-secret");
      const authorized = urlSecret === webhookSecret || headerSecret === webhookSecret;
      if (!authorized) {
        console.warn("[RESEND-EVENTS] Unauthorized webhook request");
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const payload = await req.json();
    const normalized = normalizeEvent(payload);
    if (!normalized) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid webhook payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: rows, error: fetchError } = await supabase
      .from("message_email_notifications")
      .select("id, status, delivered_at, metadata")
      .eq("resend_email_id", normalized.resendEmailId);

    if (fetchError) {
      return new Response(JSON.stringify({ ok: false, error: fetchError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!rows || rows.length === 0) {
      console.warn("[RESEND-EVENTS] No matching notification row", {
        resendEmailId: normalized.resendEmailId,
        eventType: normalized.type,
      });
      return new Response(JSON.stringify({ ok: true, updated: 0, ignored: "unknown_resend_email_id" }), {
        status: 202,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let updatedCount = 0;

    for (const row of rows as NotificationRow[]) {
      const metadata = asRecord(row.metadata);
      const nowIso = new Date().toISOString();
      const nextStatus: NotificationStatus = isFailureEvent(normalized.type) ? "failed" : "sent";
      const nextDeliveredAt =
        isDeliveredEvent(normalized.type) || isOpenedOrClickedEvent(normalized.type)
          ? row.delivered_at || normalized.eventCreatedAtIso || nowIso
          : row.delivered_at;
      const nextLastError = isFailureEvent(normalized.type)
        ? normalized.errorMessage || `Resend event: ${normalized.type}`
        : null;

      const { error: updateError } = await supabase
        .from("message_email_notifications")
        .update({
          status: nextStatus,
          delivered_at: nextDeliveredAt,
          last_error: nextLastError,
          metadata: {
            ...metadata,
            webhook_last_event_type: normalized.type,
            webhook_last_event_created_at_iso: normalized.eventCreatedAtIso,
            webhook_last_received_at_iso: nowIso,
            webhook_last_error: normalized.errorMessage,
            updated_by: "resend-email-events",
            updated_at_iso: nowIso,
          },
        })
        .eq("id", row.id);

      if (updateError) {
        console.error("[RESEND-EVENTS] Failed to update notification row", {
          notificationId: row.id,
          resendEmailId: normalized.resendEmailId,
          error: updateError.message,
        });
        continue;
      }

      updatedCount += 1;
    }

    return new Response(JSON.stringify({ ok: true, updated: updatedCount }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[RESEND-EVENTS] Unhandled error", { message });
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
