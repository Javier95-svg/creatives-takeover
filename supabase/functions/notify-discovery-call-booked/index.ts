import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiscoveryCallNotificationRequest {
  discoveryCallId: string;
}

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

function getRecipientEmail() {
  const recipient = (Deno.env.get("DISCOVERY_CALL_ADMIN_NOTIFICATION_EMAIL") || "admin@creatives-takeover.com").trim();
  return recipient || "admin@creatives-takeover.com";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const { discoveryCallId }: DiscoveryCallNotificationRequest = await req.json();

    if (!discoveryCallId) {
      return jsonResponse({ success: false, error: "discoveryCallId is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const idempotencyKey = `notify:discovery-call-booked:${discoveryCallId}`;
    const { data: beginStatus, error: beginError } = await supabaseAdmin.rpc("idempotency_try_begin", {
      p_id: idempotencyKey,
    });

    if (beginError) {
      throw beginError;
    }

    if (beginStatus !== "started") {
      return jsonResponse({ success: true, skipped: true, reason: beginStatus, discoveryCallId });
    }

    try {
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from("discovery_call_admin_overview")
        .select("id, status, scheduled_for, founder_name, founder_email, founder_id, mentor_name, meeting_url")
        .eq("id", discoveryCallId)
        .maybeSingle();

      if (bookingError) {
        throw bookingError;
      }

      if (!booking) {
        await supabaseAdmin.rpc("idempotency_clear", { p_id: idempotencyKey });
        return jsonResponse({ success: false, error: "Discovery call not found" }, 404);
      }

      if (booking.status !== "scheduled") {
        await supabaseAdmin.rpc("idempotency_clear", { p_id: idempotencyKey });
        return jsonResponse({ success: true, skipped: true, reason: "not_scheduled", discoveryCallId });
      }

      const adminRecipient = getRecipientEmail();
      const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
      const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover Alerts";
      const scheduledFor = booking.scheduled_for ? new Date(booking.scheduled_for) : null;
      const scheduledLabel = scheduledFor && !Number.isNaN(scheduledFor.getTime())
        ? scheduledFor.toLocaleString()
        : "Not available";
      const customerName = booking.founder_name?.trim() || "Unknown customer";
      const customerEmail = booking.founder_email?.trim() || "Email unavailable";
      const mentorName = booking.mentor_name?.trim() || "Unknown mentor";
      const meetingUrl = booking.meeting_url?.trim() || null;
      const dashboardUrl = `https://supabase.com/dashboard/project/rcjlaybjnozqbsoxzboa/editor`;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1f7a8c 0%, #022b3a 100%); color: white; padding: 28px; border-radius: 12px 12px 0 0; }
              .content { background: #f8fafc; padding: 28px; border: 1px solid #dbe4ea; border-radius: 0 0 12px 12px; }
              .field { margin-bottom: 18px; }
              .label { font-weight: 700; color: #1f7a8c; margin-bottom: 4px; }
              .value { color: #0f172a; }
              .button { display: inline-block; background: #022b3a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 10px; }
              .footer { color: #64748b; font-size: 12px; margin-top: 24px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">New Discovery Call Booked</h1>
                <p style="margin: 8px 0 0; opacity: 0.9;">A founder has confirmed a discovery call booking.</p>
              </div>
              <div class="content">
                <div class="field">
                  <div class="label">Customer</div>
                  <div class="value">${escapeHtml(customerName)}</div>
                </div>
                <div class="field">
                  <div class="label">Customer Email</div>
                  <div class="value">${escapeHtml(customerEmail)}</div>
                </div>
                <div class="field">
                  <div class="label">Mentor</div>
                  <div class="value">${escapeHtml(mentorName)}</div>
                </div>
                <div class="field">
                  <div class="label">Scheduled For</div>
                  <div class="value">${escapeHtml(scheduledLabel)}</div>
                </div>
                <div class="field">
                  <div class="label">Discovery Call ID</div>
                  <div class="value">${escapeHtml(booking.id)}</div>
                </div>
                ${meetingUrl ? `
                <div class="field">
                  <div class="label">Meeting URL</div>
                  <div class="value"><a href="${escapeHtml(meetingUrl)}" target="_blank">${escapeHtml(meetingUrl)}</a></div>
                </div>
                ` : ""}
                <a href="${dashboardUrl}" class="button">Open Supabase Dashboard</a>
                <div class="footer">
                  This notification is sent only to the admin discovery call alert address.
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const emailResult = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [adminRecipient],
        subject: `Discovery Call Booked: ${customerName} with ${mentorName}`,
        html: emailHtml,
      });

      const responsePayload = {
        success: true,
        discoveryCallId,
        recipient: adminRecipient,
        emailId: emailResult.data?.id ?? null,
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
    const message = error instanceof Error ? error.message : String(error);
    console.error("[NOTIFY-DISCOVERY-CALL-BOOKED] Error:", message);
    return jsonResponse({ success: false, error: message }, 500);
  }
});