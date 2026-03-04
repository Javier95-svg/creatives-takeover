import React from 'react';
import { StreamingMessage } from '@/components/chatbot/StreamingMessage';
import { cn } from '@/lib/utils';
import type { MVPMessage } from '@/hooks/useMVPBuilder';

interface MVPMessageItemProps {
  message: MVPMessage;
}

export const MVPMessageItem: React.FC<MVPMessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3">
      <div
        className={cn(
          'max-w-[90%] rounded-2xl rounded-tl-sm bg-muted/60 border border-border/40 px-4 py-2.5 text-sm',
          message.isStreaming && 'min-w-[80px]'
        )}
      >
        <StreamingMessage
          content={message.content}
          isComplete={!message.isStreaming}
          isBot={true}
        />
      </div>
    </div>
  );
};
