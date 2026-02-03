import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FeedbackQuestionnaire } from "@/components/FeedbackQuestionnaire";

interface CreditCampaignPopupProps {
  trigger: 'hover' | 'scroll' | 'time';
  delay?: number;
  onClose?: () => void;
}

export const CreditCampaignPopup = ({ trigger, delay = 3000, onClose }: CreditCampaignPopupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Don't show for authenticated users
    console.log('CreditCampaignPopup check:', { isAuthenticated, trigger, delay });
    if (isAuthenticated) return;

    // Check if user has already seen this popup in this session
    const sessionKey = `credit-popup-${trigger}-seen`;
    let hasSeenPopup: string | null = null;
    try {
      hasSeenPopup = sessionStorage.getItem(sessionKey);
    } catch (error) {
      // Storage can be blocked in some environments; avoid crashing.
      console.warn('CreditCampaignPopup storage unavailable:', error);
      setHasShown(true);
      return;
    }
    console.log('CreditCampaignPopup session check:', { sessionKey, hasSeenPopup, hasShown });
    if (hasSeenPopup || hasShown) return;

    let timeoutId: NodeJS.Timeout;

    const showPopup = () => {
      if (!hasShown) {
        setIsOpen(true);
        setHasShown(true);
        try {
          sessionStorage.setItem(sessionKey, 'true');
        } catch (error) {
          console.warn('CreditCampaignPopup storage unavailable:', error);
        }
      }
    };

    if (trigger === 'time') {
      timeoutId = setTimeout(showPopup, delay);
    } else if (trigger === 'scroll') {
      const handleScroll = () => {
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (scrollPercent > 30) {
          showPopup();
          window.removeEventListener('scroll', handleScroll);
        }
      };
      window.addEventListener('scroll', handleScroll);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [trigger, delay, isAuthenticated, hasShown]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleComplete = (feedbackData?: { creditBonus?: number }) => {
    setIsOpen(false);
    onClose?.();
  };

  if (isAuthenticated || !isOpen) return null;

  return (
    <FeedbackQuestionnaire 
      open={isOpen} 
      onClose={handleClose}
      onComplete={handleComplete}
    />
  );
};
