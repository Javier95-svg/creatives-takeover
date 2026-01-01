/**
 * Onboarding Analytics Helper
 * Tracks user onboarding progress and metrics
 */

import { supabase } from '@/integrations/supabase/client';

export interface OnboardingMetrics {
  userId: string;
  stepCompleted: string;
  completedAt: string;
  timeToComplete?: number; // in seconds
}

export interface OnboardingStats {
  totalUsers: number;
  completedOnboarding: number;
  completionRate: number;
  averageTimeToComplete: number; // in minutes
  stepCompletionRates: {
    profilePicture: number;
    fullName: number;
    bio: number;
    socialLink: number;
    dashboardVisit: number;
  };
}

/**
 * Track when a user completes an onboarding step
 */
export const trackOnboardingStep = async (
  userId: string,
  step: 'profile_picture' | 'full_name' | 'bio' | 'social_link' | 'dashboard_visit'
): Promise<void> => {
  try {
    // Log to console for debugging (remove in production or use proper analytics service)
    console.log('[Onboarding Analytics]', {
      userId,
      step,
      timestamp: new Date().toISOString(),
    });

    // Optional: Send to analytics service (e.g., Mixpanel, Amplitude, PostHog)
    // await fetch('/api/analytics/onboarding', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, step, timestamp: new Date().toISOString() }),
    // });
  } catch (error) {
    console.error('Error tracking onboarding step:', error);
    // Don't throw - analytics failures shouldn't break UX
  }
};

/**
 * Track when a user completes the entire onboarding
 */
export const trackOnboardingComplete = async (userId: string): Promise<void> => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_login_at')
      .eq('id', userId)
      .single();

    if (profile?.first_login_at) {
      const firstLogin = new Date(profile.first_login_at);
      const completedAt = new Date();
      const timeToComplete = (completedAt.getTime() - firstLogin.getTime()) / 1000; // in seconds

      console.log('[Onboarding Complete]', {
        userId,
        timeToComplete: `${Math.round(timeToComplete / 60)} minutes`,
        timestamp: completedAt.toISOString(),
      });

      // Optional: Send to analytics service
      // await fetch('/api/analytics/onboarding-complete', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     userId,
      //     timeToComplete,
      //     completedAt: completedAt.toISOString(),
      //   }),
      // });
    }
  } catch (error) {
    console.error('Error tracking onboarding completion:', error);
  }
};

/**
 * Track when a user dismisses the onboarding
 */
export const trackOnboardingDismissed = async (
  userId: string,
  completedSteps: number,
  totalSteps: number
): Promise<void> => {
  try {
    console.log('[Onboarding Dismissed]', {
      userId,
      progress: `${completedSteps}/${totalSteps}`,
      timestamp: new Date().toISOString(),
    });

    // Optional: Send to analytics service
  } catch (error) {
    console.error('Error tracking onboarding dismissal:', error);
  }
};

/**
 * Get onboarding statistics (admin/analytics dashboard)
 */
