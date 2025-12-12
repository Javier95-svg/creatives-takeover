import { useState, useEffect, useRef } from "react";
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
  sessionManagement
}: BizMapChatProps) => {
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
    const now = Date.now();
    const messageContent = message.trim();
    
    // 🚀 OPTIMIZATION: Debounce rapid sends and prevent duplicates
    if (now - lastSendTime.current < SEND_DEBOUNCE_MS && lastSentMessage.current === messageContent) {
      console.log('⚡ Ignoring duplicate send request');
      return;
    }
    
    if ((messageContent || attachedFiles.length > 0) && !isTyping && !isStreaming) {
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
    return "Type your message...";
  };

  // Format message content with bold typography effects
  const formatMessageContent = (content: string): string => {
    if (!content) return '';
    
    // Convert markdown-style bold to HTML with gradient styling
    let formatted = content
      .replace(/\*\*(.+?)\*\*/g, '<strong class="gradient-text-bold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="italic text-primary/90">$1</em>')
      .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-mono text-xs border border-primary/20">$1</code>');
    
    // Highlight emojis with subtle animation
    formatted = formatted.replace(/([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])/gu, '<span class="inline-block animate-bounce-slow">$1</span>');
    
    // Convert URLs to styled links
    formatted = formatted.replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary underline decoration-primary/30 hover:decoration-primary decoration-2 underline-offset-2 transition-all hover:text-accent-bold">$1</a>'
    );
    
    return formatted;
  };

  return (
    <div className="bizmap-chat-shell relative flex h-full flex-col overflow-hidden rounded-xl lg:rounded-2xl border-2 border-border/30 shadow-2xl">
      <div className="bizmap-chat-ambient" aria-hidden="true">
        <div className="bizmap-chat-pattern" />
        <div className="bizmap-chat-glow-layer" />
        <div className="bizmap-chat-shimmer" />
      </div>
      <div className="relative z-10 flex h-full flex-col">
        {/* Creative header accent */}
        <div className="h-1 bg-gradient-bold w-full animate-gradient-flow opacity-80" style={{ backgroundSize: '300% 100%' }} />
        {/* Personality Indicator */}
        {user && preferences && preferences.onboardingCompleted && (
          <div className="absolute top-4 right-4 z-20">
            <PersonalityIndicator personality={preferences.aiPersonality} />
          </div>
        )}
        
      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 relative"
        role="log"
        aria-label="Conversation messages"
        aria-live="polite"
        aria-atomic="false"
      >
        {/* Search Status Indicator */}
        {isStreaming && searchStatus !== 'none' && (
          <div className="animate-message-slide-in" style={{ animationDelay: '0ms' }}>
            <SearchResults status={searchStatus} sourceCount={searchSourceCount} />
          </div>
        )}
        
        {messages.map((msg, index) => (
          <div 
            key={msg.id} 
            className="space-y-2"
            style={{
              '--offset-index': index % 3,
              '--transform-index': index % 2
            } as React.CSSProperties}
          >
            <div
              className={`flex gap-3 sm:gap-4 ${msg.isBot ? 'justify-start' : 'justify-end'} animate-message-slide-in message-creative-transform ${msg.isBot ? 'message-transform-left' : 'message-transform-right'}`}
              style={{ 
                animationDelay: `${index * 80}ms`,
                '--offset-index': index % 3,
                '--transform-index': index % 2
              } as React.CSSProperties}
              role="article"
              aria-label={msg.isBot ? "AI assistant message" : "Your message"}
            >
              {msg.isBot && (
                <div 
                  className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-bold-2 rounded-full flex items-center justify-center shadow-lg glow-bold-blue ring-2 ring-primary/30 relative overflow-hidden group"
                  aria-hidden="true"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white relative z-10 drop-shadow-lg" />
                </div>
              )}
              <div
                className={`relative max-w-[85%] sm:max-w-[80%] md:max-w-[75%] p-3 sm:p-4 md:p-5 transition-all duration-300 group ${
                  msg.isBot
                    ? 'rounded-2xl rounded-tl-sm bg-gradient-to-br from-muted via-muted/90 to-muted/70 border-2 border-gradient-bold shadow-lg hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 hover:scale-[1.02]'
                    : 'rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 hover:scale-[1.02] glow-bold-blue'
                }`}
                style={{
                  clipPath: msg.isBot 
                    ? 'polygon(8px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 8px)'
                    : 'polygon(0% 0%, calc(100% - 8px) 0%, 100% 8px, 100% 100%, 0% 100%)'
                }}
              >
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer-bold transition-opacity duration-500 rounded-2xl pointer-events-none" />
                
                {/* Content */}
                <div className="relative z-10">
                  <p 
                    className="text-xs sm:text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium message-content" 
                    role="text"
                    dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }}
                  />
                </div>
                
                {/* Subtle 3D depth effect */}
                <div className={`absolute inset-0 rounded-2xl pointer-events-none ${
                  msg.isBot 
                    ? 'bg-gradient-to-br from-white/5 to-transparent'
                    : 'bg-gradient-to-br from-white/20 to-transparent'
                }`} style={{ clipPath: 'inherit' }} />
              </div>
              {!msg.isBot && (
                <Avatar 
                  className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 shadow-xl shadow-primary/40 ring-2 ring-primary/30 ring-offset-2 ring-offset-background glow-bold-blue group hover:scale-110 transition-transform duration-300"
                  aria-hidden="true"
                >
                  <AvatarImage src={userAvatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-bold-2 text-white flex items-center justify-center font-bold text-sm sm:text-base">
                    {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            {/* Display sources for bot messages */}
            {msg.isBot && msg.sourceMetadata && msg.sourceMetadata.length > 0 && (
              <div className="ml-12 sm:ml-14">
                <SourceCitation sources={msg.sourceMetadata} />
              </div>
            )}
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingMessage && (
          <div className="flex gap-3 sm:gap-4 justify-start animate-message-bounce-in">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-bold-2 rounded-full flex items-center justify-center shadow-lg glow-bold-blue ring-2 ring-primary/30 animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent animate-pulse rounded-full" />
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white relative z-10 drop-shadow-lg" />
            </div>
            <div className="relative max-w-[80%] sm:max-w-[75%] rounded-2xl rounded-tl-sm p-4 sm:p-5 bg-gradient-to-br from-muted via-muted/90 to-muted/70 border-2 border-gradient-bold shadow-lg hover:shadow-xl hover:shadow-primary/20">
              {/* Animated border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-flow opacity-30 animate-gradient-flow" style={{ 
                clipPath: 'polygon(8px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 8px)',
                backgroundSize: '300% 100%'
              }} />
              
              <p 
                className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-medium relative z-10 message-content"
                dangerouslySetInnerHTML={{ __html: formatMessageContent(streamingMessage) + '<span class="inline-block w-0.5 h-5 ml-1 bg-primary animate-pulse glow-bold-blue"></span>' }}
              />
              
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer-bold rounded-2xl pointer-events-none" />
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !isStreaming && (
          <div className="flex gap-3 sm:gap-4 justify-start animate-message-bounce-in">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-bold-2 rounded-full flex items-center justify-center shadow-lg glow-bold-blue ring-2 ring-primary/30 animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent animate-pulse rounded-full" />
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white relative z-10 drop-shadow-lg" />
            </div>
            <div className="relative max-w-[80%] sm:max-w-[75%] rounded-2xl rounded-tl-sm p-4 sm:p-5 bg-gradient-to-br from-muted via-muted/90 to-muted/70 border-2 border-gradient-bold shadow-lg">
              {/* Animated border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-flow opacity-20 animate-gradient-flow" style={{ 
                clipPath: 'polygon(8px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 8px)',
                backgroundSize: '300% 100%'
              }} />
              
              <div className="flex gap-2 relative z-10">
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce glow-bold-blue" style={{ animationDelay: "0ms" }} />
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce glow-bold-blue" style={{ animationDelay: "150ms" }} />
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce glow-bold-blue" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t-2 border-gradient-bold p-3 sm:p-4 md:p-5 bg-gradient-to-br from-background/95 via-background/90 to-muted/30 backdrop-blur-sm relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-flow opacity-5 animate-gradient-flow pointer-events-none" style={{ backgroundSize: '300% 100%' }} />
        {chatMode === 'freeform' && (
          <div className="flex items-center justify-between mb-3">
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
        {chatMode !== 'freeform' && currentStep < wizardSteps.length && (
          <div className="flex items-center justify-end mb-3">
            <HelpTooltip
              content={`Step ${currentStep + 1} of ${wizardSteps.length}: ${wizardSteps[currentStep]?.title || 'Business Planning'}. Answer the question to continue building your business plan.`}
              side="top"
            />
          </div>
        )}
        
        {/* Document Upload Section - Only in freeform mode */}
        {chatMode === 'freeform' && (
          <div className="mb-3">
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

        <div className="flex gap-2 sm:gap-3 relative z-10">
          <div className="flex-1 relative group">
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
              className="w-full bg-background/90 border-2 border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 text-sm sm:text-base min-h-[52px] sm:min-h-[52px] rounded-2xl px-4 py-3 font-medium placeholder:text-muted-foreground/60 hover:border-primary/60 hover:bg-background/95 focus:shadow-lg focus:shadow-primary/20 group-hover:border-primary/40 touch-manipulation text-base sm:text-base"
              aria-label={
                chatMode === 'freeform'
                  ? "Ask your AI co-founder a question about your business"
                  : `Answer the question: ${wizardSteps[currentStep]?.question || 'Continue your business planning'}`
              }
              aria-describedby="input-help-text"
              aria-required={currentStep < wizardSteps.length}
            />
            {/* Gradient border effect on focus */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-flow opacity-0 group-focus-within:opacity-30 transition-opacity duration-300 pointer-events-none animate-gradient-flow" style={{ backgroundSize: '300% 100%', zIndex: -1 }} />
          </div>
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
            className="h-[52px] w-[52px] sm:h-[52px] sm:w-[52px] rounded-2xl bg-gradient-bold-2 shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:scale-110 hover:rotate-3 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:rotate-0 disabled:hover:shadow-xl min-h-[52px] min-w-[52px] touch-manipulation relative overflow-hidden group"
            aria-label="Send message"
            aria-describedby={isTyping || isStreaming ? "sending-status" : undefined}
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-flow opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-gradient-flow" style={{ backgroundSize: '300% 100%' }} />
            
            {/* Ripple effect on click */}
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-active:opacity-100 group-active:animate-ripple" />
            
            {isTyping || isStreaming ? (
              <>
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-white relative z-10 drop-shadow-lg" aria-hidden="true" />
                <span id="sending-status" className="sr-only">Sending message, please wait</span>
              </>
            ) : (
              <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white relative z-10 drop-shadow-lg group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" aria-hidden="true" />
            )}
          </Button>
        </div>

        {/* Share to Community and Examples Buttons - Shows when there are messages */}
        {messages.length > 0 && (
          <div className="mt-3 flex flex-col sm:flex-row gap-2 relative z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const lastBotMessage = messages.filter(m => m.isBot).slice(-1)[0];
                const context: any = typeof lastBotMessage?.businessContext === 'object' ? lastBotMessage.businessContext : {};
                const extractedContent = extractKeyContent(messages, context);
                
                setShareData({
                  conversationId: user?.id,
                  reportType: context?.industry || context?.targetMarket ? 'business_plan' : 'conversation',
                  reportData: {
                    ...context,
                    extractedContent
                  },
                  defaultTitle: context?.industry 
                    ? `${context.industry} Business Plan`
                    : 'My Business Journey',
                  defaultContent: extractedContent.summary,
                });
                setShowShareDialog(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl border-2 border-primary/30 hover:border-primary hover:bg-primary/10 hover:text-primary font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-flow opacity-0 group-hover:opacity-20 transition-opacity duration-300 animate-gradient-flow" style={{ backgroundSize: '300% 100%' }} />
              <Share2 className="h-4 w-4 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
              <span className="relative z-10">Share to Community</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Trigger the examples modal in the parent component
                window.dispatchEvent(new CustomEvent('openExamplesModal'));
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl border-2 border-accent-bold/30 hover:border-accent-bold hover:bg-accent-bold/10 hover:text-accent-bold font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-accent-bold/20 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-flow opacity-0 group-hover:opacity-20 transition-opacity duration-300 animate-gradient-flow" style={{ backgroundSize: '300% 100%' }} />
              <BookOpen className="h-4 w-4 relative z-10 group-hover:scale-110 transition-transform duration-300" />
              <span className="relative z-10">See Examples</span>
            </Button>
          </div>
        )}
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
