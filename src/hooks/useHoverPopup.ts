import { useState, useRef, useEffect } from 'react';

interface UseHoverPopupProps {
  delay?: number;
  trigger: string; // unique identifier for sessionStorage
}

export const useHoverPopup = ({ delay = 2000, trigger }: UseHoverPopupProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if popup has already been shown in this session
    const sessionKey = `hover-popup-${trigger}-shown`;
    try {
      const hasSeenPopup = sessionStorage.getItem(sessionKey);
      if (hasSeenPopup) {
        setHasShown(true);
      }
    } catch (error) {
      // Storage can be blocked in some environments; fail closed.
      console.warn('Hover popup storage unavailable:', error);
      setHasShown(true);
    }
  }, [trigger]);

  const handleMouseEnter = () => {
    if (hasShown) return;
    
    setIsHovered(true);
    timeoutRef.current = setTimeout(() => {
      if (!hasShown) {
        setShowPopup(true);
        setHasShown(true);
        try {
          sessionStorage.setItem(`hover-popup-${trigger}-shown`, 'true');
        } catch (error) {
          console.warn('Hover popup storage unavailable:', error);
        }
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  return {
    showPopup,
    closePopup,
    handleMouseEnter,
    handleMouseLeave,
    hasShown
  };
};