export const getOnboardingStats = async (
  since?: Date
): Promise<OnboardingStats | null> => {
  try {
    const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days

    // Get all profiles created since date
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, onboarding_completed, first_login_at, updated_at, full_name, avatar_url, bio, twitter_url, linkedin_url')
      .gte('created_at', sinceDate.toISOString());

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return {
        totalUsers: 0,
        completedOnboarding: 0,
        completionRate: 0,
        averageTimeToComplete: 0,
        stepCompletionRates: {
          profilePicture: 0,
          fullName: 0,
          bio: 0,
          socialLink: 0,
          dashboardVisit: 0,
        },
      };
    }

    // Calculate metrics
    const totalUsers = profiles.length;
    const completedUsers = profiles.filter((p) => p.onboarding_completed).length;
    const completionRate = (completedUsers / totalUsers) * 100;

    // Calculate average time to complete
    let totalTime = 0;
    let countWithTime = 0;
    profiles.forEach((p) => {
      if (p.onboarding_completed && p.first_login_at && p.updated_at) {
        const startTime = new Date(p.first_login_at).getTime();
        const endTime = new Date(p.updated_at).getTime();
        totalTime += (endTime - startTime) / (1000 * 60); // Convert to minutes
        countWithTime++;
      }
    });
    const averageTimeToComplete = countWithTime > 0 ? totalTime / countWithTime : 0;

    // Calculate step completion rates
    const stepCompletionRates = {
      profilePicture: (profiles.filter((p) => p.avatar_url && p.avatar_url.length > 0).length / totalUsers) * 100,
      fullName: (profiles.filter((p) => p.full_name && p.full_name.length > 0).length / totalUsers) * 100,
      bio: (profiles.filter((p) => p.bio && p.bio.length > 0).length / totalUsers) * 100,
      socialLink: (profiles.filter((p) =>
        (p.twitter_url && p.twitter_url.length > 0) ||
        (p.linkedin_url && p.linkedin_url.length > 0)
      ).length / totalUsers) * 100,
      dashboardVisit: 0, // This is tracked via localStorage, not in database
    };

    return {
      totalUsers,
      completedOnboarding: completedUsers,
      completionRate: Math.round(completionRate * 10) / 10, // Round to 1 decimal
      averageTimeToComplete: Math.round(averageTimeToComplete * 10) / 10,
      stepCompletionRates: {
        profilePicture: Math.round(stepCompletionRates.profilePicture * 10) / 10,
        fullName: Math.round(stepCompletionRates.fullName * 10) / 10,
        bio: Math.round(stepCompletionRates.bio * 10) / 10,
        socialLink: Math.round(stepCompletionRates.socialLink * 10) / 10,
        dashboardVisit: Math.round(stepCompletionRates.dashboardVisit * 10) / 10,
      },
    };
  } catch (error) {
    console.error('Error fetching onboarding stats:', error);
    return null;
  }
};

/**
 * Get onboarding funnel drop-off points
 */
export const getOnboardingFunnel = async (): Promise<{
  step: string;
  users: number;
  percentage: number;
}[]> => {
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, bio, twitter_url, linkedin_url, onboarding_completed');

    if (!profiles || profiles.length === 0) return [];

    const total = profiles.length;

    const funnel = [
      {
        step: 'Started Onboarding',
        users: total,
        percentage: 100,
      },
      {
        step: 'Added Full Name',
        users: profiles.filter((p) => p.full_name && p.full_name.length > 0).length,
        percentage: 0,
      },
      {
        step: 'Uploaded Profile Picture',
        users: profiles.filter((p) => p.avatar_url && p.avatar_url.length > 0).length,
        percentage: 0,
      },
      {
        step: 'Wrote Bio',
        users: profiles.filter((p) => p.bio && p.bio.length > 0).length,
        percentage: 0,
      },
      {
        step: 'Connected Social Link',
        users: profiles.filter((p) =>
          (p.twitter_url && p.twitter_url.length > 0) ||
          (p.linkedin_url && p.linkedin_url.length > 0)
        ).length,
        percentage: 0,
      },
      {
        step: 'Completed Onboarding',
        users: profiles.filter((p) => p.onboarding_completed).length,
        percentage: 0,
      },
    ];

    // Calculate percentages
    funnel.forEach((step) => {
      step.percentage = Math.round((step.users / total) * 100);
    });

    return funnel;
  } catch (error) {
    console.error('Error fetching onboarding funnel:', error);
    return [];
  }
};

/**
 * Example usage in a React component:
 *
 * import { trackOnboardingStep, trackOnboardingComplete } from '@/lib/onboardingAnalytics';
 *
 * // Track when user uploads profile picture
 * const handleUploadComplete = () => {
 *   trackOnboardingStep(userId, 'profile_picture');
 * };
 *
 * // Track when onboarding completes
 * useEffect(() => {
 *   if (allItemsCompleted) {
 *     trackOnboardingComplete(userId);
 *   }
 * }, [allItemsCompleted]);
 */
