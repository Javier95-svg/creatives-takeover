import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMentors } from '@/hooks/useMentors';
import { supabase } from '@/integrations/supabase/client';
import { trackActivity } from '@/lib/activity';
import {
  rankMentorsForContext,
  type MentorRecommendationContext,
  type MentorRecommendationResult,
} from '@/lib/mentorDemand';

interface FounderMentorContext {
  startupIndustry: string[] | null;
  userPreferences: Record<string, unknown> | null;
}

export function useMentorRecommendations(
  context: MentorRecommendationContext,
  options?: { limit?: number; source?: string },
) {
  const { user } = useAuth();
  const { fetchMentors } = useMentors();
  const [founderContext, setFounderContext] = useState<FounderMentorContext>({
    startupIndustry: null,
    userPreferences: null,
  });
  const [allRecommendations, setAllRecommendations] = useState<MentorRecommendationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const trackedViewRef = useRef<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);

    try {
      const [mentors, profileResult] = await Promise.all([
        fetchMentors(),
        user
          ? supabase
              .from('profiles')
              .select('startup_industry, user_preferences')
              .eq('id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      const profile = (profileResult.data as
        | { startup_industry?: string[] | null; user_preferences?: Record<string, unknown> | null }
        | null) ?? null;

      setFounderContext({
        startupIndustry: profile?.startup_industry ?? null,
        userPreferences: profile?.user_preferences ?? null,
      });

      const recommendations = rankMentorsForContext(mentors, {
        ...context,
        startupIndustry: context.startupIndustry ?? profile?.startup_industry ?? null,
      });

      setAllRecommendations(recommendations);
    } finally {
      setLoading(false);
    }
  }, [context, fetchMentors, user]);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  const recommendations = useMemo(
    () => allRecommendations.slice(0, options?.limit ?? 3),
    [allRecommendations, options?.limit],
  );

  useEffect(() => {
    if (!recommendations.length) return;

    const trackingKey = [
      context.track,
      options?.source ?? 'unknown',
      recommendations.map((item) => item.mentor.id).join(','),
    ].join(':');

    if (trackedViewRef.current === trackingKey) {
      return;
    }

    trackedViewRef.current = trackingKey;

    void trackActivity(
      'mentor_recommendation_viewed',
      {
        track: context.track,
        source: options?.source ?? 'unknown',
        mentorIds: recommendations.map((item) => item.mentor.id),
        matchedExpertise: recommendations.map((item) => item.matchedExpertise).flat(),
      },
      user?.id,
    );
  }, [context.track, options?.source, recommendations, user?.id]);

  return {
    loading,
    recommendations,
    founderContext,
  };
}
