import type { Provider } from '@supabase/supabase-js';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

export type SocialAuthProviderId = 'google' | 'linkedin_oidc';
export type SocialAuthIntent = 'login' | 'signup';
export type SocialAuthSignupMethod = 'google' | 'linkedin';

const GOOGLE_OAUTH_QUERY_PARAMS = {
  access_type: 'offline',
  prompt: 'select_account',
} as const;

const SOCIAL_AUTH_PROVIDER_META: Record<
  SocialAuthProviderId,
  { providerName: string; signupMethod: SocialAuthSignupMethod }
> = {
  google: {
    providerName: 'Google',
    signupMethod: 'google',
  },
  linkedin_oidc: {
    providerName: 'LinkedIn',
    signupMethod: 'linkedin',
  },
};

interface StartSocialOAuthOptions {
  provider: SocialAuthProviderId;
  intent: SocialAuthIntent;
  beforeRedirect?: () => Promise<void> | void;
  onInitiated?: () => Promise<void> | void;
}

export function getSocialAuthProviderName(provider: SocialAuthProviderId): string {
  return SOCIAL_AUTH_PROVIDER_META[provider].providerName;
}

export function getSocialAuthSignupMethod(provider: SocialAuthProviderId): SocialAuthSignupMethod {
  return SOCIAL_AUTH_PROVIDER_META[provider].signupMethod;
}

export async function startSocialOAuth({
  provider,
  intent,
  beforeRedirect,
  onInitiated,
}: StartSocialOAuthOptions): Promise<boolean> {
  const providerName = getSocialAuthProviderName(provider);
  const actionLabel = intent === 'signup' ? 'sign-up' : 'sign-in';

  try {
    await beforeRedirect?.();

    toast(`Redirecting to ${providerName}...`);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as Provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        ...(provider === 'google'
          ? {
              queryParams: GOOGLE_OAUTH_QUERY_PARAMS,
            }
          : {}),
      },
    });

    if (error) {
      console.error('OAuth error:', error);
      toast.error(`${providerName} ${actionLabel} error: ${error.message}`);
      return false;
    }

    await onInitiated?.();
    return true;
  } catch (error) {
    console.error('Caught error:', error);
    toast.error(
      `${providerName} ${actionLabel} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return false;
  }
}
