import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getSignupMetadata } from "@/lib/attribution";

interface SignUpWithFallbackParams {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth?: string;
  username?: string;
  referralCode?: string | null;
}

interface DirectSignupResponse {
  ok?: boolean;
  error?: string;
  code?: string;
  userId?: string;
}

const EMAIL_CONFIRMATION_SEND_ERROR_PATTERNS = [
  /failed confirm email sending/i,
  /failed to send confirmation email/i,
  /error sending confirmation email/i,
  /confirmation email.*failed/i,
  /confirmation email.*send/i,
  /confirm email/i,
  /email delivery/i,
  /smtp/i,
  /mailer/i,
  /resend/i,
];

const NON_FALLBACK_SIGNUP_ERROR_PATTERNS = [
  /already/i,
  /registered/i,
  /exists/i,
  /invalid email/i,
  /password/i,
  /too many/i,
  /rate limit/i,
];

function shouldUseDirectSignupFallback(message?: string): boolean {
  if (!message) return false;
  if (NON_FALLBACK_SIGNUP_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return false;
  }

  if (EMAIL_CONFIRMATION_SEND_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return true;
  }

  // Fail open for backend-side signup issues so account creation isn't blocked by email delivery.
  return /server|internal|database|saving new user|unexpected|provider/i.test(message);
}

function toAuthError(message: string): AuthError {
  return { message } as AuthError;
}

function shouldReturnDirectSignupError(code?: string): boolean {
  if (!code) return false;
  return ["USER_EXISTS", "INVALID_EMAIL", "WEAK_PASSWORD", "RATE_LIMITED", "USERNAME_TAKEN"].includes(code);
}

async function tryDirectSignup(params: SignUpWithFallbackParams): Promise<{
  ok: boolean;
  error: AuthError | null;
  code?: string;
}> {
  const normalizedUsername = (params.username || "").trim().toLowerCase();

  const { data, error: invokeError } = await supabase.functions.invoke<DirectSignupResponse>("signup-direct", {
    body: {
      email: params.email,
      password: params.password,
      fullName: params.fullName,
      dateOfBirth: params.dateOfBirth || null,
      username: normalizedUsername || null,
      referralCode: params.referralCode || null,
    },
    headers: {
      "x-signup-fallback": "1",
    },
  });

  if (invokeError) {
    console.error("Direct signup fallback invocation failed:", invokeError);
    return { ok: false, error: null };
  }

  if (data?.ok) {
    return { ok: true, error: null, code: data.code };
  }

  if (data?.error) {
    return { ok: false, error: toAuthError(data.error), code: data.code };
  }

  return { ok: false, error: null, code: data?.code };
}

export async function signUpWithFallback({
  email,
  password,
  fullName,
  dateOfBirth,
  username,
  referralCode,
}: SignUpWithFallbackParams): Promise<{ error: AuthError | null; usedDirectSignupFallback: boolean }> {
  const directFirstAttempt = await tryDirectSignup({
    email,
    password,
    fullName,
    dateOfBirth,
    username,
    referralCode,
  });

  if (directFirstAttempt.ok) {
    return { error: null, usedDirectSignupFallback: true };
  }

  if (directFirstAttempt.error && shouldReturnDirectSignupError(directFirstAttempt.code)) {
    return { error: directFirstAttempt.error, usedDirectSignupFallback: true };
  }

  const normalizedUsername = (username || "").trim().toLowerCase();
  const attributionMetadata = getSignupMetadata();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        ...attributionMetadata,
        full_name: fullName || "",
        date_of_birth: dateOfBirth || null,
        username: normalizedUsername || null,
        referral_code: referralCode || null,
      },
    },
  });

  if (!error) {
    return { error: null, usedDirectSignupFallback: false };
  }

  if (!shouldUseDirectSignupFallback(error.message)) {
    return { error, usedDirectSignupFallback: false };
  }

  const directRetryAttempt = await tryDirectSignup({
    email,
    password,
    fullName,
    dateOfBirth,
    username: normalizedUsername,
    referralCode,
  });

  if (directRetryAttempt.ok) {
    return { error: null, usedDirectSignupFallback: true };
  }

  if (directRetryAttempt.error) {
    return { error: directRetryAttempt.error, usedDirectSignupFallback: true };
  }

  return { error, usedDirectSignupFallback: false };
}
