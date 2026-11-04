import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getSignupMetadata } from "@/lib/attribution";
import { getOnboardingReturn } from "@/lib/authRedirect";

interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth?: string;
  username?: string;
  referralCode?: string | null;
  stageGuidanceOptIn?: boolean;
}

// Keep the existing interface while callers move to the confirmation-aware UI.
// A failed confirmation email must leave signup failed, not create a confirmed
// account through a service-role function.
export async function signUpWithFallback({
  email,
  password,
  fullName,
  dateOfBirth,
  username,
  referralCode,
  stageGuidanceOptIn = false,
}: SignUpParams): Promise<{ error: AuthError | null; usedDirectSignupFallback: false }> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback?return=${encodeURIComponent(getOnboardingReturn('/onboarding'))}`,
      data: {
        ...getSignupMetadata(),
        full_name: fullName || "",
        date_of_birth: dateOfBirth || null,
        username: (username || "").trim().toLowerCase() || null,
        referral_code: referralCode || null,
        stage_guidance_email_opt_in: stageGuidanceOptIn === true,
      },
    },
  });

  return { error, usedDirectSignupFallback: false };
}
