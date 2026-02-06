import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedbackCredits } from '@/hooks/useFeedbackCredits';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { hasPendingCredits } = useFeedbackCredits();
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error parameters from Google
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          console.error('OAuth error from URL:', { error, errorDescription });
          setStatus('error');
          toast.error(errorDescription || 'Authentication failed');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Handle email confirmation token (from email confirmation link)
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        if (token && type === 'signup') {
          console.log('Email confirmation detected, verifying token...');
          // Supabase automatically processes email confirmation tokens via URL hash
          // We just need to wait for the session to be established
          // The token is processed automatically when the page loads
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
            setTimeout(() => navigate('/login'), 3000);
            return;
          }
        }

        console.log('Waiting for auth session...');

        // Wait for session to be established (works for both OAuth and email confirmation)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('error');
          toast.error('Failed to establish session');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (session?.user) {
          console.log('Auth successful, checking for return URL...');
          setStatus('success');
          
          // Show appropriate success message
          if (token && type === 'signup') {
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
          let returnUrl = localStorage.getItem('oauth_return_url') || '/';
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
          
          // Track OAuth signup if source exists
          if (oauthSource && oauthSource !== 'direct') {
            try {
              const { trackActivity } = await import('@/lib/activity');
              await trackActivity('user:signup_oauth', { provider: 'google', source: oauthSource });
            } catch {}
          }
          
          // Navigate to return URL or check for BizMap progress
          if (returnUrl.includes('dream2plan') || savedBizMapProgress) {
            toast.success("Restoring your business plan...");
            setTimeout(() => {
              navigate(returnUrl);
            }, 500);
          } else {
            setTimeout(() => {
              navigate(returnUrl);
            }, 500);
          }
        } else {
          console.log('No session found, redirecting to login');
          setStatus('error');
          setTimeout(() => navigate('/login'), 2000);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('error');
        toast.error('Authentication failed');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  // If user is already authenticated from context, redirect immediately
  useEffect(() => {
    if (user && status === 'success') {
      // Get return URL from localStorage
      const returnUrl = localStorage.getItem('oauth_return_url') || '/';
      
      // Restore BizMap progress if it exists
      const savedBizMapProgress = localStorage.getItem('oauth_bizmap_progress');
      if (savedBizMapProgress) {
        localStorage.setItem('bizmap_progress', savedBizMapProgress);
        localStorage.removeItem('oauth_bizmap_progress');
      }
      
      // Clean up OAuth-related localStorage
      localStorage.removeItem('oauth_return_url');
      localStorage.removeItem('oauth_source');
      
      navigate(returnUrl);
    }
  }, [user, navigate, status]);

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