import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FounderOSIntegrationData {
  sessionId: string;
  businessIdea: string;
  industry: string;
  targetMarket: string;
}

export const useFounderOSIntegration = () => {
  const { user } = useAuth();
  const [validating, setValidating] = useState(false);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [roadmapComplete, setRoadmapComplete] = useState(false);

  const runValidation = async (data: FounderOSIntegrationData) => {
    if (!user) {
      toast.error('Please sign in to use Founder OS features');
      return false;
    }

    setValidating(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('market-validation-engine', {
        body: {
          business_idea: data.businessIdea,
          industry: data.industry,
          target_market: data.targetMarket,
          session_id: data.sessionId,
        },
      });

      if (error) throw error;

      if (result?.validation_score) {
        setValidationComplete(true);
        toast.success(`Market Validation Complete! Score: ${result.validation_score.overall_validation_score}/100`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate idea. Please try again.');
      return false;
    } finally {
      setValidating(false);
    }
  };

  const generateRoadmap = async (data: FounderOSIntegrationData, wizardAnswers?: Record<string, string>) => {
    if (!user) {
      toast.error('Please sign in to use Founder OS features');
      return false;
    }

    setGeneratingRoadmap(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('roadmap-task-generator', {
        body: {
          session_id: data.sessionId,
          business_idea: data.businessIdea,
          industry: data.industry,
          start_date: new Date().toISOString().split('T')[0],
          user_experience_level: 'intermediate',
          wizard_answers: wizardAnswers || null,
        },
      });

      if (error) throw error;

      if (result?.roadmap) {
        setRoadmapComplete(true);
        toast.success(`30-Day Roadmap Created! ${result.tasks?.length || 0} tasks generated.`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Roadmap generation error:', error);
      toast.error('Failed to generate roadmap. Please try again.');
      return false;
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  const runFullOnboarding = async (data: FounderOSIntegrationData) => {
    // Run validation first
    const validationSuccess = await runValidation(data);
    
    if (validationSuccess) {
      // Then generate roadmap
      await generateRoadmap(data);
    }
  };

  return {
    validating,
    generatingRoadmap,
    validationComplete,
    roadmapComplete,
    runValidation,
    generateRoadmap,
    runFullOnboarding,
  };
};
