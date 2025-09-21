import React, { useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import TypingMessage from '@/components/TypingMessage';
import { useChatWidget } from '@/hooks/useChatWidget';

const ChatWidget: React.FC = () => {
  const {
    isOpen,
    messages,
    flow,
    isTyping,
    openChat,
    closeChat,
    handleUserResponse,
    conversationOptions
  } = useChatWidget();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleQuickResponse = (option: { text: string; value: string }) => {
    handleUserResponse(option.text, option.value);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (input && input.value.trim()) {
      handleUserResponse(input.value.trim());
      input.value = '';
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={openChat}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse hover:animate-none bg-gradient-to-r from-primary to-primary/80"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
        <div className="absolute -top-12 -left-20 bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-md text-sm whitespace-nowrap animate-fade-in">
          Need help getting started?
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-scale-in">
      <Card className="w-80 h-96 flex flex-col shadow-2xl border-border/50 bg-background/95 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">Here to help you succeed</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeChat}
            className="h-8 w-8 p-0 hover:bg-background/80"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id}>
              {message.isBot ? (
                <TypingMessage 
                  content={message.content}
                  speed={20}
                />
              ) : (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-primary text-primary-foreground p-3 rounded-lg rounded-br-none text-sm">
                    {message.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Quick Response Options */}
          {conversationOptions.length > 0 && !isTyping && (
            <div className="space-y-2">
              {conversationOptions.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-auto py-2 px-3 hover:bg-primary/10 border-border/50"
                  onClick={() => handleQuickResponse(option)}
                >
                  {option.text}
                </Button>
              ))}
            </div>
          )}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="bg-muted p-3 rounded-lg rounded-bl-none">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {flow.step !== 'ended' && (
          <div className="p-4 border-t border-border/50">
            <form onSubmit={handleInputSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Type your message..."
                className="flex-1 text-sm"
                disabled={isTyping}
              />
              <Button
                type="submit"
                size="sm"
                className="px-3"
                disabled={isTyping}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ChatWidget;