import { useState, useEffect } from "react";

export const useExitIntent = () => {
  const [showExitIntent, setShowExitIntent] = useState(false);

  useEffect(() => {
    // Check if user has already seen the exit intent in this session
    const hasSeenExitIntent = sessionStorage.getItem('exit-intent-seen');
    if (hasSeenExitIntent) return;

    let isExitIntentTriggered = false;

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse is leaving from the top of the page
      if (e.clientY <= 0 && !isExitIntentTriggered) {
        isExitIntentTriggered = true;
        setShowExitIntent(true);
        // Mark as seen for this session
        sessionStorage.setItem('exit-intent-seen', 'true');
      }
    };

    // Add small delay before enabling exit intent detection
    const timer = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 3000); // Wait 3 seconds before enabling exit intent

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const closeExitIntent = () => {
    setShowExitIntent(false);
  };

  return {
    showExitIntent,
    closeExitIntent
  };
};