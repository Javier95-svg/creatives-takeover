import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface SignUpWithFallbackParams {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth?: string;
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
];

function shouldUseDirectSignupFallback(message?: string): boolean {
  if (!message) return false;
  return EMAIL_CONFIRMATION_SEND_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function toAuthError(message: string): AuthError {
  return { message } as AuthError;
}

export async function signUpWithFallback({
  email,
  password,
  fullName,
  dateOfBirth,
}: SignUpWithFallbackParams): Promise<{ error: AuthError | null; usedDirectSignupFallback: boolean }> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || "",
        date_of_birth: dateOfBirth || null,
      },
    },
  });

  if (!error) {
    return { error: null, usedDirectSignupFallback: false };
  }

  if (!shouldUseDirectSignupFallback(error.message)) {
    return { error, usedDirectSignupFallback: false };
  }

  const { data, error: invokeError } = await supabase.functions.invoke<DirectSignupResponse>("signup-direct", {
    body: {
      email,
      password,
      fullName,
      dateOfBirth: dateOfBirth || null,
    },
    headers: {
      "x-signup-fallback": "1",
    },
  });

  if (invokeError) {
    console.error("Direct signup fallback invocation failed:", invokeError);
    return { error, usedDirectSignupFallback: false };
  }

  if (data?.ok) {
    return { error: null, usedDirectSignupFallback: true };
  }

  if (data?.error) {
    return { error: toAuthError(data.error), usedDirectSignupFallback: true };
  }

  return { error, usedDirectSignupFallback: false };
}
