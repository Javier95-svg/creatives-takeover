import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

/**
 * The two per category emails that had a preference toggle but no sender:
 * a marketplace listing enquiry and an investor match.
 *
 * One function for both, driven by the outbox row, because a second pipeline
 * per channel is how you end up with two that drift. Invoked only by
 * queue_account_activity_email, which carries the service-role key held in
 * private.service_config; the token is checked through verify_outbox_secret
 * rather than compared directly, since the injected key is a different
 * representation of the same role.
 */

type Kind = "listing_enquiry" | "investor_match";
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

const supabaseUrl = getEnv("SUPABASE_URL");
const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resendApiKey = getEnv("RESEND_API_KEY");
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const appUrl = (getEnv("APP_URL") || "https://creatives-takeover.com").replace(/\/$/, "");
const fromAddress = getEnv("FROM_EMAIL") || "Creatives Takeover <noreply@creatives-takeover.com>";

async function settle(deliveryId: string, status: DeliveryStatus, patch: Record<string, unknown> = {}) {
  const { error } = await supabase
    .from("account_activity_email_notifications")
    .update({ status, ...patch, updated_at: new Date().toISOString() })
    .eq("id", deliveryId);
  if (error) console.error("[ACCOUNT_ACTIVITY_EMAIL] Delivery update failed", error.message);
}

function shell(body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:Inter,Arial,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
    ${body}
    <p style="margin-top:28px;font-size:12px;line-height:20px;color:#6b7280;">
      You can turn this email off in your notification settings.
    </p>
  </div></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0 0;"><a href="${href}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">${label}</a></p>`;
}

/** Copy is deliberately plain, and carries no dashes. */
function compose(kind: Kind, metadata: Record<string, unknown>) {
  if (kind === "listing_enquiry") {
    const who = escapeHtml(String(metadata.actorName ?? "Someone"));
    return {
      subject: `${String(metadata.actorName ?? "Someone")} asked about your services`,
      html: shell(`
        <h1 style="margin:0 0 16px;font-size:20px;">A new enquiry</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:24px;">${who} got in touch about what you offer on the marketplace.</p>
        ${button(`${appUrl}/marketplace/enquiries`, "Open your enquiries")}`),
    };
  }

  const founder = escapeHtml(String(metadata.founderName ?? "A founder"));
  const project = metadata.projectTitle ? escapeHtml(String(metadata.projectTitle)) : "";
  return {
    subject: `${String(metadata.founderName ?? "A founder")} matches your investment focus`,
    html: shell(`
      <h1 style="margin:0 0 16px;font-size:20px;">A new match</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;">${founder} started a project in a sector you back.</p>
      ${project ? `<p style="margin:0 0 12px;font-size:15px;line-height:24px;font-weight:600;">${project}</p>` : ""}
      ${button(`${appUrl}/investors/matches`, "See your matches")}`),
  };
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405 });
  if (!supabaseUrl || !supabaseServiceKey) return new Response(JSON.stringify({ ok: false, error: "Supabase environment is not configured" }), { status: 500 });

  const presentedToken = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: outboxSecretValid, error: outboxSecretError } = await supabase.rpc("verify_outbox_secret", { p_token: presentedToken });
  if (outboxSecretError || outboxSecretValid !== true) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
  }

  let deliveryId = "";
  try {
    const payload = await req.json() as { deliveryId?: string };
    deliveryId = payload.deliveryId ?? "";
    if (!deliveryId) return new Response(JSON.stringify({ ok: false, error: "Invalid payload" }), { status: 400 });

    const { data: delivery, error: deliveryError } = await supabase
      .from("account_activity_email_notifications")
      .select("id, kind, recipient_id, status, metadata")
      .eq("id", deliveryId)
      .maybeSingle();
    if (deliveryError || !delivery) {
      return new Response(JSON.stringify({ ok: false, error: "Delivery not found" }), { status: 404 });
    }

    // The queue already decided this one should not go out. Honouring the row
    // rather than re-deriving it keeps one answer to "was this suppressed".
    if (delivery.status === "skipped" || delivery.status === "sent") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    // The address comes from auth, never from the queued row, so a notification
    // cannot be redirected by whatever was written into metadata.
    const { data: authUser } = await supabase.auth.admin.getUserById(delivery.recipient_id);
    const recipient = authUser?.user?.email ?? null;
    if (!recipient) {
      await settle(deliveryId, "failed", { last_error: "No recipient address" });
      return new Response(JSON.stringify({ ok: false, error: "No recipient" }), { status: 422 });
    }

    if (!resend) {
      await settle(deliveryId, "failed", { last_error: "RESEND_API_KEY is not configured" });
      return new Response(JSON.stringify({ ok: false, error: "Email is not configured" }), { status: 500 });
    }

    const message = compose(delivery.kind as Kind, (delivery.metadata ?? {}) as Record<string, unknown>);
    const { data: sent, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: [recipient],
      subject: message.subject,
      html: message.html,
    });

    if (sendError) {
      await settle(deliveryId, "failed", { last_error: sendError.message });
      return new Response(JSON.stringify({ ok: false, error: sendError.message }), { status: 502 });
    }

    await settle(deliveryId, "sent", { resend_email_id: sent?.id ?? null });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unexpected failure";
    if (deliveryId) await settle(deliveryId, "failed", { last_error: reason });
    console.error("[ACCOUNT_ACTIVITY_EMAIL]", reason);
    return new Response(JSON.stringify({ ok: false, error: reason }), { status: 500 });
  }
});
