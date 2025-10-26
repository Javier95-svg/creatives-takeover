import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Loader2, Sparkles, Share2, BookOpen, X, FileText, Info, Bot, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileAttachment } from './chatbot/FileAttachment';
import { useChatbot } from "@/hooks/useChatbot";
import { useAuth } from "@/contexts/AuthContext";
import { ShareToCommunityDialog } from "./chatbot/ShareToCommunityDialog";
import { WizardConversionPrompt } from "./chatbot/WizardConversionPrompt";
import { useNavigate } from "react-router-dom";
import { useChatBotStore } from "@/store/chatBotStore";

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
  onChatModeReady?: (switchToFreeform: () => void) => void;
}

// Helper function to categorize message importance
const categorizeMessageImportance = (content: string): number => {
  const highPriorityKeywords = [
    'recommend', 'suggestion', 'insight', 'analysis', 'concern', 'opportunity',
    'risk', 'strength', 'weakness', 'strategy', 'metric', 'score', 'validation',
    'differentiation', 'competitive', 'market', 'financial', 'revenue', 'cost'
  ];
  
  const lowPriorityKeywords = [
    'hello', 'hi', 'welcome', 'thank you', 'let me know', 'what do you think',
    'can you tell me', 'please share', 'i understand'
  ];
  
  const contentLower = content.toLowerCase();
  
  // Skip very short messages
  if (content.length < 50) return 0;
  
  // Check for low priority
  if (lowPriorityKeywords.some(keyword => contentLower.includes(keyword)) && content.length < 150) {
    return 1;
  }
  
  // Check for high priority
  const highPriorityCount = highPriorityKeywords.filter(keyword => contentLower.includes(keyword)).length;
  if (highPriorityCount >= 3) return 5;
  if (highPriorityCount >= 2) return 4;
  if (highPriorityCount >= 1) return 3;
  
  // Check for structured data (numbers, percentages, etc.)
  if (/\d+%|\$\d+|score|rating/i.test(content)) return 4;
  
  return 2;
};

// Helper function to extract key content for sharing
const extractKeyContent = (messages: any[], businessContext: any) => {
  const botMessages = messages.filter(m => m.isBot);
  
  if (botMessages.length === 0) {
    return { summary: '', keyPoints: [] };
  }
  
  // Score and sort messages by importance
  const scoredMessages = botMessages.map(msg => ({
    content: msg.content,
    score: categorizeMessageImportance(msg.content),
    context: msg.businessContext
  })).filter(m => m.score >= 2);
  
  scoredMessages.sort((a, b) => b.score - a.score);
  
  // Take the most recent substantive messages (last 2-3)
  const recentMessages = botMessages.slice(-3).filter(m => 
    categorizeMessageImportance(m.content) >= 2
  );
  
  // Combine high-scored messages and recent messages
  const importantMessages = [
    ...scoredMessages.slice(0, 2),
    ...recentMessages.slice(-2)
  ].filter((msg, index, self) => 
    index === self.findIndex(m => m.content === msg.content)
  );
  
  // Extract key points
  const keyPoints: string[] = [];
  importantMessages.forEach(msg => {
    // Extract bullet points or numbered lists
    const bulletPoints = msg.content.match(/^[-•*]\s+(.+)$/gm);
    if (bulletPoints && bulletPoints.length > 0) {
      keyPoints.push(...bulletPoints.slice(0, 3).map(bp => bp.replace(/^[-•*]\s+/, '')));
    }
  });
  
  return {
    summary: importantMessages.map(m => m.content).join('\n\n---\n\n'),
    keyPoints: keyPoints.slice(0, 5),
    businessContext,
    messageTypes: importantMessages.map(m => {
      const content = m.content.toLowerCase();
      if (content.includes('recommend') || content.includes('suggestion')) return 'recommendation';
      if (content.includes('risk') || content.includes('concern')) return 'risk_assessment';
      if (content.includes('opportunity')) return 'opportunity';
      if (content.includes('market') || content.includes('competitive')) return 'market_analysis';
      if (content.includes('financial') || content.includes('revenue')) return 'financial';
      return 'general_insight';
    })
  };
};

