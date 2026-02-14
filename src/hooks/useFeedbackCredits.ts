import { useEffect } from 'react';
import { useCredits } from './useCredits';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Server-enforced maximum — prevents client-side tampering via sessionStorage
const MAX_FEEDBACK_CREDIT_BONUS = 5;

export const useFeedbackCredits = () => {
  const { addCredits } = useCredits();
  const { user, isAuthenticated } = useAuth();

  // Check for pending feedback credits when user authenticates
  useEffect(() => {
    const grantFeedbackCredits = async () => {
      if (!isAuthenticated || !user) return;

      // Check if user has pending feedback credits
      const pendingCredits = sessionStorage.getItem('feedback-credit-bonus');
      if (!pendingCredits) return;

      const rawAmount = parseInt(pendingCredits);
      // Clamp to server-enforced maximum to prevent sessionStorage tampering
      const creditAmount = Math.min(
        Math.max(0, Number.isFinite(rawAmount) ? rawAmount : 0),
        MAX_FEEDBACK_CREDIT_BONUS
      );

      if (creditAmount > 0) {
        // Grant the credits with a reason the server can validate
        const success = await addCredits(
          creditAmount,
          'Feedback survey completion bonus'
        );

        if (success) {
          // Clear the pending credits
          sessionStorage.removeItem('feedback-credit-bonus');
          toast.success(`Welcome! ${creditAmount} bonus credits have been added to your account for completing our survey!`);
        }
      } else {
        // Invalid value — clean up
        sessionStorage.removeItem('feedback-credit-bonus');
      }
    };

    // Small delay to ensure user data is loaded
    const timer = setTimeout(grantFeedbackCredits, 1000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, addCredits]);

  // Check if user has pending feedback credits
  const hasPendingCredits = (): number => {
    const pending = sessionStorage.getItem('feedback-credit-bonus');
    return pending ? Math.min(parseInt(pending) || 0, MAX_FEEDBACK_CREDIT_BONUS) : 0;
  };

  return {
    hasPendingCredits
  };
};