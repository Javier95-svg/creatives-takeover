import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PulseMessageBubble } from './PulseMessageBubble';
import { PulseQuickReplies } from './PulseQuickReplies';
import type { PulseMessage } from '@/hooks/usePulseWidget';

interface PulseChatViewProps {
  messages: PulseMessage[];
  isStreaming: boolean;
  quickReplies: string[];
  onSendMessage: (text: string) => void;
  loading?: boolean; error?: string; onRetry?: () => void; contextLabel?: string; contextNotice?: string;
}

export const PulseChatView = ({ messages, isStreaming, quickReplies, onSendMessage, loading, error, onRetry, contextLabel, contextNotice }: PulseChatViewProps) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '38px';
      textarea.style.height = Math.min(textarea.scrollHeight, 76) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isStreaming || loading || error) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showQuickReplies = quickReplies.length > 0 && !isStreaming && !loading && !error;

  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
      {/* Messages */}
      <ScrollArea ref={scrollRef} className="h-full min-h-0 px-3 py-3">
        {contextLabel && <p className="mb-2 text-xs text-muted-foreground">{contextLabel}</p>}
        {loading && <p role="status" className="mb-2 text-xs text-muted-foreground">Loading saved context...</p>}
        {contextNotice && <p role="status" className="mb-2 text-xs text-muted-foreground">{contextNotice}</p>}
        {error && <p role="alert" className="mb-2 text-xs text-destructive">{error} {onRetry && <button type="button" onClick={onRetry} disabled={isStreaming} className="underline">Retry</button>}</p>}
        <div className="space-y-3 pb-2">
          {messages.map((msg, i) => (
            <PulseMessageBubble
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}
        </div>

        {/* Quick replies shown after first message */}
        {showQuickReplies && (
          <div className="mt-3">
            <PulseQuickReplies replies={quickReplies} onSelect={onSendMessage} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 border-t bg-background p-2 flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          className="min-h-[38px] max-h-[76px] resize-none text-sm flex-1 py-2"
          rows={1}
          disabled={isStreaming || loading}
          maxLength={4000}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || isStreaming || loading || Boolean(error)}
          size="icon"
          className="min-h-[38px] min-w-[38px] rounded-full flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
