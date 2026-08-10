import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_PASSWORD_LENGTH = 8;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

function getPasswordValidationError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number";
  }

  return null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildNotificationHtml(accountEmail: string, securityUrl: string): string {
  const safeEmail = escapeHtml(accountEmail);
  const safeSecurityUrl = escapeHtml(securityUrl);

  return `
    <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; line-height: 1.6; color: #0f172a; max-width: 560px; margin: 0 auto;">
      <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">Your password was changed</h1>
      <p style="margin: 0 0 12px; color: #334155;">The password for <strong>${safeEmail}</strong> was changed successfully.</p>
      <p style="margin: 0 0 20px; color: #334155;">If you made this change, no further action is needed.</p>
      <p style="margin: 0 0 20px; color: #b42318;"><strong>If you did not make this change, reset your password immediately and contact support.</strong></p>
      <a href="${safeSecurityUrl}" style="display: inline-block; background: #667eea; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Review security settings</a>
      <p style="margin: 24px 0 0; color: #64748b; font-size: 13px;">— The Creatives Takeover Team</p>
    </div>
  `;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("change-password: missing Supabase configuration");
    return json(500, { success: false, error: "Password service is not configured." });
  }

  if (!token) {
    return json(401, { success: false, code: "UNAUTHORIZED", error: "Please sign in again before changing your password." });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword) {
      return json(400, { success: false, code: "CURRENT_PASSWORD_REQUIRED", error: "Enter your current password." });
    }

    const passwordError = getPasswordValidationError(newPassword);
    if (passwordError) {
      return json(400, { success: false, code: "WEAK_PASSWORD", error: passwordError });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: authenticatedUser, error: userError } = await authClient.auth.getUser(token);
    const user = authenticatedUser.user;

    if (userError || !user?.id || !user.email) {
      return json(401, { success: false, code: "UNAUTHORIZED", error: "Your session expired. Please sign in again." });
    }

    // Verify the submitted current password with Supabase Auth on the server.
    // The browser's active session alone is not sufficient authorization for this change.
    const verificationClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: verification, error: verificationError } = await verificationClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verificationError || verification.user?.id !== user.id) {
      if (verificationError?.status === 429) {
        return json(429, { success: false, code: "RATE_LIMITED", error: "Too many verification attempts. Please wait and try again." });
      }
      return json(400, { success: false, code: "CURRENT_PASSWORD_INCORRECT", error: "Current password is incorrect." });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error("change-password: Supabase update failed", { userId: user.id, message: updateError.message });
      return json(500, { success: false, code: "UPDATE_FAILED", error: "Your password could not be changed. Please try again." });
    }

    // This notification is deliberately attempted only after Supabase confirms the update.
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("change-password: password updated but RESEND_API_KEY is missing", { userId: user.id });
      return json(200, { success: true, notificationSent: false });
    }

    try {
      const fromEmail = Deno.env.get("FROM_EMAIL") || "no-reply@creatives-takeover.com";
      const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";
      const appUrl = (Deno.env.get("APP_URL") || "https://creatives-takeover.com").replace(/\/$/, "");
      const resend = new Resend(resendApiKey);
      const emailResult = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [user.email],
        subject: "Your Creatives Takeover password was changed",
        html: buildNotificationHtml(user.email, `${appUrl}/settings/security`),
      });

      if (emailResult.error || !emailResult.data?.id) {
        console.error("change-password: password updated but notification failed", {
          userId: user.id,
          message: emailResult.error?.message || "No email id returned",
        });
        return json(200, { success: true, notificationSent: false });
      }

      console.log("change-password: completed", { userId: user.id, emailId: emailResult.data.id });
      return json(200, { success: true, notificationSent: true });
    } catch (emailError) {
      console.error("change-password: password updated but notification threw", {
        userId: user.id,
        message: emailError instanceof Error ? emailError.message : String(emailError),
      });
      return json(200, { success: true, notificationSent: false });
    }
  } catch (error) {
    console.error("change-password: unexpected error", error instanceof Error ? error.message : String(error));
    return json(500, { success: false, error: "Unexpected error. Please try again." });
  }
});
