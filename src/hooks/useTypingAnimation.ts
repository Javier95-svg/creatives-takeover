import { useState, useEffect, useRef } from 'react';

interface UseTypingAnimationProps {
  text: string;
  speed?: number;
  startDelay?: number;
  onComplete?: () => void;
}

export const useTypingAnimation = ({ 
  text, 
  speed = 50, 
  startDelay = 0,
  onComplete 
}: UseTypingAnimationProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const indexRef = useRef(0);

  useEffect(() => {
    // Reset state when text changes
    setDisplayedText('');
    setIsTyping(true);
    indexRef.current = 0;

    const startTyping = () => {
      const typeNextCharacter = () => {
        if (indexRef.current < text.length) {
          setDisplayedText(text.substring(0, indexRef.current + 1));
          indexRef.current++;
          timeoutRef.current = setTimeout(typeNextCharacter, speed);
        } else {
          setIsTyping(false);
          onComplete?.();
        }
      };

      timeoutRef.current = setTimeout(typeNextCharacter, startDelay);
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
  }, [text, speed, startDelay, onComplete]);

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