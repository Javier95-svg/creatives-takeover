import React from 'react';
import { Bot } from 'lucide-react';
import { useTypingAnimation } from '@/hooks/useTypingAnimation';

interface TypingMessageProps {
  content: string;
  onComplete?: () => void;
  speed?: number;
}

const TypingMessage: React.FC<TypingMessageProps> = ({ 
  content, 
  onComplete,
  speed = 30 
}) => {
  const { displayedText, isTyping, skipAnimation } = useTypingAnimation({
    text: content,
    speed,
    onComplete
  });

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4" />
      </div>
      <div className="max-w-[85%] bg-muted p-3 rounded-lg rounded-bl-none text-sm">
        <div className="whitespace-pre-wrap">
          {displayedText}
          {isTyping && (
            <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse ml-1" />
          )}
        </div>
        {isTyping && content.length > 50 && (
          <button
            onClick={skipAnimation}
            className="text-xs text-muted-foreground hover:text-foreground mt-2 underline"
          >
            Skip animation
          </button>
        )}
      </div>
    </div>
  );
};

export default TypingMessage;