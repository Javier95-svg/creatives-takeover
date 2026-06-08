import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { streamChat } from '@/hooks/useStreamingChat';
import { getPulseRouteContext, type PulseRouteContext } from '@/config/pulseRoutes';
import { useStartupCommandCenter } from '@/hooks/useStartupCommandCenter';
import type { StartupCommandCenterModel } from '@/lib/startupCommandCenter';

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
  currentTool: PulseRouteContext | null;
}

interface PulseProjectContext {
  startupName?: string;
  stage?: string;
  industry?: string;
  country?: string;
  description?: string;
  positioning?: string;
  targetMarket?: string;
  revenueModel?: string;
  supportAreasNeeded?: string[];
  icp?: {
    personaName?: string;
    roleLine?: string;
    corePainPoint?: string;
    valueProposition?: string;
    painPoints?: string[];
    competitors?: string[];
    competitiveLandscape?: string;
  };
  pmf?: {
    score?: number | null;
    verdict?: string | null;
    summaryInsight?: string;
    strengths?: string[];
    gaps?: string[];
    recommendations?: string[];
  };
  techStack?: {
    name?: string;
    budgetTotal?: number;
    selectedTools?: string[];
    hasVariableCosts?: boolean;
  };
  waitlist?: {
    title?: string;
    summary?: string;
    status?: string | null;
  };
  mvp?: {
    title?: string;
    summary?: string;
    status?: string | null;
  };
  gtm?: {
    title?: string;
    summary?: string;
    status?: string | null;
  };
  lastUpdatedAt?: string | null;
}

const PAGE_HINTS: Record<string, string> = {
  '/icp-builder': 'The ICP Builder helps you define your ideal customer. Want a quick walkthrough?',
  '/pmf-lab': 'Product-Market Fit can feel abstract. I can help you understand your score.',
  '/pitch-deck-analyzer': 'Upload your pitch deck and I\'ll analyze it across 6 key dimensions.',
  '/go-to-market': 'Working on your go-to-market plan? I can help you sharpen the next move.',
  '/demo-studio': 'Building a demo or waitlist page? I can help make the promise clearer.',
  '/tech-stack': 'Choosing tools? I can help you keep the stack practical and lean.',
  '/mentorship': 'The community is full of founders at your stage. Want me to help you find relevant discussions?',
};

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function compactArray(values: string[] | undefined, limit = 6): string[] | undefined {
  const compacted = values?.filter(hasText).slice(0, limit);
  return compacted?.length ? compacted : undefined;
}

