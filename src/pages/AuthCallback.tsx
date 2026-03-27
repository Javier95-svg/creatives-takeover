import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { getSessionSafely } from '@/integrations/supabase/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { EmailOtpType } from '@supabase/supabase-js';
import { appendReturnParam, buildOnboardingPath, persistOnboardingReturn, sanitizeReturnPath } from '@/lib/authRedirect';

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
            console.log('PKCE email confirmation detected, verifying token_hash...');
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
          console.log('Legacy email confirmation token detected.');
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

        console.log('Waiting for auth session...');

        // Wait for session to be established (works for both OAuth and email confirmation)
        const session = await getSessionSafely();

        if (session?.user) {
          console.log('Auth successful, checking for return URL...');
          setStatus('success');
          
          // Show appropriate success message
          if (isEmailConfirmation) {
            toast.success('Email confirmed! Welcome to Creatives Takeover!');
          } else {
            toast.success('Successfully signed in!');
          }
          
          // Check for pending Calendly redirect (from OAuth or regular auth)
          const CALENDLY_REDIRECT_KEY = 'pending_calendly_redirect';
          const oauthCalendlyUrl = localStorage.getItem('oauth_calendly_redirect');
          const pendingCalendlyUrl = localStorage.getItem(CALENDLY_REDIRECT_KEY) || oauthCalendlyUrl;
          
          if (pendingCalendlyUrl) {
            // Clean up Calendly redirect keys
            localStorage.removeItem(CALENDLY_REDIRECT_KEY);
            localStorage.removeItem('oauth_calendly_redirect');
            
            // Redirect to Calendly
            window.open(pendingCalendlyUrl, '_blank', 'noopener,noreferrer');
            // Also navigate to community page
            setTimeout(() => {
              navigate('/community');
            }, 500);
            return;
          }
          
          // Get return URL from localStorage (saved before OAuth redirect)
          const fallbackReturnUrl = isEmailConfirmation ? '/onboarding' : '/dashboard';
          let returnUrl = sanitizeReturnPath(localStorage.getItem('oauth_return_url') || fallbackReturnUrl, '/dashboard');
          const oauthSource = localStorage.getItem('oauth_source');
          
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

          // Preserve post-onboarding intent for first-time users.
          persistOnboardingReturn(returnUrl);
          
          // Track OAuth signup if source exists
          if (oauthSource && oauthSource !== 'direct') {
            try {
              const { trackActivity } = await import('@/lib/activity');
              await trackActivity('user:signup_oauth', { provider: 'google', source: oauthSource });
            } catch (trackingError) {
              console.warn('Failed to track OAuth signup source:', trackingError);
            }
          }
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Error resolving onboarding status after auth callback:', profileError);
          }

          const destination = profile?.onboarding_completed === true
            ? returnUrl
            : buildOnboardingPath(returnUrl);

          // Navigate to return URL or route incomplete users through onboarding first
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
          console.log('No session found, redirecting to login');
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
