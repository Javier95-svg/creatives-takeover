import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2, Sparkles, Wand2, Share2, Paperclip, BookOpen, X, FileText, Image as ImageIcon } from "lucide-react";
import { FileAttachment } from './chatbot/FileAttachment';
import { DocumentUpload } from './DocumentUpload';
import { Badge } from "@/components/ui/badge";
import { useChatbot, ChatMessage } from "@/hooks/useChatbot";
import { useAuth } from "@/contexts/AuthContext";
import { ShareToCommunityDialog } from "./chatbot/ShareToCommunityDialog";
import { useNavigate } from "react-router-dom";
import { useChatBotStore } from "@/store/chatBotStore";
import { useCofounderPersonality } from "@/hooks/useCofounderPersonality";
import { PersonalityIndicator } from "./ai-cofounder/PersonalityIndicator";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { SourceCitation } from "./chatbot/SourceCitation";
import { SearchResults } from "./chatbot/SearchResults";
import { ContextAwareBanner } from './chatbot/ContextAwareBanner';
import { QuickActions } from './chatbot/QuickActions';
import { useAutoProfile } from '@/hooks/useAutoProfile';

interface BizMapChatProps {
  wizardSteps: Array<{
    key: string;
    title?: string;
    question: string;
    transition?: string;
    placeholder?: string;
  }>;
  onStepComplete: (step: number, answer: string) => void;
  onWizardComplete: (answers: Record<string, string>) => void;
  currentStep: number;
  answers: Record<string, string>;
  onChatModeReady?: (switchToFreeform: () => void) => void;
  onModeInfoReady?: (info: { activeMode: 'planning' | 'gtm', onModeChange: (mode: 'planning' | 'gtm') => void }) => void;
  sessionManagement?: {
    currentSessionId: string | null;
    createNewSession: (title?: string) => Promise<string | null>;
    setCurrentSessionId: (sessionId: string | null) => void;
    updateSession: (sessionId: string, updates: any) => Promise<void>;
  };
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
const extractKeyContent = (messages: ChatMessage[], businessContext: Record<string, unknown>) => {
  // Safety check: ensure messages is an array
  if (!Array.isArray(messages)) {
    return { summary: '', keyPoints: [] };
  }
  
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
  onChatModeReady,
  onModeInfoReady,
  sessionManagement
}: BizMapChatProps) => {
  // Auto-create profile for new users
  useAutoProfile();

  const [message, setMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [celebrationMode, setCelebrationMode] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareData, setShareData] = useState<any>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<'searching' | 'found' | 'none'>('none');
  const [searchSourceCount, setSearchSourceCount] = useState(0);
  const [currentSources, setCurrentSources] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addStepResponse } = useChatBotStore();
  const { preferences } = useCofounderPersonality();
  
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
    switchToPlanningMode,
    conversionPromptShown,
    conversionPromptDismissed,
    trackConversionEvent,
    sessionId
  } = useChatbot({
    enableNLU: true,
    enableDynamicFAQ: false,
    enableAnalytics: true,
    enablePersonalization: true,
    enableAIGeneratedAnswers: false,
    sessionManagement,
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

  // Conversion prompt logic
  useEffect(() => {
    if (user) {
      // User is authenticated, don't show prompts
      setShowInlineBanner(false);
      setShowModal(false);
      return;
    }
  }, [currentStep, user, chatMode, trackConversionEvent]);

  // Fetch user avatar from profile
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) {
        setUserAvatarUrl(null);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user avatar:', error);
          return;
        }
        
        if (data?.avatar_url) {
          setUserAvatarUrl(data.avatar_url);
        } else {
          setUserAvatarUrl(null);
        }
      } catch (error) {
        console.error('Error fetching user avatar:', error);
        setUserAvatarUrl(null);
      }
    };

    fetchAvatar();
  }, [user]);

  // 🚀 OPTIMIZATION: Request deduplication - prevent duplicate sends
  const lastSentMessage = useRef<string>('');
  const lastSendTime = useRef<number>(0);
  const SEND_DEBOUNCE_MS = 1000; // 1 second debounce

  const handleSend = () => {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BizMapChat.tsx:315',message:'handleSend entry',data:{messageLength:message.length,hasFiles:attachedFiles.length,isTyping,isStreaming},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const now = Date.now();
    const messageContent = message.trim();
    
    // 🚀 OPTIMIZATION: Debounce rapid sends and prevent duplicates
    if (now - lastSendTime.current < SEND_DEBOUNCE_MS && lastSentMessage.current === messageContent) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BizMapChat.tsx:322',message:'handleSend blocked duplicate',data:{messageContent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('⚡ Ignoring duplicate send request');
      return;
    }
    
    if ((messageContent || attachedFiles.length > 0) && !isTyping && !isStreaming) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BizMapChat.tsx:326',message:'handleSend calling sendMessage',data:{messageContent,hasFiles:attachedFiles.length,sessionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('💬 Sending message:', { message, filesCount: attachedFiles.length });
      lastSentMessage.current = messageContent;
      lastSendTime.current = now;
      
      // Detect if this might trigger a search
      const mightSearch = /(what|who|when|where|how|search|find|latest|current|recent|tell me about)/i.test(messageContent);
      if (mightSearch) {
        setSearchStatus('searching');
        setSearchSourceCount(0);
      }
      
      sendMessage(message, attachedFiles);
      setMessage("");
      setAttachedFiles([]);
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/4f1e4fbc-0466-4947-9c15-fdedb23fe748',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BizMapChat.tsx:341',message:'handleSend blocked by state',data:{hasMessage:!!messageContent,hasFiles:attachedFiles.length>0,isTyping,isStreaming},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('⚠️ Cannot send message:', { 
        hasMessage: !!messageContent, 
        hasFiles: attachedFiles.length > 0,
        isTyping, 
        isStreaming 
      });
    }
  };
  
  // Monitor messages for sources to update search status
  useEffect(() => {
    if (!Array.isArray(messages)) return;
    const lastBotMessage = messages.filter(m => m.isBot).slice(-1)[0];
    if (lastBotMessage?.sourceMetadata && lastBotMessage.sourceMetadata.length > 0) {
      setSearchStatus('found');
      setSearchSourceCount(lastBotMessage.sourceMetadata.length);
      // Reset after 3 seconds
      setTimeout(() => {
        if (!isStreaming) {
          setSearchStatus('none');
        }
      }, 3000);
    } else if (!isStreaming && searchStatus === 'searching') {
      setSearchStatus('none');
    }
  }, [messages, isStreaming]);

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
    return "Ask about your business plan...";
  };

  return (
    <div className="bizmap-chat-shell relative flex h-full flex-col overflow-hidden">
      <div className="bizmap-chat-ambient" aria-hidden="true">
        <div className="bizmap-chat-pattern" />
        <div className="bizmap-chat-glow-layer" />
        <div className="bizmap-chat-shimmer" />
      </div>
      <div className="relative z-10 flex h-full flex-col">
      {/* Context-aware welcome banner */}
      {user && <ContextAwareBanner />}

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 relative"
        role="log"
        aria-label="Conversation messages"
        aria-live="polite"
        aria-atomic="false"
      >
        {/* Search Status Indicator */}
        {isStreaming && searchStatus !== 'none' && (
          <SearchResults status={searchStatus} sourceCount={searchSourceCount} />
        )}
        
        {Array.isArray(messages) && messages.map((msg, index) => (
          <div key={msg.id} className="space-y-2">
            <div
              className={`flex gap-4 sm:gap-5 ${msg.isBot ? 'justify-start' : 'justify-end'} animate-fade-in`}
              style={{ animationDelay: `${index * 50}ms` }}
              role="article"
              aria-label={msg.isBot ? "AI assistant message" : "Your message"}
            >
              {msg.isBot && (
                <div 
                  className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-primary/20 backdrop-blur-sm"
                  aria-hidden="true"
                >
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 transition-all duration-300 ${
                  msg.isBot
                    ? 'message-bot glass-chat border border-primary/10 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10'
                    : 'message-user bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30'
                }`}
              >
                <p className="text-sm sm:text-base md:text-[15px] leading-relaxed whitespace-pre-wrap" role="text">{msg.content}</p>
              </div>
              {!msg.isBot && (
                <Avatar 
                  className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 shadow-lg shadow-primary/25 ring-1 ring-primary/20"
                  aria-hidden="true"
                >
                  <AvatarImage src={userAvatarUrl || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center">
                    {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            {/* Display sources for bot messages */}
            {msg.isBot && msg.sourceMetadata && msg.sourceMetadata.length > 0 && (
              <div className="ml-14 sm:ml-16">
                <SourceCitation sources={msg.sourceMetadata} />
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingMessage && (
          <div className="flex gap-4 sm:gap-5 justify-start animate-fade-in">
            <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-primary/20 backdrop-blur-sm animate-pulse">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div className="max-w-[80%] sm:max-w-[75%] rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 message-bot glass-chat border border-primary/10 shadow-lg shadow-black/5">
              <p className="text-sm sm:text-base md:text-[15px] leading-relaxed whitespace-pre-wrap">
                {streamingMessage}
                <span className="inline-block w-0.5 h-5 ml-1 bg-primary animate-pulse" />
              </p>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !isStreaming && (
          <div className="flex gap-4 sm:gap-5 justify-start animate-fade-in">
            <div className="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-primary/20 backdrop-blur-sm">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground animate-pulse" />
            </div>
            <div className="max-w-[80%] sm:max-w-[75%] rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 message-bot glass-chat border border-primary/10 shadow-lg shadow-black/5">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-primary/70 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border/30 p-4 sm:p-5 md:p-6 bg-gradient-to-br from-background/95 via-background/90 to-muted/10 backdrop-blur-xl">
        {chatMode === 'freeform' && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              I remember your business context and journey
            </p>
            <HelpTooltip
              content="In freeform mode, you can ask any question about your business. The AI remembers your previous conversation and can help with strategy, planning, and problem-solving."
              side="top"
            />
          </div>
        )}

        {/* Quick action suggestions */}
        {user && !isTyping && !isStreaming && (
          <QuickActions
            onActionClick={(prompt) => {
              setMessage(prompt);
            }}
          />
        )}
        
        {/* Document Upload Section - Only in freeform mode */}
        {chatMode === 'freeform' && (
          <div className="mb-4">
            <DocumentUpload
              conversationId={sessionId}
              onDocumentUploaded={(doc) => {
                console.log('Document uploaded and analyzed:', doc);
                toast.success(`Document "${doc.file_name}" is now available for AI analysis`);
              }}
              maxFiles={5}
            />
          </div>
        )}
        
        {/* Attached Files Display */}
        {attachedFiles.length > 0 && (
          <div className="mb-4">
            <div className="space-y-2">
              {attachedFiles.map((file, index) => {
                const isImage = file.type.startsWith('image/');
                const isPDF = file.type === 'application/pdf';
                const previewUrl = isImage ? URL.createObjectURL(file) : null;
                
                return (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 p-3 bg-muted/40 backdrop-blur-sm rounded-xl border border-border/50 text-xs"
                  >
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-background border border-border/50 flex items-center justify-center">
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
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              chatMode === 'freeform' 
                ? "Ask me anything about your business..." 
                : getCurrentPlaceholder()
            }
            disabled={
              isTyping || 
              isStreaming
            }
            className="flex-1 glass-chat-input border-border/40 focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-sm sm:text-base min-h-[52px] rounded-2xl backdrop-blur-xl bg-background/60 hover:bg-background/80"
            aria-label={
              chatMode === 'freeform'
                ? "Ask your AI co-founder a question about your business"
                : `Answer the question: ${wizardSteps[currentStep]?.question || 'Continue your business planning'}`
            }
            aria-describedby="input-help-text"
            aria-required={currentStep < wizardSteps.length}
          />
          <span id="input-help-text" className="sr-only">
            {chatMode === 'freeform' 
              ? "Type your question and press Enter to send, or Shift+Enter for a new line"
              : `Step ${currentStep + 1} of ${wizardSteps.length}. Press Enter to submit your answer`}
          </span>
          <FileAttachment 
            onFileSelect={setAttachedFiles}
            currentFiles={attachedFiles}
            maxFiles={5}
            maxSizeMB={10}
            acceptedTypes={["image/*", "application/pdf", "text/*", ".doc", ".docx"]}
            iconOnly
            aria-label="Attach file to message"
          />
          <Button 
            onClick={handleSend}
            disabled={
              (!message.trim() && attachedFiles.length === 0) || 
              isTyping || 
              isStreaming
            }
            size="icon"
            className="h-[52px] w-[52px] rounded-2xl glass-chat-button shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed touch-manipulation"
            aria-label="Send message"
            aria-describedby={isTyping || isStreaming ? "sending-status" : undefined}
          >
            {isTyping || isStreaming ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                <span id="sending-status" className="sr-only">Sending message, please wait</span>
              </>
            ) : (
              <Send className="w-5 h-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Share Dialog */}
        {showShareDialog && shareData && (
          <ShareToCommunityDialog
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
            reportData={shareData.reportData}
            reportType={shareData.reportType}
            conversationId={shareData.conversationId}
            defaultTitle={shareData.defaultTitle}
            defaultContent={shareData.defaultContent}
          />
        )}
      </div>
    </div>
  );
};
