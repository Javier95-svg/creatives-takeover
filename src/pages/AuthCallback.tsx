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

        console.log('Waiting for auth session...');
        
        // Wait for session to be established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('error');
          toast.error('Failed to establish session');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (session?.user) {
          console.log('Auth successful, redirecting to home');
          setStatus('success');
          toast.success('Successfully signed in!');
          
          // Clean URL and redirect without hash
          window.history.replaceState(null, '', '/');
          navigate('/', { replace: true });
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
      navigate('/');
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
        <title>Authenticating - BizMap AI</title>
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