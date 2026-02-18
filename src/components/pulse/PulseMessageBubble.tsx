import { Sparkles } from 'lucide-react';
import type { PulseMessage } from '@/hooks/usePulseWidget';

interface PulseMessageBubbleProps {
  message: PulseMessage;
  isStreaming?: boolean;
}

export const PulseMessageBubble = ({ message, isStreaming }: PulseMessageBubbleProps) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center self-end">
          <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      )}

      <div
        className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
            : 'bg-muted text-foreground rounded-2xl rounded-bl-sm'
        }`}
      >
        {message.content}
        {isStreaming && !message.content && (
          <div className="flex gap-1 items-center py-1">
            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }} />
            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }} />
            <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }} />
          </div>
        )}
      </div>
    </div>
  );
};
