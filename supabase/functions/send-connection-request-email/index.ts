import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

interface ConnectionRequestEmailPayload {
  friendRequestId: string;
  senderId: string;
  recipientId: string;
}

type DeliveryStatus = "pending" | "sending" | "sent" | "failed" | "skipped";

function getEnv(name: string): string {
  return (Deno.env.get(name) ?? "").trim();
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayName(profile: { full_name?: string | null; username?: string | null } | null, fallback: string): string {
  return profile?.full_name?.trim() || profile?.username?.trim() || fallback;
}

const supabaseUrl = getEnv("SUPABASE_URL");
const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resendApiKey = getEnv("RESEND_API_KEY");
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const appUrl = (getEnv("APP_URL") || "https://creatives-takeover.com").replace(/\/$/, "");

async function updateDelivery(
  friendRequestId: string,
  recipientId: string,
  status: DeliveryStatus,
  patch: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase
    .from("connection_request_email_notifications")
    .update({ status, ...patch, updated_at: new Date().toISOString() })
    .eq("friend_request_id", friendRequestId)
    .eq("recipient_id", recipientId);
  if (error) console.error("[CONNECTION_REQUEST_EMAIL] Delivery update failed", error.message);
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405 });
  if (!supabaseUrl || !supabaseServiceKey) return new Response(JSON.stringify({ ok: false, error: "Supabase environment is not configured" }), { status: 500 });

  // This endpoint is invoked only by the database outbox using the service-role key.
  if (req.headers.get("authorization") !== `Bearer ${supabaseServiceKey}`) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
  }

  let payload: Partial<ConnectionRequestEmailPayload> = {};
  try {
    payload = await req.json() as ConnectionRequestEmailPayload;
    const { friendRequestId, senderId, recipientId } = payload;
    if (!friendRequestId || !senderId || !recipientId || senderId === recipientId) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid notification payload" }), { status: 400 });
    }

    const { data: delivery } = await supabase
      .from("connection_request_email_notifications")
      .select("status, sender_id, recipient_id")
      .eq("friend_request_id", friendRequestId)
      .eq("recipient_id", recipientId)
      .maybeSingle();

    if (!delivery || delivery.sender_id !== senderId || delivery.recipient_id !== recipientId) {
      return new Response(JSON.stringify({ ok: false, error: "Notification outbox entry not found" }), { status: 404 });
    }
    if (delivery.status === "sent" || delivery.status === "skipped") {
      return new Response(JSON.stringify({ ok: true, skipped: delivery.status }), { status: 200 });
    }

    await updateDelivery(friendRequestId, recipientId, "sending");

    const [{ data: request, error: requestError }, { data: preference }, { data: profiles, error: profileError }] = await Promise.all([
      supabase.from("friend_requests").select("id, sender_id, receiver_id, status, message").eq("id", friendRequestId).maybeSingle(),
      supabase.from("notification_preferences").select("connection_request_email_enabled").eq("user_id", recipientId).maybeSingle(),
      supabase.from("profiles").select("id, full_name, username").in("id", [senderId, recipientId]),
    ]);

    if (requestError || !request || request.sender_id !== senderId || request.receiver_id !== recipientId || request.status !== "pending") {
      await updateDelivery(friendRequestId, recipientId, "skipped", { last_error: requestError?.message || "Connection request is no longer pending" });
      return new Response(JSON.stringify({ ok: true, skipped: "request_not_pending" }), { status: 200 });
    }
    if (preference?.connection_request_email_enabled === false) {
      await updateDelivery(friendRequestId, recipientId, "skipped", { last_error: null });
      return new Response(JSON.stringify({ ok: true, skipped: "preference_disabled" }), { status: 200 });
    }
    if (profileError) throw profileError;

    const sender = profiles?.find((profile) => profile.id === senderId) ?? null;
    const recipient = profiles?.find((profile) => profile.id === recipientId) ?? null;
    const senderName = displayName(sender, "A founder");
    const recipientName = displayName(recipient, "there");

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(recipientId);
    const recipientEmail = authUser?.user?.email?.trim();
    if (authError || !recipientEmail) throw new Error(authError?.message || "Recipient email is missing");
    if (!resend) throw new Error("RESEND_API_KEY is not configured");

    const fromEmail = getEnv("FROM_EMAIL").includes("@") ? getEnv("FROM_EMAIL") : "onboarding@resend.dev";
    const fromName = getEnv("FROM_NAME") || "Creatives Takeover";
    const senderEscaped = escapeHtml(senderName);
    const recipientEscaped = escapeHtml(recipientName);
    const requestMessage = request.message?.trim();
    const messageBlock = requestMessage
      ? `<div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:12px;margin:16px 0;color:#374151;white-space:pre-wrap;">${escapeHtml(requestMessage.slice(0, 500))}</div>`
      : "";

    const email = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [recipientEmail],
      subject: `${senderName} sent you a connection request`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827;">
        <h2 style="margin:0 0 16px;">New connection request</h2>
        <p>Hi ${recipientEscaped},</p>
        <p><strong>${senderEscaped}</strong> sent you a connection request on Creatives Takeover.</p>
        ${messageBlock}
        <p style="margin:24px 0;"><a href="${appUrl}/account" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;">Review request</a></p>
        <p style="color:#6B7280;font-size:12px;">You received this email because connection request emails are enabled in your account.</p>
      </div>`,
    });

    const resendEmailId = email.data?.id;
    if (!resendEmailId) throw new Error(email.error?.message || "Resend did not return an email ID");
    await updateDelivery(friendRequestId, recipientId, "sent", { resend_email_id: resendEmailId, last_error: null });
    return new Response(JSON.stringify({ ok: true, resendEmailId }), { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[CONNECTION_REQUEST_EMAIL] Delivery failed", message);
    // The queue remains retryable; the scheduled requeue worker will retry it.
    if (payload.friendRequestId && payload.recipientId) {
      await updateDelivery(payload.friendRequestId, payload.recipientId, "failed", { last_error: message });
    }
    return new Response(JSON.stringify({ ok: false, error: message }), { status: 500 });
  }
});
