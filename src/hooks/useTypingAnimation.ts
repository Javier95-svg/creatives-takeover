import { useState, useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface UseTypingAnimationProps {
  text: string;
  speed?: number;
  startDelay?: number;
  onComplete?: () => void;
}

// One React state update per character is what this used to do. On the
// newspaper hero that is a 600-character string at 20ms — 600 renders, layouts
// and paints across 12 seconds, right when visitors are most likely to click
// something. Measured on /newspaper at 4x CPU throttling: an interaction during
// the animation cost 432ms versus 232ms once it had finished.
//
// Ticking in small chunks instead keeps the total duration and the perceived
// speed identical (charactersPerTick * interval == charactersPerTick * speed)
// while cutting the number of renders by the same factor. 60ms is still ~16
// updates a second, which reads as typing rather than as stepping.
const MIN_TICK_MS = 60;

export const useTypingAnimation = ({
  text,
  speed = 50,
  startDelay = 0,
  onComplete
}: UseTypingAnimationProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const indexRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayedText(text);
      setIsTyping(false);
      onComplete?.();
      return;
    }

    // Reset state when text changes
    setDisplayedText('');
    setIsTyping(true);
    indexRef.current = 0;

    // Advance several characters per tick when the requested speed is faster
    // than MIN_TICK_MS, so a fast animation costs proportionally fewer renders
    // instead of one per character.
    const charactersPerTick = Math.max(1, Math.round(MIN_TICK_MS / Math.max(speed, 1)));
    const tickInterval = speed * charactersPerTick;

    const startTyping = () => {
      const typeNextChunk = () => {
        if (indexRef.current < text.length) {
          indexRef.current = Math.min(text.length, indexRef.current + charactersPerTick);
          setDisplayedText(text.substring(0, indexRef.current));
          timeoutRef.current = setTimeout(typeNextChunk, tickInterval);
        } else {
          setIsTyping(false);
          onComplete?.();
        }
      };

      timeoutRef.current = setTimeout(typeNextChunk, startDelay);
    };

    if (text) {
      startTyping();
    } else {
      setIsTyping(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, speed, startDelay, onComplete, prefersReducedMotion]);

  const skipAnimation = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDisplayedText(text);
    setIsTyping(false);
    onComplete?.();
  };

  return {
    displayedText,
    isTyping,
    skipAnimation
  };
};
