/**
 * Supabase Auth emails (confirmation, password reset, email change...), sent
 * from the auth_email_outbox queue through Resend's API since 2026-11-16.
 *
 * Why a queue: Supabase used to send these over SMTP while the request
 * waited, and on 2026-11-16 the SMTP key was rejected, so every email signup
 * failed. The Send Email hook (public.queue_auth_email) now only stores the
 * email and returns; auth-email-worker sends it and retries.
 *
 * Content follows Supabase's deliverability advice for auth emails: a short
 * subject, one button plus the plain link, no marketing, no names, no
 * signature. Import-light so Node tests load it directly.
 */

import { escapeHtml } from "./email-voice.ts";

export interface AuthEmailEvent {
  email: string;
  new_email?: string | null;
  email_data: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type: string;
    site_url?: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

export interface AuthEmailMessage {
  to: string;
  /** The Supabase verify type for the link (the action type). */
  type: string;
  token: string;
  tokenHash: string;
}

/**
 * Who gets which email. Email change is the tricky one: with Secure Email
 * Change on, Supabase sends two token pairs and the names are reversed for
 * backward compatibility (Send Email Hook docs, "Counterintuitive field
 * naming"): the CURRENT address uses token + token_hash_new, the NEW address
 * uses token_new + token_hash.
 */
export function authEmailMessages(event: AuthEmailEvent): AuthEmailMessage[] {
  const data = event.email_data;
  const type = data.email_action_type;
  const token = data.token ?? "";
  const tokenHash = data.token_hash ?? "";
  if (type === "email_change") {
    const newEmail = (event.new_email ?? "").trim();
    if (data.token_hash_new) {
      return [
        { to: event.email, type, token, tokenHash: data.token_hash_new },
        ...(newEmail ? [{ to: newEmail, type, token: data.token_new ?? "", tokenHash }] : []),
      ];
    }
    return newEmail ? [{ to: newEmail, type, token, tokenHash }] : [];
  }
  return [{ to: event.email, type, token, tokenHash }];
}

/** Supabase's own verify link: it confirms the token and redirects with a session. */
export function verifyUrl(supabaseUrl: string, message: Pick<AuthEmailMessage, "type" | "tokenHash">, redirectTo: string) {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/auth/v1/verify?token=${encodeURIComponent(message.tokenHash)}&type=${encodeURIComponent(message.type)}&redirect_to=${encodeURIComponent(redirectTo)}`;
}

interface Copy {
  subject: string;
  intro: string;
  button?: string;
  /** Shown under the button. */
  note: string;
}

const IGNORE = "If you did not ask for this, you can ignore this email.";
const CONTACT = "If this was not you, contact us at https://creatives-takeover.com/contact.";

function copyFor(type: string, isCurrentAddressOfChange: boolean): Copy {
  switch (type) {
    case "signup":
      return { subject: "Confirm your email", intro: "Confirm your email address to finish creating your Creatives Takeover account.", button: "Confirm email", note: IGNORE };
    case "recovery":
      return { subject: "Reset your password", intro: "We got a request to reset the password for your Creatives Takeover account. Use the button below to choose a new one.", button: "Reset password", note: IGNORE };
    case "magiclink":
    case "email":
      return { subject: "Your sign-in link", intro: "Use the button below to sign in to Creatives Takeover.", button: "Sign in", note: IGNORE };
    case "invite":
      return { subject: "You have been invited to Creatives Takeover", intro: "You have been invited to create an account on Creatives Takeover.", button: "Accept the invitation", note: IGNORE };
    case "email_change":
      return isCurrentAddressOfChange
        ? { subject: "Confirm your email change", intro: "Confirm that you want to change the email address of your Creatives Takeover account.", button: "Confirm the change", note: CONTACT }
        : { subject: "Confirm your new email address", intro: "Confirm this address as the new email for your Creatives Takeover account.", button: "Confirm new email", note: IGNORE };
    case "reauthentication":
      return { subject: "Your verification code", intro: "Enter this code to confirm it is you:", note: IGNORE };
    case "password_changed_notification":
      return { subject: "Your password was changed", intro: "The password for your Creatives Takeover account was just changed.", note: CONTACT };
    case "email_changed_notification":
      return { subject: "Your email address was changed", intro: "The email address of your Creatives Takeover account was just changed.", note: CONTACT };
    default:
      return { subject: "A change to your account", intro: "There was a security change on your Creatives Takeover account.", note: CONTACT };
  }
}

export interface RenderedAuthEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderAuthEmail(input: {
  message: AuthEmailMessage;
  supabaseUrl: string;
  redirectTo: string;
  /** True for the email to the current address during an email change. */
  isCurrentAddressOfChange?: boolean;
}): RenderedAuthEmail {
  const { message } = input;
  const copy = copyFor(message.type, Boolean(input.isCurrentAddressOfChange));
  const link = copy.button ? verifyUrl(input.supabaseUrl, message, input.redirectTo) : null;
  const code = message.type === "reauthentication" ? message.token : null;

  const html = [
    `<div style="max-width:520px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0f172a">`,
    `<p style="margin:0 0 16px">${escapeHtml(copy.intro)}</p>`,
    code ? `<p style="margin:0 0 16px;font-size:24px;font-weight:700;letter-spacing:4px">${escapeHtml(code)}</p>` : "",
    link && copy.button
      ? `<p style="margin:20px 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:11px 20px;background:#0f172a;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(copy.button)}</a></p>`
        + `<p style="margin:0 0 16px;font-size:13px;color:#475569">If the button does not work, open this link: <a href="${escapeHtml(link)}" style="color:#475569;word-break:break-all">${escapeHtml(link)}</a></p>`
      : "",
    `<p style="margin:0;font-size:13px;color:#64748b">${escapeHtml(copy.note)}</p>`,
    `</div>`,
  ].join("");

  const text = [
    copy.intro,
    code,
    link && copy.button ? `${copy.button}: ${link}` : null,
    copy.note,
  ].filter(Boolean).join("\n\n");

  return { subject: copy.subject, html, text };
}
