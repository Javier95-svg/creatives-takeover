interface PulseQuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
}

export const PulseQuickReplies = ({ replies, onSelect }: PulseQuickRepliesProps) => {
  return (
    <div className="flex flex-wrap gap-1.5 px-0.5">
      {replies.map((reply) => (
        <button
          key={reply}
          onClick={() => onSelect(reply)}
          className="min-h-7 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground rounded-full border transition-colors whitespace-nowrap"
        >
          {reply}
        </button>
      ))}
    </div>
  );
};
