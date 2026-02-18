import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PulseBubbleProps {
  hasUnread: boolean;
  onClick: () => void;
}

export const PulseBubble = ({ hasUnread, onClick }: PulseBubbleProps) => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Pulse ring animation when there's an unread proactive message */}
      {hasUnread && (
        <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
      )}
      <Button
        onClick={onClick}
        className="relative h-14 w-14 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 bg-gradient-to-br from-primary to-primary/80"
        size="icon"
        aria-label="Open Pulse AI assistant"
      >
        <MessageSquare className="h-6 w-6" />
        {hasUnread && (
          <span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
        )}
      </Button>
    </div>
  );
};
