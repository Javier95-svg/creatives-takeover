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
  
  // Use same mobile detection as ChatbotWidget
  const isMobile = window.innerWidth < 768;

  return (
    <div className="flex gap-3">
      <div className={`rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${
        isMobile ? 'w-10 h-10' : 'w-8 h-8'
      }`}>
        <Bot className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
      </div>
      <div className={`max-w-[85%] bg-muted rounded-lg rounded-bl-none ${
        isMobile ? 'p-4 text-base' : 'p-3 text-sm'
      }`}>
        <div className="whitespace-pre-wrap leading-relaxed">
          {displayedText}
          {isTyping && (
            <span className={`inline-block bg-foreground/60 animate-pulse ml-1 ${
              isMobile ? 'w-2.5 h-5' : 'w-2 h-4'
            }`} />
          )}
        </div>
        {isTyping && content.length > 50 && (
          <button
            onClick={skipAnimation}
            className={`text-muted-foreground hover:text-foreground mt-3 underline touch-manipulation ${
              isMobile ? 'text-sm min-h-[44px] py-2' : 'text-xs'
            }`}
          >
            Skip animation
          </button>
        )}
      </div>
    </div>
  );
};

export default TypingMessage;