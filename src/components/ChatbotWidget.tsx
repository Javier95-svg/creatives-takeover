import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useChatbot } from '@/hooks/useChatbot';
import TypingMessage from '@/components/TypingMessage';

const ChatbotWidget = () => {
  const {
    isOpen,
    messages,
    isTyping,
    sendMessage,
    handleQuickAction,
    toggleChat,
    setIsOpen,
    streamingMessage,
    isStreaming
  } = useChatbot();
  
  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Device detection with three breakpoints
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      let device: 'mobile' | 'tablet' | 'desktop';
      
      if (width < 768) {
        device = 'mobile';
      } else if (width < 1024) {
        device = 'tablet';
      } else {
        device = 'desktop';
      }
      
      setDeviceType(device);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Device-specific configurations
  const getDeviceConfig = () => {
    switch (deviceType) {
      case 'mobile':
        return {
          containerWidth: 'w-full',
          containerHeight: 'h-full',
          position: 'fixed inset-0',
          buttonSize: 'w-16 h-16',
          iconSize: 'w-7 h-7',
          avatarSize: 'w-12 h-12',
          avatarIconSize: 'w-6 h-6',
          messageTextSize: 'text-base',
          inputTextSize: 'text-base',
          padding: 'p-6',
          messagePadding: 'p-4',
          messagesHeight: 'flex-1 min-h-0',
          headerPadding: 'p-6',
          inputPadding: 'p-6',
          borderRadius: 'rounded-none',
        };
      case 'tablet':
        return {
          containerWidth: 'w-[480px]',
          containerHeight: 'h-[600px]',
          position: 'fixed bottom-6 right-6',
          buttonSize: 'w-15 h-15',
          iconSize: 'w-6 h-6',
          avatarSize: 'w-10 h-10',
          avatarIconSize: 'w-5 h-5',
          messageTextSize: 'text-base',
          inputTextSize: 'text-base',
          padding: 'p-5',
          messagePadding: 'p-4',
          messagesHeight: 'h-[440px]',
          headerPadding: 'p-5',
          inputPadding: 'p-5',
          borderRadius: 'rounded-lg',
        };
      case 'desktop':
      default:
        return {
          containerWidth: 'w-96',
          containerHeight: 'h-[500px]',
          position: 'fixed bottom-6 right-6',
          buttonSize: 'w-14 h-14',
          iconSize: 'w-6 h-6',
          avatarSize: 'w-8 h-8',
          avatarIconSize: 'w-4 h-4',
          messageTextSize: 'text-sm',
          inputTextSize: 'text-sm',
          padding: 'p-4',
          messagePadding: 'p-3',
          messagesHeight: 'h-[360px]',
          headerPadding: 'p-4',
          inputPadding: 'p-4',
          borderRadius: 'rounded-lg',
        };
    }
  };

  const config = getDeviceConfig();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized, streamingMessage]); // Add streamingMessage as dependency

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
      <div className={`${config.position} z-50`}>
        <Button
          onClick={toggleChat}
          className={`${config.buttonSize} ${config.borderRadius} bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse`}
          size="icon"
        >
          <MessageCircle className={config.iconSize} />
        </Button>
      </div>
    );
  }

  return (
    <div className={`${config.position} z-50`}>
      <div className={`bg-background border border-border ${config.borderRadius} shadow-2xl transition-all duration-300 flex flex-col ${
        isMinimized ? (deviceType === 'mobile' ? 'w-full h-20' : deviceType === 'tablet' ? 'w-[480px] h-20' : 'w-80 h-16') : `${config.containerWidth} ${config.containerHeight}`
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between ${config.headerPadding} border-b border-border bg-primary/5 ${deviceType === 'mobile' ? 'rounded-none' : 'rounded-t-lg'} flex-shrink-0`}>
          <div className="flex items-center gap-2">
            <div className={`${config.avatarSize} rounded-full bg-primary/10 flex items-center justify-center`}>
              <MessageCircle className={`${config.avatarIconSize} text-primary`} />
            </div>
            <div>
              <h3 className={`font-semibold ${deviceType === 'mobile' ? 'text-base' : 'text-sm'}`}>BizMap Assistant</h3>
              <p className={`text-muted-foreground ${deviceType === 'mobile' ? 'text-sm' : 'text-xs'}`}>AI-powered help</p>
            </div>
          </div>
          <div className="flex gap-1">
            {deviceType !== 'mobile' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className={deviceType === 'tablet' ? 'w-10 h-10 p-0' : 'w-8 h-8 p-0'}
              >
                <Minimize2 className={deviceType === 'tablet' ? 'w-5 h-5' : 'w-4 h-4'} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className={deviceType === 'tablet' ? 'w-10 h-10 p-0' : 'w-8 h-8 p-0'}
            >
              <X className={deviceType === 'tablet' ? 'w-5 h-5' : 'w-4 h-4'} />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <ScrollArea className={`${config.messagesHeight} ${config.padding} flex-1 min-h-0`}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={message.id}>
                    {message.isBot ? (
                      message.id === 'streaming' ? (
                        // Streaming message - show real-time content
                        <div className="flex gap-3">
                          <div className={`${config.avatarSize} rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                            <MessageCircle className={config.avatarIconSize} />
                          </div>
                          <div className={`max-w-[85%] bg-muted ${config.messagePadding} rounded-lg rounded-bl-none ${config.messageTextSize} whitespace-pre-wrap`}>
                            {streamingMessage || '...'}
                            {isStreaming && (
                              <span className="inline-block w-2 h-4 ml-1 bg-foreground/60 animate-pulse" />
                            )}
                          </div>
                        </div>
                      ) : (
                        // Regular bot message with typing animation
                        <TypingMessage
                          content={message.content}
                          speed={index === messages.length - 1 && !isStreaming ? 30 : 0}
                          deviceType={deviceType}
                        />
                      )
                    ) : (
                      <div className="flex justify-end">
                        <div className={`max-w-[85%] bg-primary text-primary-foreground ${config.messagePadding} rounded-lg rounded-br-none ${config.messageTextSize}`}>
                          {message.content}
                        </div>
                      </div>
                    )}
                    
                    {/* Quick Actions */}
                    {message.quickActions && message.isBot && message.id !== 'streaming' && (
                      <div className={`flex flex-wrap gap-2 ${deviceType === 'mobile' ? 'mt-4 ml-14' : 'mt-3 ml-11'}`}>
                        {message.quickActions.map((action, actionIndex) => (
                          <Button
                            key={actionIndex}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickAction(action.action, action.href)}
                            className={`hover:bg-primary/10 ${
                              deviceType === 'mobile' 
                                ? 'text-sm h-10 px-4 min-h-[44px]' 
                                : deviceType === 'tablet'
                                ? 'text-sm h-8 px-3'
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
                
                {isTyping && !isStreaming && (
                  <div className="flex gap-3">
                    <div className={`${config.avatarSize} rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                      <MessageCircle className={config.avatarIconSize} />
                    </div>
                    <div className={`bg-muted ${config.messagePadding} rounded-lg rounded-bl-none ${config.messageTextSize}`}>
                      <div className="flex gap-1">
                        <div className={`rounded-full bg-foreground/60 animate-bounce ${deviceType === 'mobile' ? 'w-3 h-3' : 'w-2 h-2'}`} />
                        <div className={`rounded-full bg-foreground/60 animate-bounce ${deviceType === 'mobile' ? 'w-3 h-3' : 'w-2 h-2'}`} style={{ animationDelay: '0.1s' }} />
                        <div className={`rounded-full bg-foreground/60 animate-bounce ${deviceType === 'mobile' ? 'w-3 h-3' : 'w-2 h-2'}`} style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className={`${config.inputPadding} border-t border-border flex-shrink-0`}>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  className={`flex-1 ${config.inputTextSize} ${deviceType === 'mobile' ? 'h-12' : ''}`}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  size="sm"
                  className={deviceType === 'mobile' ? 'px-4 h-12' : deviceType === 'tablet' ? 'px-4 h-10' : 'px-3'}
                >
                  <Send className={deviceType === 'mobile' ? 'w-5 h-5' : 'w-4 h-4'} />
                </Button>
              </div>
              <p className={`text-muted-foreground mt-2 text-center ${deviceType === 'mobile' ? 'text-sm' : 'text-xs'}`}>
                Ask about pricing, features, or how to get started
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatbotWidget;