import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PulseBubbleProps {
  hasUnread: boolean;
  onClick: () => void;
  compactMobileHomepage?: boolean;
}

export const PulseBubble = ({ hasUnread, onClick, compactMobileHomepage = false }: PulseBubbleProps) => {
  return (
    <div
      className={cn(
        "fixed right-4 z-50 sm:right-6",
        compactMobileHomepage ? "bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))]" : "bottom-6"
      )}
    >
      {/* Pulse ring animation when there's an unread proactive message */}
      {hasUnread && (
        <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
      )}
      <Button
        onClick={onClick}
        className={cn(
          "relative rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 bg-gradient-to-br from-primary to-primary/80",
          compactMobileHomepage ? "h-12 w-12" : "h-14 w-14"
        )}
        size="icon"
        aria-label="Open Pulse AI assistant"
      >
        <MessageSquare className={cn(compactMobileHomepage ? "h-5 w-5" : "h-6 w-6")} />
        {hasUnread && (
          <span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
        )}
      </Button>
    </div>
  );
};
