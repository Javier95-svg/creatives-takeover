import type { AuthError } from "@supabase/supabase-js";
import { PASSWORD_LENGTH_ERROR } from "@/lib/passwordPolicy";

function normalizeMessage(message?: string): string {
  return (message || "").toLowerCase();
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

  if (message.includes("too many") || message.includes("rate limit")) {
    return "Too many signup attempts. Please wait a few minutes and try again.";
  }

  if (message.includes("invalid email")) {
    return "Please enter a valid email address.";
  }

  if (message.includes("password")) {
    return PASSWORD_LENGTH_ERROR;
  }

  if (message.includes("database error") || message.includes("saving new user") || message.includes("profile")) {
    return "There was an issue creating your profile. Your account may have been created - please try signing in.";
  }

  if (message.includes("confirm email") || message.includes("confirmation email")) {
    return "There was an issue with email delivery. Please try again.";
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
