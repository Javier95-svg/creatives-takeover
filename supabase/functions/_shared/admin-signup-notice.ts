/**
 * The admins' "new signup" email (2026-11-17).
 *
 * A trigger on auth.users queues one notice per new account in
 * auth_email_outbox (type admin_new_signup), so it is sent by the server for
 * every account: email, Google, LinkedIn or X, confirmed or not. It used to be
 * sent from the new member's browser on their first sign-in (notify-admin),
 * which missed anyone who never confirmed, closed the tab or blocked the call.
 *
 * auth-email-worker renders it at send time with the account as it is then,
 * so the status says whether the person has confirmed yet. Import-light so
 * Node tests load it directly.
 */

import { escapeHtml } from "./email-voice.ts";

export const ADMIN_SIGNUP_NOTICE_TYPE = "admin_new_signup";

/** What the trigger stores; the worker prefers the live account when it exists. */
export interface AdminSignupPayload {
  user_id: string;
  email?: string | null;
  provider?: string | null;
  full_name?: string | null;
  created_at?: string | null;
}

export interface AdminSignupAccount {
  email: string;
  name: string | null;
  provider: string | null;
  confirmed: boolean;
  createdAt: string | null;
  /** False when the account was deleted before the notice went out. */
  exists: boolean;
}

const PROVIDERS: Record<string, string> = {
  email: "Email and password",
  google: "Google",
  linkedin_oidc: "LinkedIn",
  linkedin: "LinkedIn",
  x: "X",
  twitter: "X",
};

export function providerLabel(provider: string | null | undefined): string {
  if (!provider) return "Unknown";
  return PROVIDERS[provider] ?? provider;
}

/** Provider metadata keys differ (LinkedIn has no full_name), so try each. */
export function nameFromMetadata(meta: Record<string, unknown> | null | undefined): string | null {
  if (!meta) return null;
  for (const key of ["full_name", "name", "display_name", "user_name", "preferred_username"]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 120);
  }
  const given = typeof meta.given_name === "string" ? meta.given_name.trim() : "";
  const family = typeof meta.family_name === "string" ? meta.family_name.trim() : "";
  return `${given} ${family}`.trim() || null;
}

function statusLine(account: AdminSignupAccount): string {
  if (!account.exists) return "Deleted before this notice was sent";
  if (account.confirmed) return "Confirmed";
  return "Waiting for email confirmation (they have not clicked the link yet)";
}

function formatTime(iso: string | null): string {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function renderAdminSignupNotice(account: AdminSignupAccount, projectRef = "rcjlaybjnozqbsoxzboa") {
  const who = account.name || account.email || "Someone";
  const method = providerLabel(account.provider);
  const dashboard = `https://supabase.com/dashboard/project/${projectRef}/auth/users`;
  const rows: Array<[string, string]> = [
    ["Name", account.name || "Not given"],
    ["Email", account.email || "Not given"],
    ["Signed up with", method],
    ["Status", statusLine(account)],
    ["Created", formatTime(account.createdAt)],
  ];

  const subject = `New signup: ${who} (${method})`.slice(0, 140);
  const intro = `${who} just created a Creatives Takeover account.`;

  const html = [
    `<div style="max-width:520px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0f172a">`,
    `<p style="margin:0 0 16px">${escapeHtml(intro)}</p>`,
    `<table style="border-collapse:collapse;margin:0 0 16px">`,
    ...rows.map(([label, value]) =>
      `<tr><td style="padding:4px 16px 4px 0;color:#64748b;vertical-align:top">${escapeHtml(label)}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`),
    `</table>`,
    `<p style="margin:0;font-size:13px;color:#64748b"><a href="${escapeHtml(dashboard)}" style="color:#475569">Open the users list in Supabase</a></p>`,
    `</div>`,
  ].join("");

  const text = [
    intro,
    rows.map(([label, value]) => `${label}: ${value}`).join("\n"),
    `Users list in Supabase: ${dashboard}`,
  ].join("\n\n");

  return { subject, html, text };
}
