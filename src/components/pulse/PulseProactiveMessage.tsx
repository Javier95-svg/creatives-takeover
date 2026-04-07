import { X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PulseProactiveMessageProps {
  message: string;
  onDismiss: () => void;
  onClick: () => void;
  compactMobileHomepage?: boolean;
}

export const PulseProactiveMessage = ({
  message,
  onDismiss,
  onClick,
  compactMobileHomepage = false,
}: PulseProactiveMessageProps) => {
  return (
    <div
      className={cn(
        "fixed z-50 max-w-xs animate-in slide-in-from-bottom-4 fade-in duration-300",
        compactMobileHomepage
          ? "bottom-[calc(12rem+env(safe-area-inset-bottom,0px))] right-4"
          : "bottom-24 right-6"
      )}
    >
      <div
        className="relative bg-card border shadow-xl rounded-2xl rounded-br-sm p-4 cursor-pointer hover:shadow-2xl transition-shadow"
        onClick={onClick}
      >
        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute -top-2 -right-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-muted border shadow-sm hover:bg-muted/80 transition-colors"
          aria-label="Dismiss message"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {/* Avatar + Message */}
        <div className="flex gap-3 items-start">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Pulse</p>
            <p className="text-sm text-foreground leading-relaxed">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
