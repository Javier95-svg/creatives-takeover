import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingForm } from '@/components/OnboardingForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';

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

        if (profile?.onboarding_completed) {
          // Already onboarded, redirect to dashboard
          navigate('/dashboard');
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
      
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8 px-4">
        <OnboardingForm onComplete={handleComplete} />
      </div>
    </>
  );
};

export default Onboarding;
