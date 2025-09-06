import { useEffect } from 'react';
import { useCredits } from './useCredits';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

      const creditAmount = parseInt(pendingCredits);
      if (creditAmount > 0) {
        // Grant the credits
        const success = await addCredits(
          creditAmount, 
          'Feedback survey completion bonus'
        );
        
        if (success) {
          // Clear the pending credits
          sessionStorage.removeItem('feedback-credit-bonus');
          toast.success(`Welcome! ${creditAmount} bonus credits have been added to your account for completing our survey!`);
        }
      }
    };

    // Small delay to ensure user data is loaded
    const timer = setTimeout(grantFeedbackCredits, 1000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, addCredits]);

  // Check if user has pending feedback credits
  const hasPendingCredits = (): number => {
    const pending = sessionStorage.getItem('feedback-credit-bonus');
    return pending ? parseInt(pending) : 0;
  };

  return {
    hasPendingCredits
  };
};