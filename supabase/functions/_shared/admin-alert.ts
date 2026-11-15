/**
 * Short operational emails to the team (budget limits and similar), through
 * Resend. Recipients follow ai-provider-health: the two required inboxes plus
 * every valid address in ADMIN_NOTIFICATION_EMAILS, read loosely because that
 * secret once held a value Resend rejected as a `to` list.
 */

import { Resend } from "npm:resend@2.0.0";

const REQUIRED_ADMIN_RECIPIENTS = ["admin@creatives-takeover.com", "javier@creatives-takeover.com"];
const EMAIL_PATTERN = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;

export function adminRecipients(): string[] {
  const configured = (Deno.env.get("ADMIN_NOTIFICATION_EMAILS") || "")
    .split(/[,;\s]+/)
    .map((entry) => entry.replace(/^[\s"'<[(]+|[\s"'>\])]+$/g, "").trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...REQUIRED_ADMIN_RECIPIENTS, ...configured.filter((entry) => EMAIL_PATTERN.test(entry))]));
}

/** Sends one plain email to the team; false when Resend is not configured or the send failed. */
export async function sendAdminEmail(subject: string, lines: string[]): Promise<boolean> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return false;
  const escape = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
  const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
  const fromName = Deno.env.get("FROM_NAME") || "Creatives Takeover";
  const sent = await new Resend(resendKey).emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: adminRecipients(),
    subject,
    html: lines.map((line) => `<p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">${escape(line)}</p>`).join(""),
  });
  if (sent.error) console.error("admin alert email failed:", sent.error);
  return !sent.error;
}
