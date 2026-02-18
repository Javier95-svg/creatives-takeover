import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { streamChat } from '@/hooks/useStreamingChat';

export interface PulseMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PulseContext {
  userName: string | null;
  businessStage: string | null;
  biggestChallenge: string | null;
  launchTimeline: string | null;
  currentStreak: number;
  completedSessions: number;
  topRecommendation: string | null;
  currentPage: string;
}

const PAGE_HINTS: Record<string, string> = {
  '/icp-builder': 'The ICP Builder helps you define your ideal customer. Want a quick walkthrough?',
  '/pmf-lab': 'Product-Market Fit can feel abstract. I can help you understand your score.',
  '/bizmap-ai': 'Working on your business map? Ask me anything about the steps.',
  '/pitch-deck-analyzer': 'Upload your pitch deck and I\'ll analyze it across 6 key dimensions.',
  '/focus-funnel': 'The Focus Funnel helps you prioritize what matters most right now.',
  '/community': 'The community is full of founders at your stage. Want me to help you find relevant discussions?',
};

function generateProactiveMessage(context: PulseContext | null, isAuthenticated: boolean): string {
  if (!isAuthenticated || !context) {
    return 'Welcome to Creatives Takeover! How can I help you?';
  }

  const name = context.userName?.split(' ')[0] || 'there';

  // Priority 1: Page-specific hint
  for (const [path, hint] of Object.entries(PAGE_HINTS)) {
    if (context.currentPage.startsWith(path)) {
      return `Hey ${name}! ${hint}`;
    }
  }

  // Priority 2: Streak/momentum
  if (context.currentStreak >= 7) {
    return `Your ${context.currentStreak}-day streak is impressive, ${name}! Keep the momentum going — what are you working on today?`;
  }
  if (context.currentStreak >= 3) {
    return `You've checked in ${context.currentStreak} days in a row, ${name}! What's next on your list?`;
  }

  // Priority 3: Stage-aware insight
  if (context.businessStage === 'idea') {
    return `Hey ${name}! You're in idea stage — have you validated with real customers yet? I can guide you.`;
  }
  if (context.businessStage === 'validation' || context.biggestChallenge === 'cant_validate') {
    return `Validation is the hardest part, ${name}. Want to map out a quick 5-interview plan?`;
  }
  if (context.businessStage === 'mvp') {
    return `Building your MVP, ${name}? Let's make sure you're not over-building.`;
  }
  if (context.businessStage === 'launched' || context.businessStage === 'scaling') {
    return `You've launched, ${name} — want to talk growth levers or fundraising readiness?`;
  }

  // Priority 4: Top recommendation
  if (context.topRecommendation) {
    return `Hey ${name}! Your next suggested step is: ${context.topRecommendation}. Want help with it?`;
  }

  // Priority 5: Fallback
  return `Hey ${name}! I'm Pulse, your AI companion. Ask me anything about your startup journey.`;
}

