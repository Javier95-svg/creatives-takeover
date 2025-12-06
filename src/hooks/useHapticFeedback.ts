import { useCallback } from "react";

type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

export const useHapticFeedback = () => {
  const trigger = useCallback((type: HapticType = "medium") => {
    // Check if device supports haptic feedback
    if (!("vibrate" in navigator)) return;

    // Respect reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const patterns: Record<HapticType, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10],
      warning: [20, 50, 20],
      error: [30, 50, 30, 50, 30],
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch (error) {
      // Silently fail if vibration is not supported or blocked
      console.debug("Haptic feedback not available:", error);
    }
  }, []);

  return { trigger };
};

