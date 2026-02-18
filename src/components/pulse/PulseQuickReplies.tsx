interface PulseQuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
}

export const PulseQuickReplies = ({ replies, onSelect }: PulseQuickRepliesProps) => {
  return (
    <div className="flex flex-wrap gap-2 px-1">
      {replies.map((reply) => (
        <button
          key={reply}
          onClick={() => onSelect(reply)}
          className="min-h-[44px] px-3.5 py-2 text-sm bg-muted hover:bg-muted/80 text-foreground rounded-full border transition-colors whitespace-nowrap"
        >
          {reply}
        </button>
      ))}
    </div>
  );
};
