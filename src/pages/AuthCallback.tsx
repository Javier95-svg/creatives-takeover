import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { getSessionSafely } from '@/integrations/supabase/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { EmailOtpType } from '@supabase/supabase-js';
import { appendReturnParam, persistOnboardingReturn, sanitizeReturnPath } from '@/lib/authRedirect';
import { readAuthMethod, trackSignupCompleted } from '@/lib/analytics';
import { ICP_SEED_STORAGE_KEY } from '@/lib/icpSeed';
import { getSafeSessionStorage } from '@/lib/safeStorage';
import { resumePendingDiscoveryCallRedirect } from '@/services/discoveryCallService';
import {
  clearOAuthAuthIntent,
  clearPendingReferralCode,
  getOAuthAuthIntent,
  getPendingReferralCode,
} from '@/lib/referral';

const NEW_ACCOUNT_MAX_AGE_MS = 10 * 60 * 1000;

function isNewlyCreatedUser(createdAt?: string): boolean {
  if (!createdAt) return false;
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return false;
  return Date.now() - createdMs <= NEW_ACCOUNT_MAX_AGE_MS;
}

function isNewSessionUser(createdAt?: string, updatedAt?: string): boolean {
  return Boolean(createdAt && updatedAt && createdAt === updatedAt);
}

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const pendingReturn = sanitizeReturnPath(localStorage.getItem('oauth_return_url'), '/dashboard');
        const redirectToLogin = (delay = 3000) => {
          const loginPath = appendReturnParam('/login', pendingReturn);
          setTimeout(() => navigate(loginPath), delay);
        };

        // Check for error parameters from Google
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          console.error('OAuth error from URL:', { error, errorDescription });
          setStatus('error');
          toast.error(errorDescription || 'Authentication failed');
          redirectToLogin();
          return;
        }

        // Handle email confirmation callback parameters.
        // PKCE/email confirmation links often use token_hash + type.
        const tokenHash = searchParams.get('token_hash');
        const legacyToken = searchParams.get('token');
        const callbackType = searchParams.get('type');
        const isEmailConfirmation = !!callbackType && (callbackType === 'signup' || callbackType === 'email');

        if (tokenHash && callbackType) {
          const allowedTypes: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];
          const otpType = callbackType as EmailOtpType;

          if (allowedTypes.includes(otpType)) {
            console.warn('PKCE email confirmation detected, verifying token_hash...');
            const { error: otpError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: otpType,
            });

            if (otpError) {
              console.error('OTP verification error:', otpError);
              setStatus('error');
              toast.error('Email confirmation failed. Please request a new confirmation email.');
              redirectToLogin();
              return;
            }
          }
        } else if (legacyToken && callbackType === 'signup') {
          console.warn('Legacy email confirmation token detected.');
          toast.success('Email confirmed successfully!');
        }

        // Handle PKCE code exchange (for OAuth)
        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            setStatus('error');
            toast.error('Authentication failed');
            redirectToLogin();
            return;
          }
        }

        console.warn('Waiting for auth session...');

        // Wait for session to be established (works for both OAuth and email confirmation)
        const session = await getSessionSafely();

        if (session?.user) {
          console.warn('Auth successful, checking for return URL...');
          setStatus('success');

          const authMethod = readAuthMethod();
          const isNewUser = isNewSessionUser(session.user.created_at, session.user.updated_at);
          if (authMethod && isNewUser) {
            trackSignupCompleted({ method: authMethod });
          }

          const authIntent = getOAuthAuthIntent();
          const referralCode = getPendingReferralCode();
          const shouldClaimReferral =
            authIntent === 'signup' &&
            Boolean(referralCode) &&
            isNewlyCreatedUser(session.user.created_at);

          if (shouldClaimReferral && referralCode) {
            try {
              const { data: referralClaimed, error: referralError } = await supabase.rpc('claim_referral', {
                p_code: referralCode,
              });
              if (referralError) {
                throw referralError;
              }
              if (referralClaimed === true || referralClaimed === false) {
                clearPendingReferralCode();
              }
            } catch (referralError) {
              console.warn('Failed to claim referral after OAuth:', referralError);
            }
          }
          
          // Show appropriate success message
          if (isEmailConfirmation) {
            toast.success('Email confirmed! Welcome to Creatives Takeover!');
          } else {
            toast.success('Successfully signed in!');
          }
          
          // Check for pending discovery-call redirect (from OAuth or regular auth)
          const oauthCalendlyUrl = localStorage.getItem('oauth_calendly_redirect');
          const pendingCalendlyUrl = localStorage.getItem('pending_calendly_redirect') || oauthCalendlyUrl;
          
          if (pendingCalendlyUrl) {
            localStorage.removeItem('pending_calendly_redirect');
            localStorage.removeItem('oauth_calendly_redirect');

            localStorage.setItem('pending_calendly_redirect', pendingCalendlyUrl);
            await resumePendingDiscoveryCallRedirect();
            // Also navigate to community page
            setTimeout(() => {
              navigate('/community');
            }, 500);
            return;
          }
          
          // Get return URL from localStorage (saved before OAuth redirect)
          const fallbackReturnUrl = getSafeSessionStorage().getItem(ICP_SEED_STORAGE_KEY)
            ? '/icp-builder'
            : '/dashboard';
          let returnUrl = sanitizeReturnPath(localStorage.getItem('oauth_return_url') || fallbackReturnUrl, '/dashboard');
          const oauthSource = localStorage.getItem('oauth_source');
          const oauthSignupMethod = localStorage.getItem('oauth_signup_method');
          
          // If return URL is a booking flow, redirect to /community instead
          if (returnUrl.startsWith('/community/book/')) {
            returnUrl = '/community';
          }
          
          // Restore BizMap progress if it exists
          const savedBizMapProgress = localStorage.getItem('oauth_bizmap_progress');
          if (savedBizMapProgress) {
            localStorage.setItem('bizmap_progress', savedBizMapProgress);
            localStorage.removeItem('oauth_bizmap_progress');
          }
          
          // Clean up OAuth-related localStorage
          localStorage.removeItem('oauth_return_url');
          localStorage.removeItem('oauth_source');
          localStorage.removeItem('oauth_signup_method');
          clearOAuthAuthIntent();

          // Preserve post-onboarding intent for first-time users.
          persistOnboardingReturn(returnUrl);

          // Track OAuth signup if source exists
          if (
            oauthSource &&
            oauthSource !== 'direct' &&
            (oauthSignupMethod === 'google' || oauthSignupMethod === 'linkedin')
          ) {
            try {
              const { trackActivity } = await import('@/lib/activity');
              await trackActivity('user:signup_oauth', { provider: oauthSignupMethod, source: oauthSource });
            } catch (trackingError) {
              console.warn('Failed to track OAuth signup source:', trackingError);
            }
          }
          
          const { error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed, quiz_completed, dashboard_bootstrap_source, user_preferences')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Error resolving onboarding status after auth callback:', profileError);
          }

          const destination = returnUrl;

          // Navigate to return URL. First-time dashboard users now see Day 1 Welcome on /dashboard.
          if (destination.includes('dream2plan') || (destination === returnUrl && savedBizMapProgress)) {
            toast.success("Restoring your business plan...");
            setTimeout(() => {
              navigate(destination);
            }, 500);
          } else {
            setTimeout(() => {
              navigate(destination);
            }, 500);
          }
        } else {
          console.warn('No session found, redirecting to login');
          setStatus('error');
          redirectToLogin(2000);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        toast.error('Authentication failed');
        const pendingReturn = sanitizeReturnPath(localStorage.getItem('oauth_return_url'), '/dashboard');
        setTimeout(() => navigate(appendReturnParam('/login', pendingReturn)), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  const getStatusMessage = () => {
    switch (status) {
      case 'loading':
        return 'Signing you in...';
      case 'success':
        return 'Welcome! Redirecting...';
      case 'error':
        return 'Authentication failed. Redirecting...';
      default:
        return 'Processing...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-primary';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
        <meta name="description" content="Completing authentication process" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center space-y-6 p-8">
          <div className="flex justify-center">
            {status === 'loading' ? (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            ) : status === 'success' ? (
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">
              {status === 'success' ? 'Welcome!' : status === 'error' ? 'Oops!' : 'Authenticating...'}
            </h1>
            <p className={`text-lg ${getStatusColor()}`}>
              {getStatusMessage()}
            </p>
          </div>

          {status === 'error' && (
            <p className="text-sm text-muted-foreground">
              You'll be redirected to the login page shortly.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default AuthCallback;
