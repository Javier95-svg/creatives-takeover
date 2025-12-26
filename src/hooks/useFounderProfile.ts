/**
 * Founder Profile Hook
 * Manages founder profile CRUD operations and completeness tracking
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@supabase/auth-helpers-react';
import { useToast } from '@/hooks/use-toast';
import { BusinessContextService } from '@/services/businessContextService';
import type {
  FounderProfile,
  CreateFounderProfileRequest,
  UpdateFounderProfileRequest,
} from '@/types/aiCofounder';

/**
 * Main hook for founder profile management
 */
export const useFounderProfile = () => {
  const user = useUser();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch founder profile
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['founder-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const result = await BusinessContextService.getFounderProfile(userId);

      if (!result.success) {
        // If no profile exists, that's okay - it just means it hasn't been created yet
        if (result.error?.code === 'FETCH_PROFILE_ERROR') {
          return null;
        }
        throw new Error(result.error?.message || 'Failed to fetch profile');
      }

      return result.data;
    },
    enabled: !!userId,
  });

  // Create founder profile
  const createProfile = useMutation({
    mutationFn: async (data: CreateFounderProfileRequest) => {
      if (!userId) throw new Error('User ID required');

      const result = await BusinessContextService.createFounderProfile(userId, data);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create profile');
      }

      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['founder-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['aggregated-context', userId] });

      toast({
        title: 'Profile Created',
        description: `Welcome! Your profile is ${data?.profile_completeness || 0}% complete.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Creating Profile',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update founder profile
  const updateProfile = useMutation({
    mutationFn: async (updates: UpdateFounderProfileRequest) => {
      if (!userId) throw new Error('User ID required');

      const result = await BusinessContextService.updateFounderProfile(
        userId,
        updates
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update profile');
      }

      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['founder-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['aggregated-context', userId] });

      toast({
        title: 'Profile Updated',
        description: `Profile is now ${data?.profile_completeness || 0}% complete.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Updating Profile',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get or create profile (convenience function)
  const getOrCreateProfile = async (
    initialData?: CreateFounderProfileRequest
  ): Promise<FounderProfile | null> => {
    if (profile) {
      return profile;
    }

    if (!userId) return null;

    try {
      const result = await BusinessContextService.createFounderProfile(
        userId,
        initialData || {}
      );

      if (result.success && result.data) {
        queryClient.setQueryData(['founder-profile', userId], result.data);
        return result.data;
      }

      return null;
    } catch (error) {
      console.error('Error in getOrCreateProfile:', error);
      return null;
    }
  };

  return {
    profile,
    isLoading,
    error,
    hasProfile: !!profile,
    createProfile: createProfile.mutate,
    updateProfile: updateProfile.mutate,
    getOrCreateProfile,
    isCreating: createProfile.isPending,
    isUpdating: updateProfile.isPending,
  };
};

/**
 * Hook to track profile completeness and missing fields
 */
export const useProfileCompleteness = () => {
  const { profile, isLoading } = useFounderProfile();

  if (!profile || isLoading) {
    return {
      completeness: 0,
      missingFields: [],
      requiredFields: [],
      optionalFields: [],
      isLoading,
    };
  }

  const missingFields: string[] = [];
  const requiredFields = [
    'risk_tolerance',
    'decision_making_style',
    'entrepreneurial_experience',
  ];
  const optionalFields = [
    'skill_gaps',
    'learning_preferences',
    'primary_goals',
    'available_resources',
    'domain_expertise',
    'success_definition',
  ];

  // Check required fields
  requiredFields.forEach((field) => {
    if (!profile[field as keyof FounderProfile]) {
      missingFields.push(field);
    }
  });

  // Check optional array fields
  if (!profile.skill_gaps || profile.skill_gaps.length === 0) {
    missingFields.push('skill_gaps');
  }
  if (!profile.learning_preferences || profile.learning_preferences.length === 0) {
    missingFields.push('learning_preferences');
  }
  if (!profile.primary_goals || profile.primary_goals.length === 0) {
    missingFields.push('primary_goals');
  }

  return {
    completeness: profile.profile_completeness || 0,
    missingFields,
    requiredFields,
    optionalFields,
    isLoading: false,
  };
};

/**
 * Hook to get profile-based recommendations
 */
export const useProfileRecommendations = () => {
  const { profile, isLoading } = useFounderProfile();
  const { completeness, missingFields } = useProfileCompleteness();

  if (!profile || isLoading) {
    return {
      recommendations: [],
      isLoading,
    };
  }

  const recommendations: string[] = [];

  // Completeness recommendations
  if (completeness < 30) {
    recommendations.push(
      'Complete your basic profile information to get started with personalized guidance'
    );
  } else if (completeness < 70) {
    recommendations.push(
      'Add more details to your profile for more tailored recommendations'
    );
  }

  // Specific missing field recommendations
  if (missingFields.includes('skill_gaps')) {
    recommendations.push(
      'Identify your skill gaps so I can suggest relevant learning resources'
    );
  }

  if (missingFields.includes('primary_goals')) {
    recommendations.push(
      'Define your primary goals to help me prioritize our work together'
    );
  }

  if (missingFields.includes('available_resources')) {
    recommendations.push(
      'Share your available resources (time, budget) for realistic planning'
    );
  }

  // Experience-based recommendations
  if (profile.entrepreneurial_experience === 'first-time') {
    recommendations.push(
      "As a first-time entrepreneur, I'll provide extra guidance on common pitfalls"
    );
  }

  // Risk tolerance recommendations
  if (profile.risk_tolerance === 'conservative') {
    recommendations.push(
      "I'll focus on lower-risk validation strategies aligned with your risk tolerance"
    );
  } else if (profile.risk_tolerance === 'aggressive') {
    recommendations.push(
      "Given your risk tolerance, I'll suggest bold moves where appropriate"
    );
  }

  // Decision style recommendations
  if (profile.decision_making_style === 'intuitive') {
    recommendations.push(
      "I'll balance your intuition with data-driven validation"
    );
  } else if (profile.decision_making_style === 'consensus-seeking') {
    recommendations.push(
      "I'll help you gather input efficiently and make timely decisions"
    );
  }

  return {
    recommendations,
    isLoading: false,
  };
};

/**
 * Hook for quick profile updates (convenience methods)
 */
export const useQuickProfileUpdates = () => {
  const { updateProfile } = useFounderProfile();

  const addSkillGap = (skill: string) => {
    // Implementation would fetch current profile and update
    // This is a simplified version
    updateProfile({ skill_gaps: [skill] });
  };

  const addGoal = (goal: string) => {
    updateProfile({ primary_goals: [goal] });
  };

  const updateResources = (resources: Partial<{ time: number; budget: number }>) => {
    updateProfile({ available_resources: resources });
  };

  const setRiskTolerance = (tolerance: FounderProfile['risk_tolerance']) => {
    updateProfile({ risk_tolerance: tolerance });
  };

  const setDecisionStyle = (style: FounderProfile['decision_making_style']) => {
    updateProfile({ decision_making_style: style });
  };

  return {
    addSkillGap,
    addGoal,
    updateResources,
    setRiskTolerance,
    setDecisionStyle,
  };
};
