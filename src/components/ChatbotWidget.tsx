import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatbot } from '@/hooks/useChatbot';
import TypingMessage from '@/components/TypingMessage';
import { useIsMobile } from '@/hooks/use-mobile';

const ChatbotWidget = () => {
  const {
    isOpen,
    messages,
    isTyping,
    sendMessage,
    handleQuickAction,
    toggleChat,
    setIsOpen
  } = useChatbot();
  
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <div className={`fixed z-50 ${isMobile ? 'bottom-4 right-4' : 'bottom-6 right-6'}`}>
        <Button
          onClick={toggleChat}
          className={`rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse ${
            isMobile ? 'w-16 h-16' : 'w-14 h-14'
          }`}
          size="icon"
        >
          <MessageCircle className={isMobile ? 'w-7 h-7' : 'w-6 h-6'} />
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed z-50 transition-all duration-300 ${
      isMobile 
        ? 'inset-0 bg-background' 
        : `bottom-6 right-6 ${isMinimized ? 'w-80 h-16' : 'w-96 h-[500px]'} bg-background border border-border rounded-lg shadow-2xl`
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-border bg-primary/5 ${
        isMobile ? 'p-4 h-16' : isMinimized ? 'p-3 rounded-t-lg' : 'p-4 rounded-t-lg'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`rounded-full bg-primary/10 flex items-center justify-center ${
            isMobile ? 'w-10 h-10' : 'w-8 h-8'
          }`}>
            <MessageCircle className={`text-primary ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
          </div>
          <div>
            <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-sm'}`}>BizMap Assistant</h3>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-xs'}`}>AI-powered business help</p>
          </div>
        </div>
        <div className="flex gap-1">
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-8 h-8 p-0 hover:bg-muted"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className={`p-0 hover:bg-muted ${isMobile ? 'w-10 h-10' : 'w-8 h-8'}`}
          >
            <X className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
          </Button>
        </div>
      </div>

      {(!isMinimized || isMobile) && (
        <>
          {/* Messages */}
          <ScrollArea className={`${
            isMobile 
              ? 'h-[calc(100vh-8rem)]' 
              : 'h-[360px]'
          } p-4`}>
            <div className={`space-y-4 ${isMobile ? 'pb-4' : ''}`}>
              {messages.map((message, index) => (
                <div key={message.id}>
                  {message.isBot ? (
                    <TypingMessage
                      content={message.content}
                      speed={index === messages.length - 1 ? 30 : 0}
                    />
                  ) : (
                    <div className="flex justify-end">
                      <div className={`max-w-[85%] bg-primary text-primary-foreground rounded-lg rounded-br-none ${
                        isMobile ? 'p-4 text-base' : 'p-3 text-sm'
                      }`}>
                        {message.content}
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Actions */}
                  {message.quickActions && message.isBot && (
                    <div className={`flex flex-wrap gap-2 mt-3 ${
                      isMobile ? 'ml-14' : 'ml-11'
                    }`}>
                      {message.quickActions.map((action, actionIndex) => (
                        <Button
                          key={actionIndex}
                          variant="outline"
                          size={isMobile ? 'default' : 'sm'}
                          onClick={() => handleQuickAction(action.action, action.href)}
                          className={`hover:bg-primary/10 ${
                            isMobile 
                              ? 'text-sm h-9 px-4 min-h-[44px]' 
                              : 'text-xs h-7 px-2'
                          }`}
                        >
                          {action.text}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3">
                  <div className={`rounded-full bg-muted flex items-center justify-center flex-shrink-0 ${
                    isMobile ? 'w-10 h-10' : 'w-8 h-8'
                  }`}>
                    <MessageCircle className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
                  </div>
                  <div className={`bg-muted rounded-lg rounded-bl-none ${
                    isMobile ? 'p-4 text-base' : 'p-3 text-sm'
                  }`}>
                    <div className="flex gap-1">
                      <div className={`rounded-full bg-foreground/60 animate-bounce ${
                        isMobile ? 'w-2.5 h-2.5' : 'w-2 h-2'
                      }`} />
                      <div className={`rounded-full bg-foreground/60 animate-bounce ${
                        isMobile ? 'w-2.5 h-2.5' : 'w-2 h-2'
                      }`} style={{ animationDelay: '0.1s' }} />
                      <div className={`rounded-full bg-foreground/60 animate-bounce ${
                        isMobile ? 'w-2.5 h-2.5' : 'w-2 h-2'
                      }`} style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className={`border-t border-border bg-background ${
            isMobile ? 'p-4 pb-6' : 'p-4'
          }`}>
            <div className={`flex gap-3 ${isMobile ? 'items-end' : 'gap-2'}`}>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className={`flex-1 ${
                  isMobile 
                    ? 'text-base h-12 px-4 py-3 rounded-xl' 
                    : 'text-sm'
                }`}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                size={isMobile ? 'default' : 'sm'}
                className={`${
                  isMobile 
                    ? 'px-6 h-12 rounded-xl min-w-[60px]' 
                    : 'px-3'
                }`}
              >
                <Send className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
              </Button>
            </div>
            {!isMobile && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Ask about pricing, features, or how to get started
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatbotWidget;