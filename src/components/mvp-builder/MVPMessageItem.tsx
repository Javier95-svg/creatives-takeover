import React from 'react';
import { Sparkles } from 'lucide-react';
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
        <div className="max-w-[82%] rounded-3xl rounded-br-md border border-info/20 bg-gradient-to-br from-info to-info px-4 py-3 text-sm leading-relaxed text-foreground shadow-[0_18px_40px_rgba(14,165,233,0.28)]">
          <div className="mb-1 flex items-center justify-between gap-3 text-caption font-semibold uppercase tracking-[0.24em] text-foreground/70">
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
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-gradient-to-br from-white/12 to-info/18 shadow-[0_12px_30px_rgba(6,11,22,0.45)]">
        <Sparkles className="h-3.5 w-3.5 text-info" />
      </div>

      <div className="max-w-[88%] rounded-3xl rounded-tl-md border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-muted-foreground shadow-[0_22px_48px_rgba(0,0,0,0.28)] backdrop-blur-sm">
        {showTypingDots ? (
          <div className="py-1">
            <div className="mb-2 flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              <span>AI Builder</span>
              <span className="h-1 w-1 rounded-full bg-success" />
              <span>Streaming</span>
            </div>
            {statusText && (
              <p className="mb-2 text-sm leading-relaxed text-foreground/85">
                {statusText}
              </p>
            )}
            <div className="flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between gap-3 text-caption font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              <span>AI Builder</span>
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
