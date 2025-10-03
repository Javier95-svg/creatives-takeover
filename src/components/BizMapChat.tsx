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
}

export const BizMapChat = ({ 
  wizardSteps, 
  onStepComplete, 
  onWizardComplete,
  currentStep,
  answers
}: BizMapChatProps) => {
  const [message, setMessage] = useState("");
  const [celebrationMode, setCelebrationMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

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
      sendMessage(message);
      setMessage("");
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.isBot ? 'justify-start' : 'justify-end'}`}
          >
            {msg.isBot && (
              <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                msg.isBot
                  ? 'bg-muted'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.quickActions && msg.quickActions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {msg.quickActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(action.text)}
                      className="text-xs"
                    >
                      {action.text}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {!msg.isBot && (
              <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingMessage && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="max-w-[80%] rounded-lg p-4 bg-muted">
              <p className="text-sm whitespace-pre-wrap">
                {streamingMessage}
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              </p>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !isStreaming && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="max-w-[80%] rounded-lg p-4 bg-muted">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getCurrentPlaceholder()}
            disabled={isTyping || isStreaming}
            className="flex-1"
          />
          <Button 
            onClick={handleSend}
            disabled={!message.trim() || isTyping || isStreaming}
            size="icon"
          >
            {isTyping || isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
