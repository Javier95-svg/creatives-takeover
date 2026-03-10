import { Button } from "@/components/ui/button";

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  className?: string;
}

export const MessageReactions = ({
  reactions,
  onAddReaction,
  onRemoveReaction,
  className = ''
}: MessageReactionsProps) => {
  const sortedReactions = [...reactions].sort((a, b) => b.count - a.count);

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {sortedReactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant={reaction.userReacted ? "secondary" : "ghost"}
          size="sm"
          className={`h-6 rounded-full border px-2 text-xs transition-transform hover:scale-105 ${
            reaction.userReacted
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-border/70 bg-background/70 text-foreground"
          }`}
          onClick={() => reaction.userReacted ? onRemoveReaction(reaction.emoji) : onAddReaction(reaction.emoji)}
        >
          <span className="mr-1">{reaction.emoji}</span>
          {reaction.count}
        </Button>
      ))}
    </div>
  );
};
