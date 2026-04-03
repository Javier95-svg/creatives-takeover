import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { buildActivationSummary, type ActivationGateVariant, type ActivationIntent } from '@/lib/retentionSystem';

export interface RetentionNudge {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
}

interface RetentionFeedState {
  loading: boolean;
  primaryNudge: RetentionNudge | null;
  secondaryNudges: RetentionNudge[];
  unreadMessageCount: number;
  savedMentorCount: number;
  activationIntent: ActivationIntent | null;
  activationMode: boolean;
  activationGateVariant: ActivationGateVariant | null;
  latestArtifactType: string | null;
}

export const useRetentionFeed = (): RetentionFeedState => {
  const { user } = useAuth();
  const [state, setState] = useState<RetentionFeedState>({
    loading: true,
    primaryNudge: null,
    secondaryNudges: [],
    unreadMessageCount: 0,
    savedMentorCount: 0,
    activationIntent: null,
    activationMode: false,
    activationGateVariant: null,
    latestArtifactType: null,
  });

  const loadFeed = useCallback(async () => {
    if (!user) {
      setState({
        loading: false,
        primaryNudge: null,
        secondaryNudges: [],
        unreadMessageCount: 0,
        savedMentorCount: 0,
        activationIntent: null,
        activationMode: false,
        activationGateVariant: null,
        latestArtifactType: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed, user_preferences')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      const userPreferences = (profile.user_preferences as Record<string, unknown> | null) ?? {};
      const activationIntent = typeof userPreferences.activationIntent === 'string'
        ? userPreferences.activationIntent as ActivationIntent
        : null;
      const activationGateVariant = userPreferences.activationGateVariant === 'forced_gate'
        ? 'forced_gate'
        : userPreferences.activationGateVariant === 'control'
          ? 'control'
          : null;
      const activationMode =
        profile.onboarding_completed !== true ||
        (activationGateVariant === 'forced_gate' && typeof userPreferences.firstArtifactType !== 'string');
      const latestArtifactLabel = typeof userPreferences.lastArtifactLabel === 'string'
        ? userPreferences.lastArtifactLabel
        : null;
      const latestArtifactType = typeof userPreferences.lastArtifactType === 'string'
        ? userPreferences.lastArtifactType
        : null;
      const latestArtifactResumeUrl = typeof userPreferences.lastArtifactResumeUrl === 'string'
        ? userPreferences.lastArtifactResumeUrl
        : null;

      const { data: savedMentors, error: savedMentorsError } = await supabase
        .from('mentor_saves')
        .select('mentor_id, mentor:mentors(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (savedMentorsError) {
        throw savedMentorsError;
      }

      const savedMentorCount = savedMentors?.length ?? 0;
      const savedMentorNames = (savedMentors ?? [])
        .map((row) => (row as unknown as { mentor?: { name?: string } | null }).mentor?.name)
        .filter((value): value is string => Boolean(value));

      const { data: conversations, error: conversationError } = await supabase
        .from('conversations')
        .select('id')
        .contains('participants', [user.id]);

      if (conversationError) {
        throw conversationError;
      }

      const conversationIds = (conversations ?? []).map((conversation) => conversation.id);
      let unreadMessageCount = 0;

      if (conversationIds.length > 0) {
        const { count, error: unreadError } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .neq('sender_id', user.id)
          .eq('is_read', false);

        if (unreadError) {
          throw unreadError;
        }

        unreadMessageCount = count ?? 0;
      }

      const { data: recentBooking } = await supabase
        .from('user_activity_log')
        .select('activity_data, created_at')
        .eq('user_id', user.id)
        .eq('activity_type', 'discovery_call_booked')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nudges: RetentionNudge[] = [];
      let primaryNudge: RetentionNudge | null = null;

      if (latestArtifactLabel && latestArtifactResumeUrl) {
        primaryNudge = {
          id: 'continue',
          eyebrow: 'Continue where you left off',
          title: latestArtifactLabel,
          description: 'Open the last artifact you created and take the next concrete step before you explore anything else.',
          actionLabel: 'Continue where you left off',
          actionUrl: latestArtifactResumeUrl,
        };
      } else if (activationMode && activationIntent) {
        const activationSummary = buildActivationSummary(activationIntent);
        primaryNudge = {
          id: 'activation',
          eyebrow: 'Finish activation',
          title: activationSummary.title,
          description: activationSummary.description,
          actionLabel: 'Complete first value action',
          actionUrl: activationSummary.actionUrl,
        };
      }

      if (unreadMessageCount > 0) {
        nudges.push({
          id: 'messages',
          eyebrow: 'Messages are waiting',
          title: unreadMessageCount === 1
            ? 'You have 1 reply waiting'
            : `You have ${unreadMessageCount} replies waiting`,
          description: 'Replies in Messages are the strongest return trigger in the product right now. Pick the thread back up before it goes cold.',
          actionLabel: 'Open Messages',
          actionUrl: '/messages',
        });
      }

      if (savedMentorCount > 0) {
        nudges.push({
          id: 'saved-mentors',
          eyebrow: 'Saved mentors',
          title: savedMentorCount === 1
            ? `Revisit ${savedMentorNames[0] ?? 'your saved mentor'}`
            : `You have ${savedMentorCount} saved mentors ready`,
          description: savedMentorNames.length > 0
            ? `Go back to ${savedMentorNames.slice(0, 2).join(' and ')} and move one relationship forward today.`
            : 'Saved mentors are your best bridge from browsing to real follow-up.',
          actionLabel: 'View saved mentors',
          actionUrl: '/community?mentorSource=saved',
        });
      }

      if (recentBooking) {
        nudges.push({
          id: 'bookings',
          eyebrow: 'Discovery calls',
          title: 'Follow up on your booked discovery call',
          description: 'The best time to clarify your next decision is right after you book the conversation.',
          actionLabel: 'Open mentors',
          actionUrl: '/community?mentorSource=booked-call',
        });
      }

      setState({
        loading: false,
        primaryNudge,
        secondaryNudges: nudges.slice(0, 2),
        unreadMessageCount,
        savedMentorCount,
        activationIntent,
        activationMode,
        activationGateVariant,
        latestArtifactType,
      });
    } catch (error) {
      console.error('Failed to load retention feed', error);
      setState((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  }, [user]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  return state;
};
