import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useSignupInvite = () => {
  const [showInvite, setShowInvite] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Don't show for authenticated users
    if (isAuthenticated) return;

    // Check if user has already dismissed the invite in this session
    const hasSeenInvite = sessionStorage.getItem('insighta-invite-seen');
    if (hasSeenInvite) return;

    // Show invite after 5 seconds
    const timer = setTimeout(() => {
      setShowInvite(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  const closeInvite = () => {
    setShowInvite(false);
    // Remember that user has seen the invite for this session
    sessionStorage.setItem('insighta-invite-seen', 'true');
  };

  return {
    showInvite,
    closeInvite
  };
};