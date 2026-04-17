import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingForm } from '@/components/OnboardingForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import HomeWallpaper from '@/components/wallpapers/HomeWallpaper';
import { captureEvent } from '@/lib/analytics';
import { trackActivity } from '@/lib/activity';

const Onboarding = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const hasTrackedStart = useRef(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (authLoading) return;

      if (!isAuthenticated || !user) {
        // Onboarding requires an authenticated account.
        navigate('/signup?return=/onboarding', { replace: true });
        return;
      }

      try {
        // Check if user has already completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, quiz_completed')
          .eq('id', user.id)
          .single();

        if (profile?.onboarding_completed === true) {
          if (profile?.quiz_completed !== true) {
            navigate('/setup-quiz', { replace: true });
            return;
          }
          navigate('/dashboard', { replace: true });
          return;
        }

        if (!hasTrackedStart.current) {
          hasTrackedStart.current = true;
          // FIX(retention): onboarding — emit a canonical onboarding_started event once the route is actually reached by an authenticated user.
          captureEvent('onboarding_started', {
            userId: user.id,
            page_path: '/onboarding',
          });
          void trackActivity('onboarding_started', {
            page_path: '/onboarding',
          }, user.id);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // If error, allow user to continue (they might not have a profile yet)
      }
    };

    checkOnboardingStatus();
  }, [user, isAuthenticated, authLoading, navigate]);

  const handleComplete = (_startRoute?: string) => {
    navigate('/setup-quiz');
  };

  return (
    <>
      <Helmet>
        <title>Onboarding | Creatives Takeover</title>
        <meta name="description" content="Complete your onboarding to get started with Creatives Takeover" />
      </Helmet>
      
      {/* Home Wallpaper Background */}
      <HomeWallpaper />
      
      <div className="relative min-h-screen flex items-center justify-center py-8 px-4 sm:py-12">
        <div className="w-full max-w-4xl mx-auto">
          {/* Fade-in animation for smooth appearance */}
          <div className="animate-fade-in-up">
            <OnboardingForm onComplete={handleComplete} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Onboarding;
