import React from 'react';
import { Bot } from 'lucide-react';
import { useTypingAnimation } from '@/hooks/useTypingAnimation';

interface TypingMessageProps {
  content: string;
  onComplete?: () => void;
  speed?: number;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
}

const TypingMessage: React.FC<TypingMessageProps> = ({ 
  content, 
  onComplete,
  speed = 30,
  deviceType = 'desktop'
}) => {
  const { displayedText, isTyping, skipAnimation } = useTypingAnimation({
    text: content,
    speed,
    onComplete
  });

  // Device-specific configurations
  const getDeviceConfig = () => {
    switch (deviceType) {
      case 'mobile':
        return {
          avatarSize: 'w-12 h-12',
          iconSize: 'w-6 h-6',
          textSize: 'text-base',
          padding: 'p-4',
          cursorSize: 'w-2.5 h-5',
          skipButtonSize: 'text-sm min-h-[44px] py-2',
        };
      case 'tablet':
        return {
          avatarSize: 'w-10 h-10',
          iconSize: 'w-5 h-5',
          textSize: 'text-base',
          padding: 'p-4',
          cursorSize: 'w-2.5 h-4.5',
          skipButtonSize: 'text-sm py-1',
        };
      case 'desktop':
      default:
        return {
          avatarSize: 'w-8 h-8',
          iconSize: 'w-4 h-4',
          textSize: 'text-sm',
          padding: 'p-3',
          cursorSize: 'w-2 h-4',
          skipButtonSize: 'text-xs',
        };
    }
  };

  const config = getDeviceConfig();

  return (
    <div className="flex gap-3">
      <div className={`${config.avatarSize} rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
        <Bot className={config.iconSize} />
      </div>
      <div className={`max-w-[85%] bg-muted ${config.padding} rounded-lg rounded-bl-none ${config.textSize}`}>
        <div className="whitespace-pre-wrap leading-relaxed">
          {displayedText}
          {isTyping && (
            <span className={`inline-block bg-foreground/60 animate-pulse ml-1 ${config.cursorSize}`} />
          )}
        </div>
        {isTyping && content.length > 50 && (
          <button
            onClick={skipAnimation}
            className={`text-muted-foreground hover:text-foreground mt-3 underline touch-manipulation ${config.skipButtonSize}`}
          >
            Skip animation
          </button>
        )}
      </div>
    </div>
  );
};

export default TypingMessage;