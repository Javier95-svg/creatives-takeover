import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  isLegacyOnboardingExempt,
  shouldRedirectToGuidedOnboarding,
} from '@/lib/guidedOnboarding';

type CompatibilityDestination = '/dashboard' | '/onboarding';

const SetupQuiz = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [destination, setDestination] = useState<CompatibilityDestination | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login?return=/onboarding', { replace: true });
      return;
    }

    let cancelled = false;

    const resolveDestination = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, quiz_completed, dashboard_bootstrap_source, user_preferences')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error || !profile || isLegacyOnboardingExempt(profile)) {
          setDestination('/dashboard');
          return;
        }

        setDestination(shouldRedirectToGuidedOnboarding(profile) ? '/onboarding' : '/dashboard');
      } catch (error) {
        console.error('Error resolving setup quiz compatibility route:', error);
        if (!cancelled) setDestination('/dashboard');
      }
    };

    void resolveDestination();

    return () => {
      cancelled = true;
    };
  }, [authLoading, navigate, user]);

  if (destination) {
    return <Navigate to={destination} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading onboarding" />
    </div>
  );
};

export default SetupQuiz;
