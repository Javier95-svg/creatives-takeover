import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2, Sparkles, Wand2, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useChatbot } from "@/hooks/useChatbot";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { ShareToCommunityDialog } from "./chatbot/ShareToCommunityDialog";
import { WizardConversionPrompt } from "./chatbot/WizardConversionPrompt";
import { QuickReplyButtons, getQuickReplySuggestions } from "./chatbot/QuickReplyButtons";
import { AutoSaveIndicator } from "./chatbot/AutoSaveIndicator";
import { ContinueProgressDialog } from "./chatbot/ContinueProgressDialog";
import { TypingIndicator } from "./chatbot/TypingIndicator";
import { OnboardingTour } from "./chatbot/OnboardingTour";
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
  const [celebrationMode, setCelebrationMode] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addStepResponse } = useChatBotStore();
  
  // Conversion prompt state
  const [showInlineBanner, setShowInlineBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Quick Win 2: Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showContinueDialog, setShowContinueDialog] = useState(false);
  const [savedProgress, setSavedProgress] = useState<any>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Quick Win 3: Quick reply state
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [lastMessageLength, setLastMessageLength] = useState(0);
  
  // Quick Win 1: Step completion percentage
  const [stepInteractions, setStepInteractions] = useState<Record<number, number>>({});
  const EXPECTED_INTERACTIONS_PER_STEP = 3; // Estimate: question + clarifications
  
  // Quick Win 7: Typing indicator state
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);

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
  
  // Quick Win 1: Calculate step completion percentage
  const calculateStepCompletion = () => {
    const interactions = stepInteractions[currentStep] || 0;
    return Math.min((interactions / EXPECTED_INTERACTIONS_PER_STEP) * 100, 100);
  };
  
  const stepCompletion = calculateStepCompletion();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "nearest",
      inline: "nearest"
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, showTypingIndicator]);
  
  // Quick Win 7: Hide typing indicator when messages appear
  useEffect(() => {
    if (isTyping || isStreaming || messages.length > 0) {
      // Small delay to make transition smooth
      setTimeout(() => setShowTypingIndicator(false), 200);
    }
  }, [isTyping, isStreaming, messages]);
  
  // Quick Win 2: Check for saved progress on mount
  useEffect(() => {
    const checkSavedProgress = () => {
      try {
        const saved = localStorage.getItem('bizmap_autosave');
        if (saved) {
          const parsed = JSON.parse(saved);
          const savedDate = new Date(parsed.timestamp);
          const hoursSince = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60);
          
          // Only show continue dialog if saved within last 7 days
          if (hoursSince < 168) {
            setSavedProgress(parsed);
            setShowContinueDialog(true);
          } else {
            // Clear old data
            localStorage.removeItem('bizmap_autosave');
          }
        }
      } catch (error) {
        console.error('Error loading saved progress:', error);
        localStorage.removeItem('bizmap_autosave');
      }
    };
    
    checkSavedProgress();
  }, []);
  
  // Quick Win 2: Auto-save every 30 seconds
  useEffect(() => {
    const autoSave = () => {
      if (messages.length === 0) return;
      
      setIsSaving(true);
      try {
        const dataToSave = {
          currentStep,
          answers,
          messages: messages.map(m => ({
            content: m.content,
            isBot: m.isBot,
            timestamp: m.timestamp
          })),
          stepInteractions,
          timestamp: Date.now()
        };
        
        localStorage.setItem('bizmap_autosave', JSON.stringify(dataToSave));
        setLastSaved(new Date());
      } catch (error) {
        console.error('Auto-save error:', error);
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    };
    
    // Initial save
    if (messages.length > 0) {
      autoSave();
    }
    
    // Set up interval
    autoSaveTimerRef.current = setInterval(autoSave, 30000);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [messages, currentStep, answers, stepInteractions]);
  
  // Quick Win 3: Track message input for quick replies
  useEffect(() => {
    setLastMessageLength(message.length);
    // Hide quick replies when user starts typing substantial content
    if (message.length > 20) {
      setShowQuickReplies(false);
    } else if (message.length === 0) {
      setShowQuickReplies(true);
    }
  }, [message]);

  // Load prompt from Prompt Library
  useEffect(() => {
    const savedPrompt = localStorage.getItem('bizmap_prompt');
    if (savedPrompt) {
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

  // Conversion prompt logic
  useEffect(() => {
    if (user) {
      // User is authenticated, don't show prompts
      setShowInlineBanner(false);
      setShowModal(false);
      return;
    }

    // Step 5: Show inline banner (soft nudge)
    if (currentStep === 4 && !conversionPromptShown && chatMode === 'wizard') {
      setShowInlineBanner(true);
      trackConversionEvent('shown', 5);
    }

    // Step 7-8: Show modal if banner was dismissed
    if ((currentStep === 6 || currentStep === 7) && conversionPromptDismissed && !showModal && chatMode === 'wizard') {
      setShowModal(true);
      trackConversionEvent('shown', currentStep + 1);
    }
  }, [currentStep, user, conversionPromptShown, conversionPromptDismissed, chatMode, wizardSteps.length, trackConversionEvent]);

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
    if (message.trim() && !isTyping && !isStreaming) {
      console.log('💬 Sending message:', message);
      
      // Quick Win 7: Show typing indicator immediately
      setShowTypingIndicator(true);
      
      // Quick Win 1: Track interaction for step completion
      setStepInteractions(prev => ({
        ...prev,
        [currentStep]: (prev[currentStep] || 0) + 1
      }));
      
      sendMessage(message);
      setMessage("");
      setShowQuickReplies(true); // Reset for next message
    } else {
      console.log('⚠️ Cannot send message:', { hasMessage: !!message.trim(), isTyping, isStreaming });
    }
  };
  
  // Quick Win 3: Handle quick reply selection
  const handleQuickReply = (suggestion: string) => {
    setMessage(suggestion);
    setShowQuickReplies(false);
    // Auto-send the suggestion
    setTimeout(() => {
      if (suggestion.trim() && !isTyping && !isStreaming) {
        // Quick Win 7: Show typing indicator
        setShowTypingIndicator(true);
        
        setStepInteractions(prev => ({
          ...prev,
          [currentStep]: (prev[currentStep] || 0) + 1
        }));
        sendMessage(suggestion);
        setMessage("");
        setShowQuickReplies(true);
      }
    }, 100);
  };
  
  // Quick Win 2: Handle continue/start fresh
  const handleContinueProgress = () => {
    if (savedProgress) {
      // Restore messages, answers, etc. would need to be handled by parent
      setStepInteractions(savedProgress.stepInteractions || {});
      setShowContinueDialog(false);
    }
  };
  
  const handleStartFresh = () => {
    localStorage.removeItem('bizmap_autosave');
    setSavedProgress(null);
    setShowContinueDialog(false);
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
    <div className="flex flex-col h-full" id="bizmap-chat">
      {/* Quick Win 8: Onboarding Tour */}
      <OnboardingTour />
      
      {/* Quick Win 2: Continue Progress Dialog */}
      <ContinueProgressDialog
        open={showContinueDialog}
        onContinue={handleContinueProgress}
        onStartFresh={handleStartFresh}
        savedDate={savedProgress ? new Date(savedProgress.timestamp) : null}
        currentStep={savedProgress?.currentStep || 0}
        totalSteps={wizardSteps.length}
      />
      
      {/* Conversion Prompts */}
      <WizardConversionPrompt
        step={currentStep}
        triggerStep={4}
        variant="inline-banner"
        show={showInlineBanner}
        onDismiss={handleDismiss}
        onSignUp={handleSignUpClick}
      />
      <WizardConversionPrompt
        step={currentStep}
        triggerStep={6}
        variant="modal"
        show={showModal}
        onDismiss={handleDismiss}
        onSignUp={handleSignUpClick}
      />
      
      {/* Progress Bar with Mode Indicator */}
      <div className="p-4 border-b bg-muted/30 progress-tracker">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {chatMode === 'wizard' ? `Step ${currentStep + 1} of ${wizardSteps.length}` : 'Ask Me Anything'}
              </span>
              {/* Quick Win 1: Step completion percentage */}
              {chatMode === 'wizard' && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(stepCompletion)}% complete in this step
                </span>
              )}
            </div>
            {celebrationMode && (
              <span className="text-lg animate-bounce">🎉</span>
            )}
          </div>
          <Badge variant={chatMode === 'freeform' ? 'default' : 'secondary'} className="text-xs">
            {chatMode === 'freeform' ? '✨ Freeform' : '🧙 Wizard'}
          </Badge>
        </div>
        {chatMode === 'wizard' && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            {/* Quick Win 1: Current step progress */}
            <Progress value={stepCompletion} className="h-1 opacity-60" />
          </div>
        )}
        {/* Quick Win 2: Auto-save indicator */}
        <div className="mt-2 auto-save-indicator">
          <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
        </div>
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
              
              {/* Quick Win 3: Quick reply buttons for bot messages */}
              {msg.isBot && index === messages.length - 1 && showQuickReplies && chatMode === 'wizard' && (
                <div className="quick-reply-section">
                  <QuickReplyButtons
                    suggestions={getQuickReplySuggestions(
                      wizardSteps[currentStep]?.key || 'default',
                      currentStep,
                      message
                    )}
                    onSelect={handleQuickReply}
                    currentStep={currentStep}
                    questionKey={wizardSteps[currentStep]?.key}
                  />
                </div>
              )}
              
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

        {/* Quick Win 7: Enhanced typing indicator */}
        {showTypingIndicator && !isStreaming && !streamingMessage && (
          <TypingIndicator />
        )}

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

        {/* Legacy typing indicator (fallback) */}
        {isTyping && !isStreaming && !showTypingIndicator && (
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
        
        {/* Quick Win 5 notification: Move sign-in to step 5 */}
        {!user && currentStep === 4 && chatMode === 'wizard' && (
          <div className="mb-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-xs text-foreground flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>
                <strong>Sign in after this step</strong> to save your progress across all devices and unlock premium features
              </span>
            </p>
          </div>
        )}
        
        {/* Share to Community Button - Shows when there are messages */}
        {messages.length > 0 && (
          <div className="mb-3">
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
                    ? `${context.industry} Business Plan - Seeking Feedback`
                    : 'Business Plan - Seeking Community Feedback',
                  defaultContent: extractedContent.summary,
                });
                setShowShareDialog(true);
              }}
              className="w-full sm:w-auto flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share to Community for Feedback
            </Button>
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
  );
};
