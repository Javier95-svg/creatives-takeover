import { Bot } from "lucide-react";

export const TypingIndicator = () => {
  return (
    <div className="flex gap-3 sm:gap-4 justify-start animate-fade-in">
      <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg shadow-primary/20 ring-2 ring-primary/10 animate-pulse-slow">
        <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
      </div>
      <div className="max-w-[80%] sm:max-w-[75%] rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-muted to-muted/80 border border-border/50 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground animate-pulse-emoji">🧙</span>
          <span className="text-sm text-muted-foreground">BizMap AI is thinking</span>
          <div className="flex gap-1.5 ml-1">
            <div 
              className="w-2 h-2 bg-primary rounded-full animate-bounce-dot"
              style={{ animationDelay: '0ms' }}
            />
            <div 
              className="w-2 h-2 bg-primary rounded-full animate-bounce-dot"
              style={{ animationDelay: '150ms' }}
            />
            <div 
              className="w-2 h-2 bg-primary rounded-full animate-bounce-dot"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
