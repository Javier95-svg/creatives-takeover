import React, { useEffect, useRef } from 'react';
import { Loader2, Square, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionSelect?: (value: string) => void;
  showSuggestions?: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  onSend,
  onCancel,
  disabled = false,
  isGenerating = false,
  placeholder = 'Describe what you want to build...',
  suggestions = [],
  onSuggestionSelect,
  showSuggestions = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const characterCount = value.length;
  const canSend = value.trim().length > 0 && !disabled;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = '0px';
    const nextHeight = Math.min(textarea.scrollHeight, 24 * 5 + 24);
    textarea.style.height = `${nextHeight}px`;
  }, [value]);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'relative overflow-hidden rounded-[26px] border bg-background/90 p-3 transition-all duration-200 ease-out',
          'border-border/70 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.5)]',
          'focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]',
          isGenerating && 'border-primary/40'
        )}
      >
        {isGenerating && (
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-40"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            style={{
              background:
                'linear-gradient(110deg, transparent 20%, hsl(var(--primary)/0.18) 50%, transparent 80%)',
            }}
          />
        )}

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (isGenerating) {
                onCancel();
                return;
              }
              if (canSend) {
                onSend();
              }
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="min-h-[64px] max-h-[144px] resize-none border-0 bg-transparent px-0 py-0 text-sm leading-6 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            {characterCount} characters
          </p>

          <motion.div whileHover={{ scale: isGenerating ? 1 : 1.04 }} whileTap={{ scale: 0.96 }}>
            <Button
              type="button"
              size="icon"
              className={cn(
                'h-11 w-11 rounded-2xl transition-all duration-200 ease-out',
                isGenerating
                  ? 'bg-amber-500 text-amber-950 hover:bg-amber-400'
                  : 'bg-primary text-primary-foreground shadow-[0_12px_28px_-18px_hsl(var(--primary))]'
              )}
              onClick={isGenerating ? onCancel : onSend}
              disabled={isGenerating ? false : !canSend}
            >
              {isGenerating ? (
                <Square className="h-4 w-4 fill-current" />
              ) : disabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestionSelect?.(suggestion)}
              className="rounded-full border border-border/70 bg-muted/35 px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 ease-out hover:border-primary/35 hover:bg-primary/8 hover:text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