export const BizMapChat = ({ 
  wizardSteps, 
  onStepComplete, 
  onWizardComplete,
  currentStep,
  answers,
  onChatModeReady
}: BizMapChatProps) => {
  const [message, setMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [celebrationMode, setCelebrationMode] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addStepResponse } = useChatBotStore();
  
  // Listen for examples modal event
  useEffect(() => {
    const handleOpenExamples = () => {
      // Trigger parent's examples modal
      const event = new CustomEvent('triggerExamplesModal');
      window.dispatchEvent(event);
    };
    window.addEventListener('openExamplesModal', handleOpenExamples);
    return () => window.removeEventListener('openExamplesModal', handleOpenExamples);
  }, []);
  
  // Conversion prompt state
  const [showInlineBanner, setShowInlineBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  console.log('🎯 BizMapChat initialized:', { currentStep, totalSteps: wizardSteps.length, hasAnswers: Object.keys(answers).length });

  const { 
    messages, 
    isTyping, 
    streamingMessage, 
    isStreaming, 
    sendMessage,
    chatMode,
    switchToFreeform,
    conversionPromptShown,
    conversionPromptDismissed,
    trackConversionEvent
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
      onStepComplete: (step, answer) => {
        // Track in Zustand store (convert 0-indexed to 1-indexed)
        addStepResponse(step + 1, {
          [wizardSteps[step].key]: answer
        });
        
        // Call parent handler
        onStepComplete(step, answer);
      },
      onWizardComplete
    }
  });

  const progress = (currentStep / wizardSteps.length) * 100;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "nearest",
      inline: "nearest"
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Load prompt from Prompt Library or Example Template
  useEffect(() => {
    const savedPrompt = localStorage.getItem('bizmap_prompt');
    const savedExamplePrompt = localStorage.getItem('bizmap_example_prompt');
    
    if (savedExamplePrompt) {
      console.log('📥 Loading example template prompt');
      setMessage(savedExamplePrompt);
      localStorage.removeItem('bizmap_example_prompt');
    } else if (savedPrompt) {
      console.log('📥 Loading prompt from Prompt Library into input field');
      setMessage(savedPrompt);
      localStorage.removeItem('bizmap_prompt');
    }
  }, []);

  // Celebration on milestones
  useEffect(() => {
    if (currentStep === 2 || currentStep === 4 || currentStep === 6) {
      setCelebrationMode(true);
      setTimeout(() => setCelebrationMode(false), 3000);
    }
  }, [currentStep]);

  // Expose switchToFreeform to parent
  useEffect(() => {
    if (onChatModeReady) {
      onChatModeReady(switchToFreeform);
    }
  }, [switchToFreeform, onChatModeReady]);

  // Conversion prompt logic - softer approach: show after meaningful engagement
  useEffect(() => {
    if (user) {
      // User is authenticated, don't show prompts
      setShowInlineBanner(false);
      setShowModal(false);
      return;
    }

    const messageCount = messages.length;
    const hasValueDemonstration = currentStep >= 3 || messageCount >= 5;

    // Only show prompts after user has received value (3+ wizard steps OR 5+ messages)
    if (!hasValueDemonstration) {
      return;
    }

    // Soft nudge: Show inline banner after value demonstration
    if (currentStep === 3 && !conversionPromptShown && chatMode === 'wizard') {
      setShowInlineBanner(true);
      trackConversionEvent('shown', 4);
    }

    // Stronger nudge: Show modal if banner was dismissed and user continues
    if (currentStep >= 5 && conversionPromptDismissed && !showModal && chatMode === 'wizard') {
      setShowModal(true);
      trackConversionEvent('shown', currentStep + 1);
    }
    
    // Freeform mode: show after 5+ meaningful exchanges
    if (chatMode === 'freeform' && messageCount >= 10 && !conversionPromptShown) {
      setShowInlineBanner(true);
      trackConversionEvent('shown', 10);
    }
  }, [currentStep, messages.length, user, conversionPromptShown, conversionPromptDismissed, chatMode, wizardSteps.length, trackConversionEvent]);

  // Handle conversion actions
  const handleSignUpClick = () => {
    // Save current progress to localStorage for non-authenticated users
    const progress = {
      step: currentStep,
      answers,
      timestamp: Date.now()
    };
    localStorage.setItem('bizmap_progress', JSON.stringify(progress));
    
    trackConversionEvent('converted', currentStep + 1);
    navigate(`/signup?source=bizmap-step-${currentStep + 1}&return=/dream2plan`);
  };

  const handleDismiss = () => {
    setShowInlineBanner(false);
    setShowModal(false);
    trackConversionEvent('dismissed', currentStep + 1);
  };

  const handleSend = () => {
    if ((message.trim() || attachedFiles.length > 0) && !isTyping && !isStreaming) {
      console.log('💬 Sending message:', { message, filesCount: attachedFiles.length });
      sendMessage(message, attachedFiles);
      setMessage("");
      setAttachedFiles([]);
    } else {
      console.log('⚠️ Cannot send message:', { 
        hasMessage: !!message.trim(), 
        hasFiles: attachedFiles.length > 0,
        isTyping, 
        isStreaming 
      });
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
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Conversion Prompts */}
        <WizardConversionPrompt
          step={currentStep}
          triggerStep={3}
          variant="inline-banner"
          show={showInlineBanner}
          onDismiss={handleDismiss}
          onSignUp={handleSignUpClick}
        />
        <WizardConversionPrompt
          step={currentStep}
          triggerStep={5}
          variant="modal"
          show={showModal}
          onDismiss={handleDismiss}
          onSignUp={handleSignUpClick}
        />
      
      {/* Progress Bar with Mode Indicator */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              {chatMode === 'wizard' ? `Step ${currentStep + 1} of ${wizardSteps.length}` : 'Ask Me Anything'}
            </span>
            {celebrationMode && (
              <span className="text-lg animate-bounce">🎉</span>
            )}
            {chatMode === 'wizard' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs font-medium mb-1">Your 30-Day Launch Journey</p>
                  <p className="text-xs text-muted-foreground">
                    Each step brings you closer to your first customer. We'll guide you from idea validation to market launch with daily actions.
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <Badge variant={chatMode === 'freeform' ? 'default' : 'secondary'} className="text-xs">
            {chatMode === 'freeform' ? '✨ Freeform' : '🧙 Wizard'}
          </Badge>
        </div>
        {chatMode === 'wizard' && <Progress value={progress} className="h-2" />}
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
                      onClick={() => {
                        if (action.text === '📤 Share for Community Feedback') {
                          const context: any = typeof msg.businessContext === 'object' ? msg.businessContext : {};
                          setShareData({
                            conversationId: user?.id,
                            reportData: context,
                            defaultTitle: context?.industry 
                              ? `${context.industry} Business Plan Feedback`
                              : 'Business Plan Feedback Request',
                            defaultContent: msg.content.substring(0, 500),
                          });
                          setShowShareDialog(true);
                        } else {
                          sendMessage(action.text);
                        }
                      }}
                      className="text-xs sm:text-sm hover:scale-105 transition-transform duration-200 bg-background/50 hover:bg-background"
                    >
                      {action.text === '📤 Share for Community Feedback' && <Share2 className="h-3 w-3 mr-1" />}
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
        {chatMode === 'freeform' && (
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            I remember your business context and journey
          </p>
        )}
        
        {/* Attached Files Display */}
        {attachedFiles.length > 0 && (
          <div className="mb-3">
            <div className="space-y-2">
              {attachedFiles.map((file, index) => {
                const isImage = file.type.startsWith('image/');
                const isPDF = file.type === 'application/pdf';
                const previewUrl = isImage ? URL.createObjectURL(file) : null;
                
                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg border border-border text-xs"
                  >
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-background border border-border flex items-center justify-center">
                      {isImage && previewUrl ? (
                        <img 
                          src={previewUrl} 
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onLoad={() => URL.revokeObjectURL(previewUrl)}
                        />
                      ) : isPDF ? (
                        <FileText className="w-6 h-6 text-red-500" />
                      ) : (
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    
                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newFiles = attachedFiles.filter((_, i) => i !== index);
                        setAttachedFiles(newFiles);
                      }}
                      className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 sm:gap-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={chatMode === 'freeform' ? "Ask me anything about your business..." : getCurrentPlaceholder()}
            disabled={isTyping || isStreaming}
            className="flex-1 bg-background/80 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm sm:text-base"
          />
          <FileAttachment 
            onFileSelect={setAttachedFiles}
            currentFiles={attachedFiles}
            maxFiles={5}
            maxSizeMB={10}
            acceptedTypes={["image/*", "application/pdf", "text/*", ".doc", ".docx"]}
            iconOnly
          />
          <Button 
            onClick={handleSend}
            disabled={(!message.trim() && attachedFiles.length === 0) || isTyping || isStreaming}
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

        {/* Share to Community and Examples Buttons - Shows when there are messages */}
        {messages.length > 0 && (
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const lastBotMessage = messages.filter(m => m.isBot).slice(-1)[0];
                const context: any = typeof lastBotMessage?.businessContext === 'object' ? lastBotMessage.businessContext : {};
                const extractedContent = extractKeyContent(messages, context);
                
                setShareData({
                  conversationId: user?.id,
                  reportData: {
                    ...context,
                    extractedContent
                  },
                  defaultTitle: context?.industry 
                    ? `${context.industry} Business Plan`
                    : 'Business Plan',
                  defaultContent: extractedContent.summary,
                });
                setShowShareDialog(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share to Community
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Trigger the examples modal in the parent component
                window.dispatchEvent(new CustomEvent('openExamplesModal'));
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              See Examples
            </Button>
          </div>
        )}
      </div>

      {/* Share to Community Dialog */}
      {showShareDialog && shareData && (
        <ShareToCommunityDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          reportData={shareData.reportData}
          reportType="business_plan"
          conversationId={shareData.conversationId}
          defaultTitle={shareData.defaultTitle}
          defaultContent={shareData.defaultContent}
        />
      )}
      </div>
    </TooltipProvider>
  );
};
