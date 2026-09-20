import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

/**
 * The three emails the approval flow sends: an alert to the reviewer when a
 * request arrives, and the decision to the applicant.
 *
 * Invoked only by the database outbox, which carries the service-role key held
 * in private.service_config. That key is a different representation of the one
 * injected here, so the token is verified through verify_outbox_secret rather
 * than compared directly; comparing the strings is what silently 401'd every
 * connection request email for a month.
 */

type Kind = "admin_alert" | "approved" | "rejected";
type DeliveryStatus = "pending" | "sending" | "sent" | "failed" | "skipped";

const CATEGORY_LABEL: Record<string, string> = {
  mentor: "Mentor",
  marketplace: "Marketplace provider",
  investor: "Investor",
};

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
const adminAddress = getEnv("ADMIN_REVIEW_EMAIL") || "admin@creatives-takeover.com";

async function updateDelivery(applicationId: string, kind: Kind, status: DeliveryStatus, patch: Record<string, unknown> = {}) {
  const { error } = await supabase
    .from("account_application_email_notifications")
    .update({ status, ...patch, updated_at: new Date().toISOString() })
    .eq("application_id", applicationId)
    .eq("kind", kind);
  if (error) console.error("[ACCOUNT_APPLICATION_EMAIL] Delivery update failed", error.message);
}

function shell(body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:Inter,Arial,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
    ${body}
    <p style="margin-top:28px;font-size:12px;line-height:20px;color:#6b7280;">
      Creatives Takeover is a business development platform for early stage founders.
    </p>
  </div></body></html>`;
}

/** Copy is deliberately plain, and carries no dashes. */
function compose(kind: Kind, name: string, category: string, submittedAt: string, note: string | null) {
  const safeName = escapeHtml(name);
  const safeCategory = escapeHtml(category);

  if (kind === "admin_alert") {
    return {
      to: adminAddress,
      subject: `New ${category} request from ${name}`,
      html: shell(`
        <h1 style="margin:0 0 16px;font-size:20px;">New account request</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:24px;">A new request is waiting for review.</p>
        <table style="width:100%;font-size:15px;line-height:24px;border-collapse:collapse;">
          <tr><td style="padding:4px 0;color:#6b7280;">Name</td><td style="padding:4px 0;">${safeName}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Category</td><td style="padding:4px 0;">${safeCategory}</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Submitted</td><td style="padding:4px 0;">${escapeHtml(submittedAt)}</td></tr>
        </table>
        <p style="margin:20px 0 0;"><a href="${appUrl}/admin/account-requests" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Review the request</a></p>`),
    };
  }

  if (kind === "approved") {
    return {
      to: null,
      subject: `Your ${category} account is approved`,
      html: shell(`
        <h1 style="margin:0 0 16px;font-size:20px;">You are approved</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:24px;">Hello ${safeName},</p>
        <p style="margin:0 0 12px;font-size:15px;line-height:24px;">Your request to join Creatives Takeover as a ${safeCategory} has been approved. Your account now has access to the features for that category.</p>
        <p style="margin:20px 0 0;"><a href="${appUrl}/" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">Open your account</a></p>`),
    };
  }

  return {
    to: null,
    subject: `An update on your ${category} request`,
    html: shell(`
      <h1 style="margin:0 0 16px;font-size:20px;">Your request was not approved</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;">Hello ${safeName},</p>
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;">Thank you for your interest in joining Creatives Takeover as a ${safeCategory}. After review we are not able to approve the request at this time.</p>
      ${note ? `<p style="margin:0 0 12px;font-size:15px;line-height:24px;">${escapeHtml(note)}</p>` : ""}
      <p style="margin:0 0 12px;font-size:15px;line-height:24px;">Your account remains active as a regular member, and you are welcome to apply again later.</p>`),
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

  let applicationId = "";
  let kind: Kind = "admin_alert";
  try {
    const payload = await req.json() as { applicationId?: string; kind?: Kind };
    applicationId = payload.applicationId ?? "";
    kind = payload.kind ?? "admin_alert";
    if (!applicationId || !["admin_alert", "approved", "rejected"].includes(kind)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid payload" }), { status: 400 });
    }

    const { data: application, error: applicationError } = await supabase
      .from("account_applications")
      .select("id, user_id, user_type, status, full_name, email, submitted_at, decision_note")
      .eq("id", applicationId)
      .maybeSingle();
    if (applicationError || !application) {
      await updateDelivery(applicationId, kind, "failed", { last_error: "Application not found" });
      return new Response(JSON.stringify({ ok: false, error: "Application not found" }), { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", application.user_id)
      .maybeSingle();

    const name = (application.full_name || profile?.full_name || profile?.username || "there").trim();
    const category = CATEGORY_LABEL[application.user_type] ?? application.user_type;
    const submitted = new Date(application.submitted_at).toISOString().slice(0, 10);

    // The applicant address is read from auth rather than trusted from the row,
    // so a decision email cannot be redirected by whatever was submitted.
    let recipient = compose(kind, name, category, submitted, application.decision_note).to;
    if (!recipient) {
      const { data: authUser } = await supabase.auth.admin.getUserById(application.user_id);
      recipient = authUser?.user?.email ?? null;
    }
    if (!recipient) {
      await updateDelivery(applicationId, kind, "failed", { last_error: "No recipient address" });
      return new Response(JSON.stringify({ ok: false, error: "No recipient" }), { status: 422 });
    }

    if (!resend) {
      await updateDelivery(applicationId, kind, "failed", { last_error: "RESEND_API_KEY is not configured" });
      return new Response(JSON.stringify({ ok: false, error: "Email is not configured" }), { status: 500 });
    }

    const message = compose(kind, name, category, submitted, application.decision_note);
    const { data: sent, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: [recipient],
      subject: message.subject,
      html: message.html,
    });

    if (sendError) {
      await updateDelivery(applicationId, kind, "failed", { last_error: sendError.message });
      return new Response(JSON.stringify({ ok: false, error: sendError.message }), { status: 502 });
    }

    await updateDelivery(applicationId, kind, "sent", { resend_email_id: sent?.id ?? null });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unexpected failure";
    if (applicationId) await updateDelivery(applicationId, kind, "failed", { last_error: reason });
    console.error("[ACCOUNT_APPLICATION_EMAIL]", reason);
    return new Response(JSON.stringify({ ok: false, error: reason }), { status: 500 });
  }
});
