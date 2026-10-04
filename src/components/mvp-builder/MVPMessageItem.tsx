import React from 'react';
import { Bot } from 'lucide-react';
import { StreamingMessage } from '@/components/chatbot/StreamingMessage';
import type { MVPMessage } from '@/hooks/useMVPBuilder';
import { getMVPModelLabel } from '@/data/mvpModels';

interface MVPMessageItemProps {
  message: MVPMessage;
}

export const MVPMessageItem: React.FC<MVPMessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="mb-4 flex justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-br-md border border-primary/30 bg-primary/15 px-4 py-3 text-sm leading-relaxed text-white">
          <div className="mb-1 flex items-center justify-between gap-3 text-caption font-medium text-white/60">
            <span>You</span>
          </div>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const showTypingDots = message.isStreaming && !message.content;
  const modelLabel = getMVPModelLabel(message.model);
  const statusText = message.statusText?.trim();

  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.04]">
        <Bot className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      </div>

      <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-muted-foreground">
        {showTypingDots ? (
          <div className="py-1">
            <div className="mb-2 flex items-center gap-2 text-caption font-medium text-muted-foreground">
              <span>Builder</span>
              <span>is working</span>
            </div>
            {statusText && (
              <p className="mb-2 text-sm leading-relaxed text-foreground/85">
                {statusText}
              </p>
            )}
            <div className="flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between gap-3 text-caption font-medium text-muted-foreground">
              <span>Builder</span>
              {modelLabel && <span className="text-muted-foreground">{modelLabel}</span>}
            </div>
            <StreamingMessage
              content={message.content}
              isComplete={!message.isStreaming}
              isBot={true}
              spacious={true}
            />
            {modelLabel && !message.isStreaming && (
              <p className="mt-3 border-t border-white/8 pt-2 text-caption text-muted-foreground">
                Generated with {modelLabel}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