function compactText(value: string | null | undefined, maxLength = 260): string | undefined {
  if (!hasText(value)) return undefined;
  const trimmed = value.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3)}...` : trimmed;
}

function buildPulseProjectContext(model: StartupCommandCenterModel): PulseProjectContext | null {
  const manual = model.manual;
  const generated = model.generated;
  const context: PulseProjectContext = {};

  if (hasText(manual.startupName)) context.startupName = manual.startupName;
  if (hasText(manual.stage)) context.stage = manual.stage;
  if (hasText(model.primaryIndustry)) context.industry = model.primaryIndustry;
  if (hasText(manual.country)) context.country = manual.country;
  if (hasText(manual.description)) context.description = compactText(manual.description);
  if (hasText(manual.positioningLine)) context.positioning = compactText(manual.positioningLine);
  if (hasText(manual.targetMarket)) context.targetMarket = compactText(manual.targetMarket);
  if (hasText(manual.revenueModel)) context.revenueModel = compactText(manual.revenueModel);

  const supportAreasNeeded = compactArray(manual.supportAreasNeeded, 5);
  if (supportAreasNeeded) context.supportAreasNeeded = supportAreasNeeded;

  if (generated.icp) {
    context.icp = {
      personaName: compactText(generated.icp.snapshot.personaName, 120),
      roleLine: compactText(generated.icp.snapshot.roleLine, 180),
      corePainPoint: compactText(generated.icp.snapshot.corePainPoint, 220),
      valueProposition: compactText(generated.icp.snapshot.valueProposition || generated.icp.productPositioning, 240),
      painPoints: compactArray(generated.icp.painPoints, 4),
      competitors: compactArray(generated.icp.competitors, 5),
      competitiveLandscape: compactText(generated.icp.competitiveLandscape, 240),
    };
  }

  if (generated.pmf) {
    context.pmf = {
      score: generated.pmf.score,
      verdict: generated.pmf.verdict,
      summaryInsight: compactText(generated.pmf.summaryInsight, 220),
      strengths: compactArray(generated.pmf.strengths, 4),
      gaps: compactArray(generated.pmf.gaps, 4),
      recommendations: compactArray(generated.pmf.recommendations, 4),
    };
  }

  if (generated.techStack) {
    context.techStack = {
      name: generated.techStack.name,
      budgetTotal: generated.techStack.budgetTotal,
      selectedTools: compactArray(generated.techStack.selectedTools, 8),
      hasVariableCosts: generated.techStack.hasVariableCosts,
    };
  }

  if (generated.cycle.waitlist) {
    context.waitlist = {
      title: compactText(generated.cycle.waitlist.title, 120),
      summary: compactText(generated.cycle.waitlist.summary, 220),
      status: generated.cycle.waitlist.status,
    };
  }

  if (generated.cycle.mvp) {
    context.mvp = {
      title: compactText(generated.cycle.mvp.title, 120),
      summary: compactText(generated.cycle.mvp.summary, 240),
      status: generated.cycle.mvp.status,
    };
  }

  if (generated.cycle.gtm) {
    context.gtm = {
      title: compactText(generated.cycle.gtm.title, 120),
      summary: compactText(generated.cycle.gtm.summary, 240),
      status: generated.cycle.gtm.status,
    };
  }

  if (model.lastUpdatedAt) context.lastUpdatedAt = model.lastUpdatedAt;

  return Object.keys(context).length > 0 ? context : null;
}

function generateProactiveMessage(context: PulseContext | null, isAuthenticated: boolean): string {
  if (!isAuthenticated) {
    return 'Welcome to Creatives Takeover. I can explain what this is, show you the best tools, or help you decide where to start.';
  }

  if (!context) {
    return 'Welcome back. I can help you pick the next best step.';
  }

  const name = context.userName?.split(' ')[0] || 'there';

  // Priority 1: Page-specific hint
  if (context.currentTool) {
    return `Hey ${name}! I can help with ${context.currentTool.toolName} using your saved project context. What are you working through?`;
  }

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
  const routeContext = useMemo(() => getPulseRouteContext(location.pathname), [location.pathname]);
  const { model: startupContextModel, loading: startupContextLoading } = useStartupCommandCenter();
  const projectContext = useMemo(
    () => (isAuthenticated && !startupContextLoading ? buildPulseProjectContext(startupContextModel) : null),
    [isAuthenticated, startupContextLoading, startupContextModel]
  );

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
          currentTool: routeContext,
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
          currentTool: routeContext,
        });
      } finally {
        setContextLoaded(true);
      }
    };

    void fetchContext();
  }, [user, isAuthenticated, authLoading, location.pathname, routeContext]);

  // Generate and show proactive message after context is loaded
  useEffect(() => {
    if (!contextLoaded || authLoading) return;

    // Check if already dismissed this session
    if (sessionStorage.getItem('pulse_proactive_dismissed') === 'true') return;

    const updatedContext = context ? { ...context, currentPage: location.pathname, currentTool: routeContext } : null;
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
  }, [contextLoaded, authLoading, isAuthenticated, context, location.pathname, routeContext]);

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
      const businessContext: Record<string, unknown> = {
        currentPage: location.pathname,
        currentTool: routeContext
          ? {
              name: routeContext.toolName,
              purpose: routeContext.toolPurpose,
            }
          : null,
        projectContext,
      };

      if (context) {
        if (projectContext?.industry) businessContext.industry = projectContext.industry;
        if (projectContext?.stage || context.businessStage) businessContext.stage = projectContext?.stage || context.businessStage;
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
        'pulse',
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
  }, [isStreaming, messages, context, user, location.pathname, routeContext, projectContext]);

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

    if (routeContext?.toolName === 'ICP Builder') {
      return ['What should I focus on?', 'Sharpen my ICP', 'Review my positioning'];
    }
    if (routeContext?.toolName === 'GTM Strategist') {
      return ['What channel first?', 'Review my offer', 'Find first customers'];
    }

    return ['What should I focus on?', 'Use my project context', 'Suggest next step'];
  }, [isAuthenticated, context, routeContext]);

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
