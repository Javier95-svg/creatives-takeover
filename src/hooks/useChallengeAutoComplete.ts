import { useEffect } from 'react';
import { useDailyChallenges } from './useDailyChallenges';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to automatically complete challenges when user performs relevant actions
 */
export const useChallengeAutoComplete = () => {
  const { user } = useAuth();
  const { todaysChallenge, isCompleted, completeChallenge } = useDailyChallenges(user?.id);

  const checkAndComplete = async (
    actionType: 'post' | 'comment' | 'feedback' | 'connection' | 'share' | 'engagement',
    referenceId?: string,
    referenceType?: string
  ) => {
    if (!user || !todaysChallenge || isCompleted) {
      return;
    }

    // Check if action matches today's challenge type
    if (todaysChallenge.challenge_type === actionType) {
      await completeChallenge(
        todaysChallenge.id,
        referenceId,
        referenceType
      );
    }
  };

  return {
    checkAndComplete,
    canAutoComplete: !!(user && todaysChallenge && !isCompleted),
    challengeType: todaysChallenge?.challenge_type
  };
};
