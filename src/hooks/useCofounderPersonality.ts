import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AIPersonality, MemoryPreference } from '@/types/personality';
import { toast } from 'sonner';

interface PersonalityPreferences {
  aiPersonality: AIPersonality;
  memoryPreference: MemoryPreference;
  onboardingCompleted: boolean;
}

export const useCofounderPersonality = () => {
  const [preferences, setPreferences] = useState<PersonalityPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('ai_personality, memory_preference, cofounder_onboarding_completed')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setPreferences({
        aiPersonality: (profile.ai_personality as AIPersonality) || 'balanced',
        memoryPreference: (profile.memory_preference as MemoryPreference) || 'important',
        onboardingCompleted: profile.cofounder_onboarding_completed || false,
      });
    } catch (error) {
      console.error('Error loading personality preferences:', error);
      toast.error('Failed to load AI co-founder preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (
    personality: AIPersonality,
    memoryPref: MemoryPreference
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          ai_personality: personality,
          memory_preference: memoryPref,
          cofounder_onboarding_completed: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      setPreferences({
        aiPersonality: personality,
        memoryPreference: memoryPref,
        onboardingCompleted: true,
      });

      toast.success('AI co-founder preferences saved');
      return true;
    } catch (error) {
      console.error('Error saving personality preferences:', error);
      toast.error('Failed to save preferences');
      return false;
    }
  };

  const updatePersonality = async (personality: AIPersonality) => {
    if (!preferences) return false;
    return savePreferences(personality, preferences.memoryPreference);
  };

  const updateMemoryPreference = async (memoryPref: MemoryPreference) => {
    if (!preferences) return false;
    return savePreferences(preferences.aiPersonality, memoryPref);
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  return {
    preferences,
    isLoading,
    savePreferences,
    updatePersonality,
    updateMemoryPreference,
    reload: loadPreferences,
  };
};
