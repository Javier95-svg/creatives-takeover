import React from 'react';
import { Sparkles } from 'lucide-react';
import { StreamingMessage } from '@/components/chatbot/StreamingMessage';
import type { MVPMessage } from '@/hooks/useMVPBuilder';

interface MVPMessageItemProps {
  message: MVPMessage;
}

function formatModelName(model?: string): string | null {
  if (!model) return null;
  if (model === 'google/gemini-3-flash') return 'Gemini 3 Flash';
  if (model === 'google/gemini-2.5-flash') return 'Gemini 2.5 Flash';
  return model;
}

export const MVPMessageItem: React.FC<MVPMessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const showTypingDots = message.isStreaming && !message.content;
  const modelLabel = formatModelName(message.model);

  return (
    <div className="flex items-start gap-2 mb-4">
      {/* AI avatar */}
      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="h-3 w-3 text-primary-foreground" />
      </div>

      {/* Bubble */}
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-card border border-border/50 shadow-sm px-4 py-2.5 text-sm">
        {showTypingDots ? (
          <div className="flex gap-1 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
          </div>
        ) : (
          <>
            <StreamingMessage
              content={message.content}
              isComplete={!message.isStreaming}
              isBot={true}
            />
            {modelLabel && !message.isStreaming && (
              <p className="mt-2 text-[10px] text-muted-foreground/70">
                Model used: {modelLabel}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
