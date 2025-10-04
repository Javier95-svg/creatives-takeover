import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { useChatbot } from "@/hooks/useChatbot";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

interface BizMapChatProps {
  wizardSteps: Array<{
    key: string;
    question: string;
    transition?: string;
    placeholder?: string;
  }>;
  onStepComplete: (step: number, answer: string) => void;
  onWizardComplete: (answers: Record<string, string>) => void;
  currentStep: number;
  answers: Record<string, string>;
  initialMessages?: Array<{
    type: "assistant" | "user";
    content: string;
  }>;
}

export const BizMapChat = ({ 
  wizardSteps, 
  onStepComplete, 
  onWizardComplete,
  currentStep,
  answers,
  initialMessages
}: BizMapChatProps) => {
  const [message, setMessage] = useState("");
  const [celebrationMode, setCelebrationMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  console.log('🎯 BizMapChat initialized:', { currentStep, totalSteps: wizardSteps.length, hasAnswers: Object.keys(answers).length, hasInitialMessages: !!initialMessages });

  // Convert initialMessages to ChatMessage format if provided
  const formattedInitialMessages = initialMessages?.map((msg, idx) => ({
    id: `init_${idx}`,
    content: msg.content,
    isBot: msg.type === "assistant",
    timestamp: new Date()
  }));

  const { 
    messages, 
    isTyping, 
    streamingMessage, 
    isStreaming, 
    sendMessage 
  } = useChatbot({
    enableNLU: true,
    enableDynamicFAQ: false,
    enableAnalytics: true,
    enablePersonalization: true,
    enableAIGeneratedAnswers: false,
    initialMessages: formattedInitialMessages, // Pass initial messages to useChatbot
    wizardMode: {
      enabled: true,
      currentStep,
      steps: wizardSteps,
      answers,
      onStepComplete,
      onWizardComplete
    }
  });

  const progress = (currentStep / wizardSteps.length) * 100;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Celebration on milestones
  useEffect(() => {
    if (currentStep === 2 || currentStep === 4 || currentStep === 6) {
      setCelebrationMode(true);
      setTimeout(() => setCelebrationMode(false), 3000);
    }
  }, [currentStep]);

  const handleSend = () => {
    if (message.trim() && !isTyping && !isStreaming) {
      console.log('💬 Sending message:', message);
      sendMessage(message);
      setMessage("");
    } else {
      console.log('⚠️ Cannot send message:', { hasMessage: !!message.trim(), isTyping, isStreaming });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getCurrentPlaceholder = () => {
    if (currentStep < wizardSteps.length) {
      return wizardSteps[currentStep].placeholder || "Type your answer here...";
    }
    return "Type your message...";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress Bar */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {wizardSteps.length}
          </span>
          {celebrationMode && (
            <span className="text-lg animate-bounce">🎉</span>
          )}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex gap-3 sm:gap-4 ${msg.isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {msg.isBot && (
              <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg shadow-primary/20 ring-2 ring-primary/10">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
            )}
            <div
              className={`max-w-[80%] sm:max-w-[75%] rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:shadow-lg ${
                msg.isBot
                  ? 'bg-gradient-to-br from-muted to-muted/80 border border-border/50 shadow-sm hover:shadow-primary/5'
                  : 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/20 hover:shadow-xl hover:shadow-primary/30'
              }`}
            >
              <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {msg.quickActions && msg.quickActions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/30">
                  {msg.quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(action.text)}
                      className="text-xs sm:text-sm hover:scale-105 transition-transform duration-200 bg-background/50 hover:bg-background"
                    >
                      {action.text}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {!msg.isBot && (
              <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary via-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 ring-2 ring-primary/20">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingMessage && (
          <div className="flex gap-3 sm:gap-4 justify-start animate-fade-in">
            <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg shadow-primary/20 ring-2 ring-primary/10 animate-pulse">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div className="max-w-[80%] sm:max-w-[75%] rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-muted to-muted/80 border border-border/50 shadow-sm">
              <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                {streamingMessage}
                <span className="inline-block w-0.5 h-5 ml-1 bg-primary animate-pulse" />
              </p>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !isStreaming && (
          <div className="flex gap-3 sm:gap-4 justify-start animate-fade-in">
            <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg shadow-primary/20 ring-2 ring-primary/10">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground animate-pulse" />
            </div>
            <div className="max-w-[80%] sm:max-w-[75%] rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-muted to-muted/80 border border-border/50 shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2.5 h-2.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 p-4 sm:p-5 bg-gradient-to-br from-background to-muted/20">
        <div className="flex gap-2 sm:gap-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getCurrentPlaceholder()}
            disabled={isTyping || isStreaming}
            className="flex-1 bg-background/80 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm sm:text-base"
          />
          <Button 
            onClick={handleSend}
            disabled={!message.trim() || isTyping || isStreaming}
            size="icon"
            className="h-10 w-10 sm:h-11 sm:w-11 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isTyping || isStreaming ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
