import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logError, logWarn } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationRequest = {
  discoveryCallId?: string | null;
  eventType?: string | null;
  providerEventRecordId?: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string | null | undefined) {
  if (!value) return "";

  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getAdminRecipient() {
  const recipient = (Deno.env.get("DISCOVERY_CALL_ADMIN_NOTIFICATION_EMAIL") || "admin@creatives-takeover.com").trim();
  return recipient || "admin@creatives-takeover.com";
}

function getAppUrl() {
  return (Deno.env.get("SITE_URL") || Deno.env.get("APP_URL") || "https://creatives-takeover.com").replace(/\/$/, "");
}

function getEventLabel(eventType: string) {
  switch (eventType) {
    case "booked":
      return "New Discovery Call Booking";
    case "scheduled":
      return "Discovery Call Confirmed";
    case "rescheduled":
      return "Discovery Call Rescheduled";
    case "cancelled_early":
      return "Discovery Call Cancelled";
    case "cancelled_late":
      return "Late Discovery Call Cancellation";
    case "mentor_no_show":
      return "Mentor No-Show";
    case "founder_no_show":
      return "Founder No-Show";
    case "pending_review":
      return "Discovery Call Needs Review";
    default:
      return "Discovery Call Update";
  }
}

function getUserMessage(eventType: string, mentorName: string, scheduledLabel: string) {
  switch (eventType) {
    case "booked":
      return `Your discovery call with ${mentorName} is booked. Pick your time on the mentor's calendar, then confirm it in Creatives Takeover.`;
    case "scheduled":
      return `Your discovery call with ${mentorName} is confirmed for ${scheduledLabel}.`;
    case "rescheduled":
      return `Your discovery call with ${mentorName} was rescheduled to ${scheduledLabel}.`;
    case "cancelled_early":
      return `Your discovery call with ${mentorName} was cancelled. Any eligible credits have been restored.`;
    case "cancelled_late":
      return `Your discovery call with ${mentorName} was cancelled late.`;
    case "mentor_no_show":
      return `Your discovery call with ${mentorName} was marked mentor no-show. Any eligible credits have been restored.`;
    case "founder_no_show":
      return `Your discovery call with ${mentorName} was marked founder no-show.`;
    default:
      return `There is an update for your discovery call with ${mentorName}.`;
  }
}

function getProviderLabel(provider: string | null | undefined) {
  const normalized = (provider || "").trim().toLowerCase();
  if (normalized === "calendly") return "Calendly";
  if (normalized === "koalendar") return "Koalendar";
  if (normalized && normalized !== "manual" && normalized !== "self_confirmed") {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  return "booking calendar";
}

function getMentorMessage(eventType: string, founderName: string, scheduledLabel: string, providerLabel = "booking calendar") {
  switch (eventType) {
    case "booked":
      return `${founderName} from Creatives Takeover booked a Discovery Call via your ${providerLabel}. They will choose a time on your calendar.`;
    case "scheduled":
      return `${founderName} confirmed a discovery call for ${scheduledLabel}.`;
    case "rescheduled":
      return `${founderName}'s discovery call was rescheduled to ${scheduledLabel}.`;
    case "cancelled_early":
    case "cancelled_late":
      return `${founderName}'s discovery call was cancelled.`;
    case "mentor_no_show":
      return `A discovery call with ${founderName} was marked mentor no-show.`;
    case "founder_no_show":
      return `A discovery call with ${founderName} was marked founder no-show.`;
    default:
      return `There is an update for your discovery call with ${founderName}.`;
  }
}

function buildEmailHtml(input: {
  title: string;
  message: string;
  founderName?: string | null;
  founderEmail?: string | null;
  mentorName?: string | null;
  scheduledLabel?: string | null;
  meetingUrl?: string | null;
  actionUrl?: string | null;
  providerSummary?: string | null;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #0f172a; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #022b3a; color: white; padding: 24px; border-radius: 10px 10px 0 0; }
          .content { background: #f8fafc; padding: 24px; border: 1px solid #dbe4ea; border-radius: 0 0 10px 10px; }
          .field { margin-top: 14px; }
          .label { color: #1f7a8c; font-weight: 700; font-size: 13px; }
          .button { display: inline-block; margin-top: 18px; background: #1f7a8c; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; }
          .footer { color: #64748b; font-size: 12px; margin-top: 22px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 22px;">${escapeHtml(input.title)}</h1>
          </div>
          <div class="content">
            <p>${escapeHtml(input.message)}</p>
            ${input.founderName ? `<div class="field"><div class="label">Founder</div><div>${escapeHtml(input.founderName)}</div></div>` : ""}
            ${input.founderEmail ? `<div class="field"><div class="label">Founder Email</div><div>${escapeHtml(input.founderEmail)}</div></div>` : ""}
            ${input.mentorName ? `<div class="field"><div class="label">Mentor</div><div>${escapeHtml(input.mentorName)}</div></div>` : ""}
            ${input.scheduledLabel ? `<div class="field"><div class="label">Scheduled For</div><div>${escapeHtml(input.scheduledLabel)}</div></div>` : ""}
            ${input.providerSummary ? `<div class="field"><div class="label">Provider Event</div><div>${escapeHtml(input.providerSummary)}</div></div>` : ""}
            ${input.meetingUrl ? `<div class="field"><div class="label">Meeting URL</div><div><a href="${escapeHtml(input.meetingUrl)}">${escapeHtml(input.meetingUrl)}</a></div></div>` : ""}
            ${input.actionUrl ? `<a class="button" href="${escapeHtml(input.actionUrl)}">Open Creative Takeover</a>` : ""}
            <div class="footer">This is an automated Creative Takeover discovery call notification.</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function sendEmail(input: {
  to: string | null | undefined;
  subject: string;
  html: string;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !input.to) {
    return { skipped: true };
  }

  const resend = new Resend(apiKey);
  const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
  const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";

  return resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: [input.to],
    subject: input.subject,
    html: input.html,
  });
}

async function getSubscriberEmail(supabaseAdmin: ReturnType<typeof createClient>, userId: string | null | undefined) {
  if (!userId) return null;

  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .select("email")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logWarn("notify-discovery-call-event:subscriber-email-failed", {
      userId,
      error: error.message,
    });
    return null;
  }

  return data?.email ?? null;
}

async function insertInAppNotification(
  supabaseAdmin: ReturnType<typeof createClient>,
  input: {
    userId: string | null | undefined;
    actorId: string | null | undefined;
    notificationType: string;
    message: string;
    discoveryCallId?: string | null;
    eventType: string;
  },
) {
  if (!input.userId || !input.actorId) return;

  const { error } = await supabaseAdmin
    .from("community_notifications")
    .insert({
      user_id: input.userId,
      actor_id: input.actorId,
      notification_type: input.notificationType,
      read: false,
      metadata: {
        message: input.message,
        route: "/dashboard",
        discoveryCallId: input.discoveryCallId ?? null,
        eventType: input.eventType,
        image_url: "/lovable-uploads/new-favicon.png",
      },
    });

  if (error) {
    logWarn("notify-discovery-call-event:in-app-failed", {
      userId: input.userId,
      notificationType: input.notificationType,
      error: error.message,
    });
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const body: NotificationRequest = await req.json();
    const eventType = body.eventType || "scheduled";
    const idempotencySubject = body.discoveryCallId || body.providerEventRecordId;

    if (!idempotencySubject) {
      return jsonResponse({ success: false, error: "discoveryCallId or providerEventRecordId is required" }, 400);
    }

    const idempotencyKey = `notify:discovery-call-event:${eventType}:${idempotencySubject}`;
    const { data: beginStatus, error: beginError } = await supabaseAdmin.rpc("idempotency_try_begin", {
      p_id: idempotencyKey,
    });

    if (beginError) throw beginError;

    if (beginStatus !== "started") {
      return jsonResponse({ success: true, skipped: true, reason: beginStatus, eventType, idempotencySubject });
    }

    try {
      const appUrl = getAppUrl();
      const adminRecipient = getAdminRecipient();
      let providerEvent: any = null;

      if (body.providerEventRecordId) {
        const { data, error } = await supabaseAdmin
          .from("discovery_call_provider_events")
          .select("*")
          .eq("id", body.providerEventRecordId)
          .maybeSingle();

        if (error) throw error;
        providerEvent = data;
      }

      if (!body.discoveryCallId && providerEvent?.match_status === "pending_review") {
        const providerSummary = `${providerEvent.provider_name} ${providerEvent.provider_event_type} (${providerEvent.invitee_email || "email unavailable"})`;
        const emailResult = await sendEmail({
          to: adminRecipient,
          subject: "Discovery Call Needs Review",
          html: buildEmailHtml({
            title: "Discovery Call Needs Review",
            message: "A provider confirmation could not be matched safely. No credits were charged.",
            scheduledLabel: providerEvent.scheduled_for,
            providerSummary,
            actionUrl: `${appUrl}/dashboard`,
          }),
        });

        const responsePayload = {
          success: true,
          eventType,
          providerEventRecordId: body.providerEventRecordId,
          adminRecipient,
          emailId: (emailResult as any).data?.id ?? null,
        };

        await supabaseAdmin.rpc("idempotency_mark_completed", {
          p_id: idempotencyKey,
          p_result: responsePayload,
        });

        return jsonResponse(responsePayload);
      }

      if (!body.discoveryCallId) {
        await supabaseAdmin.rpc("idempotency_clear", { p_id: idempotencyKey });
        return jsonResponse({ success: false, error: "Discovery call ID is required for this event" }, 400);
      }

      const { data: booking, error: bookingError } = await supabaseAdmin
        .from("discovery_call_admin_overview")
        .select("id, status, scheduled_for, founder_name, founder_email, founder_id, mentor_name, mentor_user_id, mentor_contact_email, mentor_booking_provider, meeting_url, provider_name")
        .eq("id", body.discoveryCallId)
        .maybeSingle();

      if (bookingError) throw bookingError;

      if (!booking) {
        await supabaseAdmin.rpc("idempotency_clear", { p_id: idempotencyKey });
        return jsonResponse({ success: false, error: "Discovery call not found" }, 404);
      }

      const scheduledFor = booking.scheduled_for ? new Date(booking.scheduled_for) : null;
      const scheduledLabel = scheduledFor && !Number.isNaN(scheduledFor.getTime())
        ? scheduledFor.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
        : "time unavailable";
      const founderName = booking.founder_name?.trim() || "Founder";
      const founderEmail = booking.founder_email?.trim() || null;
      const founderId = booking.founder_id || null;
      const mentorName = booking.mentor_name?.trim() || "your mentor";
      // Prefer the mentor's stored contact email so we can reach mentors even
      // without a linked account; fall back to the linked account's email.
      const mentorEmail = booking.mentor_contact_email?.trim()
        || (await getSubscriberEmail(supabaseAdmin, booking.mentor_user_id));
      const providerLabel = getProviderLabel(booking.mentor_booking_provider || booking.provider_name);
      const title = getEventLabel(eventType);
      const founderMessage = getUserMessage(eventType, mentorName, scheduledLabel);
      const mentorMessage = getMentorMessage(eventType, founderName, scheduledLabel, providerLabel);
      const actionUrl = `${appUrl}/dashboard`;

      await insertInAppNotification(supabaseAdmin, {
        userId: booking.founder_id,
        actorId: booking.mentor_user_id || booking.founder_id,
        notificationType: "discovery_call_event",
        message: founderMessage,
        discoveryCallId: booking.id,
        eventType,
      });

      if (booking.mentor_user_id) {
        await insertInAppNotification(supabaseAdmin, {
          userId: booking.mentor_user_id,
          actorId: booking.founder_id,
          notificationType: "discovery_call_event",
          message: mentorMessage,
          discoveryCallId: booking.id,
          eventType,
        });
      }

      const founderEmailResult = await sendEmail({
        to: founderEmail,
        subject: title,
        html: buildEmailHtml({
          title,
          message: founderMessage,
          founderName,
          mentorName,
          scheduledLabel,
          meetingUrl: booking.meeting_url,
          actionUrl,
        }),
      });

      const mentorEmailResult = await sendEmail({
        to: mentorEmail,
        subject: title,
        html: buildEmailHtml({
          title,
          message: mentorMessage,
          founderName,
          founderEmail,
          mentorName,
          scheduledLabel,
          meetingUrl: booking.meeting_url,
          actionUrl,
        }),
      });

      const adminMessage = eventType === "booked"
        ? `User ${founderName} (${founderEmail || "email unavailable"} • UID ${founderId || "unknown"}) successfully booked a discovery call with ${mentorName}.`
        : `${founderName} (${founderEmail || "email unavailable"} • UID ${founderId || "unknown"}) has a "${title}" update with ${mentorName}.`;

      const adminEmailResult = await sendEmail({
        to: adminRecipient,
        subject: `${title}: ${founderName} → ${mentorName}`,
        html: buildEmailHtml({
          title,
          message: adminMessage,
          founderName,
          founderEmail,
          mentorName,
          scheduledLabel,
          meetingUrl: booking.meeting_url,
          providerSummary: providerEvent
            ? `${providerEvent.provider_name} ${providerEvent.provider_event_type}`
            : booking.provider_name,
          actionUrl,
        }),
      });

      const responsePayload = {
        success: true,
        discoveryCallId: booking.id,
        eventType,
        recipients: {
          founder: founderEmail,
          mentor: mentorEmail,
          admin: adminRecipient,
        },
        emailIds: {
          founder: (founderEmailResult as any).data?.id ?? null,
          mentor: (mentorEmailResult as any).data?.id ?? null,
          admin: (adminEmailResult as any).data?.id ?? null,
        },
      };

      await supabaseAdmin.rpc("idempotency_mark_completed", {
        p_id: idempotencyKey,
        p_result: responsePayload,
      });

      return jsonResponse(responsePayload);
    } catch (error) {
      await supabaseAdmin.rpc("idempotency_clear", { p_id: idempotencyKey });
      throw error;
    }
  } catch (error) {
    logError("notify-discovery-call-event:error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
