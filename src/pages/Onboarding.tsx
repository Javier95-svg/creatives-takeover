import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingForm } from '@/components/OnboardingForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import HomeWallpaper from '@/components/wallpapers/HomeWallpaper';

const Onboarding = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isAuthenticated || !user) {
        // If not authenticated, stay on page (user will sign up in Step 0)
        return;
      }

      try {
        // Check if user has already completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        // STRICT CHECK: Only redirect if onboarding_completed is explicitly true
        // This ensures users who completed onboarding NEVER see this page again
        if (profile?.onboarding_completed === true) {
          // Already onboarded, immediately redirect to dashboard
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // If error, allow user to continue (they might not have a profile yet)
      }
    };

    checkOnboardingStatus();
  }, [user, isAuthenticated, navigate]);

  const handleComplete = () => {
    // Redirect to dashboard after onboarding completion
    navigate('/dashboard');
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