function hashMessage(msg: string): string {
  let hash = 0;
  for (let i = 0; i < msg.length; i++) {
    const char = msg.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

export const usePulseWidget = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();

  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'feedback'>('chat');

  // Proactive message state
  const [proactiveMessage, setProactiveMessage] = useState<string | null>(null);
  const [proactiveVisible, setProactiveVisible] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<PulseMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const sessionIdRef = useRef(crypto.randomUUID());

  // Context
  const [context, setContext] = useState<PulseContext | null>(null);
  const [contextLoaded, setContextLoaded] = useState(false);

  // Fetch user context for personalized messages
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      setContext(null);
      setContextLoaded(true);
      return;
    }

    const fetchContext = async () => {
      try {
        // Fetch profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, business_stage, quiz_biggest_challenge, quiz_launch_timeline')
          .eq('id', user.id)
          .single();

        // Fetch streak/sessions from daily_check_ins
        const { count: checkInCount } = await supabase
          .from('daily_check_ins')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Fetch top recommendation
        const { data: recs } = await supabase
          .from('personalized_recommendations')
          .select('title')
          .eq('user_id', user.id)
          .eq('is_dismissed', false)
          .eq('is_completed', false)
          .order('priority', { ascending: false })
          .limit(1);

        setContext({
          userName: profile?.full_name || user.user_metadata?.full_name || null,
          businessStage: profile?.business_stage || null,
          biggestChallenge: profile?.quiz_biggest_challenge || null,
          launchTimeline: profile?.quiz_launch_timeline || null,
          currentStreak: 0,
          completedSessions: checkInCount || 0,
          topRecommendation: recs?.[0]?.title || null,
          currentPage: location.pathname,
        });
      } catch (err) {
        console.error('Pulse: Error fetching context', err);
        setContext({
          userName: user.user_metadata?.full_name || null,
          businessStage: null,
          biggestChallenge: null,
          launchTimeline: null,
          currentStreak: 0,
          completedSessions: 0,
          topRecommendation: null,
          currentPage: location.pathname,
        });
      } finally {
        setContextLoaded(true);
      }
    };

    fetchContext();
  }, [user, isAuthenticated, authLoading, location.pathname]);

  // Generate and show proactive message after context is loaded
  useEffect(() => {
    if (!contextLoaded || authLoading) return;

    // Check if already dismissed this session
    if (sessionStorage.getItem('pulse_proactive_dismissed') === 'true') return;

    const updatedContext = context ? { ...context, currentPage: location.pathname } : null;
    const message = generateProactiveMessage(updatedContext, isAuthenticated);

    // Check if this exact message was shown before
    const messageHash = hashMessage(message);
    if (localStorage.getItem('pulse_last_proactive_hash') === messageHash) return;

    setProactiveMessage(message);

    // Show after 3 second delay
    const timer = setTimeout(() => {
      setProactiveVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [contextLoaded, authLoading, isAuthenticated, context, location.pathname]);

  // Dismiss proactive message
  const dismissProactive = useCallback(() => {
    setProactiveVisible(false);
    sessionStorage.setItem('pulse_proactive_dismissed', 'true');
    if (proactiveMessage) {
      localStorage.setItem('pulse_last_proactive_hash', hashMessage(proactiveMessage));
    }
  }, [proactiveMessage]);

  // Open panel (also dismisses proactive)
  const openPanel = useCallback(() => {
    setIsOpen(true);
    setActiveTab('chat');

    // Add proactive message as first assistant message if not already there
    if (proactiveMessage && messages.length === 0) {
      setMessages([{
        id: 'proactive-' + Date.now(),
        role: 'assistant',
        content: proactiveMessage,
        timestamp: new Date(),
      }]);
    }

    dismissProactive();
  }, [proactiveMessage, messages.length, dismissProactive]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Send a chat message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMessage: PulseMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    const assistantId = 'assistant-' + Date.now();

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Build lightweight business context
      const businessContext: Record<string, any> = {
        currentPage: location.pathname,
      };

      if (context) {
        if (context.businessStage) businessContext.stage = context.businessStage;
        if (context.biggestChallenge) businessContext.challenge = context.biggestChallenge;
        if (context.launchTimeline) businessContext.timeline = context.launchTimeline;
        if (context.currentStreak > 0) businessContext.streak = context.currentStreak;
        if (context.completedSessions > 0) businessContext.sessions = context.completedSessions;
      }

      await streamChat(
        text.trim(),
        sessionIdRef.current,
        conversationHistory,
        businessContext,
        user?.id || null,
        null, // wizardMode
        null, // currentStep
        'pulse' as any,
        undefined, // files
        (chunk) => {
          // Update assistant message with streaming content
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        },
        () => {
          setIsStreaming(false);
        },
        undefined, // onSources
        (error) => {
          console.error('Pulse chat error:', error);
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: 'Sorry, I encountered an error. Please try again.' }
                : m
            )
          );
          setIsStreaming(false);
        }
      );
    } catch (err) {
      console.error('Pulse send error:', err);
      setIsStreaming(false);
    }
  }, [isStreaming, messages, context, user, location.pathname]);

  // Get quick replies based on context
  const getQuickReplies = useCallback((): string[] => {
    if (!isAuthenticated) {
      return [
        'What is this platform?',
        'Show me pricing',
        'How does the AI work?',
      ];
    }

    if (context?.businessStage === 'idea') {
      return ['Help me validate my idea', 'Find my ICP', 'Review my concept'];
    }
    if (context?.businessStage === 'validation') {
      return ['Plan customer interviews', 'Analyze my feedback', 'Check my PMF score'];
    }
    if (context?.businessStage === 'mvp') {
      return ['Help me ship faster', 'Find beta users', 'Review my MVP'];
    }
    if (context?.businessStage === 'launched' || context?.businessStage === 'scaling') {
      return ['Growth strategies', 'Fundraising readiness', 'Optimize my metrics'];
    }

    return ['What should I focus on?', 'Help me get started', 'Explore features'];
  }, [isAuthenticated, context]);

  return {
    // UI state
    isOpen,
    activeTab,
    setActiveTab,
    openPanel,
    closePanel,

    // Proactive
    proactiveMessage,
    proactiveVisible,
    dismissProactive,

    // Chat
    messages,
    isStreaming,
    sendMessage,
    getQuickReplies,

    // Context
    isAuthenticated,
    contextLoaded,
    userName: context?.userName || null,
  };
};
