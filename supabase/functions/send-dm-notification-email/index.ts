import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dm-webhook-secret",
};

interface DmEmailPayload {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
}

interface DeliveryAuthRow {
  status: "pending" | "sending" | "sent" | "failed" | "skipped";
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
}

interface DeliveryUpdate {
  status: "pending" | "sending" | "sent" | "failed" | "skipped";
  last_error?: string | null;
  resend_email_id?: string | null;
  delivered_at?: string | null;
  metadataPatch?: Record<string, unknown>;
}

function getEnv(name: string): string {
  return (Deno.env.get(name) ?? "").trim();
}

const supabaseUrl = getEnv("SUPABASE_URL");
const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resendApiKey = getEnv("RESEND_API_KEY");
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const appUrl = (getEnv("APP_URL") || "https://creatives-takeover.com").replace(/\/$/, "");

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeReplyTo(input: string): string | null {
  const value = (input || "").trim();
  if (!value) return null;

  const plainEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const namedEmailRegex = /^[^<>]+<\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*>$/;

  if (plainEmailRegex.test(value) || namedEmailRegex.test(value)) {
    return value;
  }

  return null;
}

function buildSnippet(input: string, maxLength = 220): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return "Open your inbox to read the new message.";
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}...`;
}

function resolveDisplayName(profile?: { full_name?: string | null; username?: string | null } | null, fallback = "Someone"): string {
  const fullName = profile?.full_name?.trim();
  if (fullName) return fullName;
  const username = profile?.username?.trim();
  if (username) return username;
  return fallback;
}

async function updateDelivery(messageId: string, recipientId: string, update: DeliveryUpdate): Promise<void> {
  let metadataPatch: Record<string, unknown> = {};
  if (update.metadataPatch && typeof update.metadataPatch === "object") {
    metadataPatch = update.metadataPatch;
  }

  const { error } = await supabase
    .from("message_email_notifications")
    .update({
      status: update.status,
      last_error: update.last_error ?? null,
      resend_email_id: update.resend_email_id ?? null,
      delivered_at: update.delivered_at ?? null,
      metadata: {
        ...metadataPatch,
        updated_by: "send-dm-notification-email",
        updated_at_iso: new Date().toISOString(),
      },
    })
    .eq("message_id", messageId)
    .eq("recipient_id", recipientId);

  if (error) {
    console.error("[DM-EMAIL] Failed to update delivery record", {
      messageId,
      recipientId,
      error: error.message,
    });
  }
}

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

    const payload = (await req.json()) as DmEmailPayload;
    const { messageId, conversationId, senderId, recipientId } = payload;

    if (!messageId || !conversationId || !senderId || !recipientId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing required payload fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const expectedSecret = getEnv("DM_EMAIL_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-dm-webhook-secret");

    if (expectedSecret && providedSecret !== expectedSecret) {
      // Fallback auth path for queued DB-trigger calls where the app setting may be absent.
      const { data: deliveryAuthRow } = await supabase
        .from("message_email_notifications")
        .select("status, conversation_id, sender_id, recipient_id")
        .eq("message_id", messageId)
        .eq("recipient_id", recipientId)
        .maybeSingle();

      const deliveryMatch = deliveryAuthRow as DeliveryAuthRow | null;
      const canFallbackAuthorize =
        !!deliveryMatch &&
        ["pending", "sending", "failed"].includes(deliveryMatch.status) &&
        deliveryMatch.conversation_id === conversationId &&
        deliveryMatch.sender_id === senderId &&
        deliveryMatch.recipient_id === recipientId;

      if (!canFallbackAuthorize) {
        console.warn("[DM-EMAIL] Unauthorized webhook request", {
          messageId,
          recipientId,
          hasDeliveryRow: Boolean(deliveryMatch),
        });
        return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      console.warn("[DM-EMAIL] Secret mismatch bypassed via queued-row verification", {
        messageId,
        recipientId,
        status: deliveryMatch.status,
      });
    }

    console.log("[DM-EMAIL] Processing notification", {
      messageId,
      conversationId,
      senderId,
      recipientId,
    });

    const { data: deliveryRow } = await supabase
      .from("message_email_notifications")
      .select("status, resend_email_id")
      .eq("message_id", messageId)
      .eq("recipient_id", recipientId)
      .maybeSingle();

    if (deliveryRow?.status === "sent") {
      console.log("[DM-EMAIL] Already sent, skipping duplicate", {
        messageId,
        recipientId,
        resendEmailId: deliveryRow.resend_email_id,
      });
      return new Response(JSON.stringify({ ok: true, skipped: "already_sent" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    await updateDelivery(messageId, recipientId, {
      status: "sending",
      metadataPatch: { stage: "start" },
    });

    const { data: messageRow, error: messageError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .eq("id", messageId)
      .maybeSingle();

    if (messageError || !messageRow) {
      const reason = messageError?.message || "Message not found";
      await updateDelivery(messageId, recipientId, {
        status: "failed",
        last_error: reason,
        metadataPatch: { stage: "fetch_message_failed" },
      });
      return new Response(JSON.stringify({ ok: false, error: reason }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (messageRow.conversation_id !== conversationId || messageRow.sender_id !== senderId) {
      await updateDelivery(messageId, recipientId, {
        status: "failed",
        last_error: "Payload mismatch with message row",
        metadataPatch: {
          stage: "payload_mismatch",
          payloadConversationId: conversationId,
          rowConversationId: messageRow.conversation_id,
          payloadSenderId: senderId,
          rowSenderId: messageRow.sender_id,
        },
      });
      return new Response(JSON.stringify({ ok: false, error: "Payload mismatch" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (senderId === recipientId) {
      await updateDelivery(messageId, recipientId, {
        status: "skipped",
        last_error: "Sender and recipient are the same user",
        metadataPatch: { stage: "self_message_skip" },
      });
      return new Response(JSON.stringify({ ok: true, skipped: "self_message" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: conversationRow, error: conversationError } = await supabase
      .from("conversations")
      .select("id, participants, is_group")
      .eq("id", conversationId)
      .maybeSingle();

    if (conversationError || !conversationRow) {
      const reason = conversationError?.message || "Conversation not found";
      await updateDelivery(messageId, recipientId, {
        status: "failed",
        last_error: reason,
        metadataPatch: { stage: "fetch_conversation_failed" },
      });
      return new Response(JSON.stringify({ ok: false, error: reason }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const participants = Array.isArray(conversationRow.participants)
      ? (conversationRow.participants as string[])
      : [];
    const expectedRecipientId = participants.find((participantId) => participantId !== senderId) || null;
    const isValidDirectConversation =
      conversationRow.is_group === false &&
      participants.length === 2 &&
      participants.includes(senderId) &&
      expectedRecipientId === recipientId;

    if (!isValidDirectConversation) {
      await updateDelivery(messageId, recipientId, {
        status: "failed",
        last_error: "Recipient does not match conversation participants",
        metadataPatch: {
          stage: "recipient_mismatch",
          participants,
          expectedRecipientId,
          payloadRecipientId: recipientId,
          payloadSenderId: senderId,
        },
      });
      return new Response(JSON.stringify({ ok: false, error: "Recipient mismatch" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username")
      .in("id", [senderId, recipientId]);

    if (profileError) {
      await updateDelivery(messageId, recipientId, {
        status: "failed",
        last_error: profileError.message,
        metadataPatch: { stage: "fetch_profiles_failed" },
      });
      return new Response(JSON.stringify({ ok: false, error: profileError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const senderProfile = profileRows?.find((row) => row.id === senderId) || null;
    const recipientProfile = profileRows?.find((row) => row.id === recipientId) || null;

    const senderName = resolveDisplayName(senderProfile, "A founder");
    const recipientName = resolveDisplayName(recipientProfile, "there");

    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(recipientId);
    const recipientEmail = authUser?.user?.email?.trim();

    if (authUserError || !recipientEmail) {
      const reason = authUserError?.message || "Recipient email missing";
      await updateDelivery(messageId, recipientId, {
        status: "failed",
        last_error: reason,
        metadataPatch: { stage: "recipient_email_missing" },
      });
      return new Response(JSON.stringify({ ok: false, error: reason }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!resend) {
      await updateDelivery(messageId, recipientId, {
        status: "failed",
        last_error: "RESEND_API_KEY is not configured",
        metadataPatch: { stage: "resend_not_configured" },
      });
      return new Response(JSON.stringify({ ok: false, error: "Email provider not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const configuredFromEmail = getEnv("FROM_EMAIL");
    const fromEmail =
      configuredFromEmail && configuredFromEmail.includes("@")
        ? configuredFromEmail
        : "onboarding@resend.dev";

    if (!configuredFromEmail || !configuredFromEmail.includes("@")) {
      console.warn("[DM-EMAIL] Invalid or missing FROM_EMAIL, using fallback", {
        configuredFromEmail,
        fallbackFromEmail: fromEmail,
      });
    }

    const fromName = getEnv("FROM_NAME") || "Creatives Takeover";
    const replyTo = getEnv("REPLY_TO_EMAIL");
    const subject = `${senderName} sent you a new message`;
    const messagePreview = escapeHtml(buildSnippet(messageRow.content));
    const senderDisplayEscaped = escapeHtml(senderName);
    const recipientDisplayEscaped = escapeHtml(recipientName);
    const conversationUrl = `${appUrl}/messages?conversationId=${encodeURIComponent(conversationId)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
        <h2 style="margin: 0 0 16px;">New message on Creatives Takeover</h2>
        <p style="margin: 0 0 12px;">Hi ${recipientDisplayEscaped},</p>
        <p style="margin: 0 0 12px;">
          <strong>${senderDisplayEscaped}</strong> sent you a new direct message.
        </p>
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; margin: 16px 0;">
          <p style="margin: 0; white-space: pre-wrap;">${messagePreview}</p>
        </div>
        <p style="margin: 0 0 16px;">
          <a
            href="${conversationUrl}"
            style="display: inline-block; background: #111827; color: #FFFFFF; padding: 10px 14px; border-radius: 6px; text-decoration: none;"
          >Open Conversation</a>
        </p>
        <p style="margin: 0; color: #6B7280; font-size: 12px;">
          You received this email because DM notifications are enabled for your account.
        </p>
      </div>
    `;

    const sendPayload: Record<string, unknown> = {
      from: `${fromName} <${fromEmail}>`,
      to: [recipientEmail],
      subject,
      html,
    };

    const normalizedReplyTo = normalizeReplyTo(replyTo);
    if (normalizedReplyTo) {
      (sendPayload as { reply_to?: string }).reply_to = normalizedReplyTo;
    } else if (replyTo) {
      console.warn("[DM-EMAIL] Skipping invalid REPLY_TO_EMAIL value", { replyTo });
    }

    const emailResponse = await resend.emails.send(sendPayload as never);
    const resendEmailId = emailResponse?.data?.id ?? null;
    const resendError = emailResponse?.error;

    if (resendError || !resendEmailId) {
      const reason = resendError ? JSON.stringify(resendError) : "Resend did not return an email ID";
      await updateDelivery(messageId, recipientId, {
        status: "failed",
        last_error: reason,
        metadataPatch: { stage: "resend_failed" },
      });
      return new Response(JSON.stringify({ ok: false, error: reason }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    await updateDelivery(messageId, recipientId, {
      status: "sent",
      resend_email_id: resendEmailId,
      delivered_at: null,
      last_error: null,
      metadataPatch: {
        stage: "sent",
        accepted_by_provider_at_iso: new Date().toISOString(),
        recipientEmail,
        senderName,
      },
    });

    console.log("[DM-EMAIL] Email sent", {
      messageId,
      recipientId,
      recipientEmail,
      resendEmailId,
    });

    return new Response(JSON.stringify({ ok: true, resendEmailId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[DM-EMAIL] Unhandled error", { message });
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
