/**
 * Auto Profile Hook
 * Silently creates founder profile on first chat if it doesn't exist
 */

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFounderProfile } from '@/hooks/useFounderProfile';

export function useAutoProfile() {
  const { user } = useAuth();
  const { profile, hasProfile, createProfile, isLoading } = useFounderProfile();

  useEffect(() => {
    // Only run if user is authenticated and we've finished checking for profile
    if (!user || isLoading) return;

    // If profile doesn't exist, create a basic one silently
    if (!hasProfile && !profile) {
      createProfile({
        entrepreneurial_experience: 'first-time',
        risk_tolerance: 'moderate',
        decision_making_style: 'data-driven',
      });
    }
  }, [user, hasProfile, profile, isLoading, createProfile]);

  return { hasProfile, profile };
}
