import type { AuthError } from "@supabase/supabase-js";
import { PASSWORD_REQUIREMENTS } from "./passwordPolicy.ts";

function normalizeMessage(message?: string): string {
  return (message || "").toLowerCase();
}

/**
 * Shown when Supabase Auth could not send the confirmation email (on
 * 2026-11-16 the SMTP login was rejected and every email signup failed).
 * No account is created, so say that, and point to the paths that still work.
 */
export const EMAIL_DELIVERY_FAILED =
  "We couldn't send your confirmation email, so your account wasn't created. Continue with Google, LinkedIn or X instead, or try again in a few minutes. If it keeps happening, contact us.";

/** After an email signup that needs confirmation (the email is queued, not sent inline). */
export function confirmationSentMessage(email: string): string {
  const address = email.trim();
  return `We sent a confirmation link to ${address || "your email"}. It can take a minute, and it may land in spam.`;
}

/** Auth's project-wide email limit (Authentication > Rate Limits), not this person's fault. */
export const EMAIL_RATE_LIMITED =
  "A lot of people are signing up right now. Try again in a few minutes, or continue with Google, LinkedIn or X.";

export function isEmailRateLimitError(error: Pick<AuthError, "message"> & { code?: string } | null): boolean {
  return error?.code === "over_email_send_rate_limit" || normalizeMessage(error?.message).includes("email rate limit");
}

export function isEmailDeliveryError(error: Pick<AuthError, "message"> | null): boolean {
  const message = normalizeMessage(error?.message);
  return message.includes("confirm email") || message.includes("confirmation email") || message.includes("sending email");
}

export function mapSignUpError(error: AuthError | null): string {
  if (!error) return "Failed to create account. Please try again.";

  const message = normalizeMessage(error.message);

  if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
    return "An account with this email already exists. Please sign in instead.";
  }

  if (message.includes("username") && message.includes("taken")) {
    return "That username is already taken. Please choose another one.";
  }

  if (isEmailRateLimitError(error)) {
    return EMAIL_RATE_LIMITED;
  }

  if (message.includes("too many") || message.includes("rate limit")) {
    return "Too many signup attempts. Please wait a few minutes and try again.";
  }

  if (message.includes("invalid email")) {
    return "Please enter a valid email address.";
  }

  if (message.includes("password")) {
    return PASSWORD_REQUIREMENTS;
  }

  if (message.includes("database error") || message.includes("saving new user") || message.includes("profile")) {
    return "There was an issue creating your profile. Your account may have been created - please try signing in.";
  }

  if (isEmailDeliveryError(error)) {
    return EMAIL_DELIVERY_FAILED;
  }

  return error.message || "Failed to create account. Please try again.";
}

export function mapSignInError(error: AuthError | null): string {
  if (!error) return "Login failed. Please check your credentials.";

  const message = normalizeMessage(error.message);

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials") ||
    message.includes("email not found")
  ) {
    return "Email or password is incorrect.";
  }

  if (message.includes("email not confirmed") || message.includes("email not verified")) {
    return "Your email has not been confirmed yet. Please check your inbox.";
  }

  if (message.includes("too many") || message.includes("rate limit")) {
    return "Too many login attempts. Please wait a few minutes and try again.";
  }

  return error.message || "Login failed. Please check your credentials.";
}
