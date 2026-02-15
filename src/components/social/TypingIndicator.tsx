import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TypingIndicatorProps {
  userAvatar?: string | null;
  userName?: string;
}

export const TypingIndicator = ({ userAvatar, userName }: TypingIndicatorProps) => {
  return (
    <div className="flex gap-2 md:gap-3 items-end animate-in fade-in duration-200">
      <Avatar className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0">
        <AvatarImage src={userAvatar || undefined} />
        <AvatarFallback>
          {userName?.charAt(0) || '?'}
        </AvatarFallback>
      </Avatar>

      <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-sm">
        <div className="flex gap-1 items-center">
          <div
            className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
          />
          <div
            className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
            style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
          />
          <div
            className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"
            style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
          />
        </div>
      </div>
    </div>
  );
};
