import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Bot, User, Target, Rocket, CheckCircle, Loader2, FileText, Sparkles, MessageSquare, Package, RefreshCw, Brain, ArrowRight, TrendingUp } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import TypingMessage from "@/components/TypingMessage";
import { BizMapHero } from "@/components/bizmap/BizMapHero";
import InteractiveProgress from "@/components/InteractiveProgress";
import SEO, { createSoftwareSchema, createBreadcrumbSchema } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { getSessionSafely } from "@/integrations/supabase/auth";
import { toast } from "sonner";
import ReportDownload from "@/components/ReportDownload";
import { ChatSidebar } from "@/components/ChatSidebar";
import { useChatSessions, ChatSession } from "@/hooks/useChatSessions";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useCreditActions } from "@/hooks/useCreditActions";
import { useFeedbackModal } from "@/hooks/useFeedbackModal";
import { FeedbackQuestionnaire } from "@/components/FeedbackQuestionnaire";
import { AudioRecorder } from "@/components/AudioRecorder";
import { useFeedbackCredits } from "@/hooks/useFeedbackCredits";
import SuccessScore from "@/components/SuccessScore";
import { BizMapChat } from "@/components/BizMapChat";
import { useChatBotStore } from "@/store/chatBotStore";
import { ReportDisplay } from "@/components/ReportDisplay";
import { ExampleConversations } from "@/components/bizmap/ExampleConversations";
import { BookOpen } from "lucide-react";
import { trackActivity } from "@/lib/activity";
import {
  trackBizMapFirstMessage,
  trackBizMapOutputGenerated,
  trackBizMapOutputSaved,
  trackBizMapDemoStarted,
  trackBizMapDemoCompleted,
  trackBizMapDemoConverted,
  trackShareLinkCreated,
} from "@/lib/analytics";
import { FounderOSIntegration } from "@/components/bizmap/FounderOSIntegration";
import { useFounderOSIntegration } from "@/hooks/useFounderOSIntegration";
import { BizMapTour } from "@/components/onboarding/BizMapTour";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import BizmapWallpaper from "@/components/wallpapers/BizmapWallpaper";
import { Link, useSearchParams } from "react-router-dom";

const BizMapAI = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState({
    overview: "",
    market: "",
    problem: "",
    solution: "",
    channels: "",
    pricing: "",
    goals: ""
  });
  const [refinedContext, setRefinedContext] = useState(null);
  const [isRefiningContext, setIsRefiningContext] = useState(false);
  const [launchReport, setLaunchReport] = useState("");
  const [successScore, setSuccessScore] = useState<any>(null);
  const [switchToFreeformFunc, setSwitchToFreeformFunc] = useState<(() => void) | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [validationScore, setValidationScore] = useState<any>(null);
  const [modeInfo, setModeInfo] = useState<{ activeMode: 'planning' | 'gtm', onModeChange: (mode: 'planning' | 'gtm') => void } | undefined>(undefined);
  
  // Simplified states - no more research complexity
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: "assistant",
      content: "Hey there! 👋 I'm your AI co-founder, ready to help you validate your idea and launch in 30 days! \n\nLet's start by understanding your business concept. In a few sentences, what problem are you solving and for whom? Don't worry about making it perfect – just share what's on your mind!"
    }
  ]);

  const { user, isAuthenticated } = useAuth();
  const { balance, refreshBalance, CREDIT_COSTS } = useCredits();
  const { ensureCredits, handleCreditError } = useCreditActions();
  const generateReport = useChatBotStore(s => s.generateReport);
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  
  // Founder OS Integration
  const { 
    validating, 
    generatingRoadmap, 
    validationComplete, 
    roadmapComplete,
    runValidation,
    generateRoadmap
  } = useFounderOSIntegration();
  
  // PMF Lab data export handler
  const handlePMFDataExport = (data: {
    selectedSegment?: string;
    refinedProblem?: string;
    pmfScore?: number;
    experiments?: Array<{
      id?: string;
      name: string;
      description?: string;
      status?: string;
      results?: Record<string, unknown>;
    }>;
  }) => {
    // Update userAnswers with refined PMF data
    if (data.selectedSegment || data.refinedProblem) {
      setUserAnswers(prev => ({
        ...prev,
        market: data.selectedSegment || prev.market,
        problem: data.refinedProblem || prev.problem,
      }));
    }
    
    // Could also update launchReport or successScore with PMF insights
    if (data.pmfScore) {
      toast.success(`PMF data exported! Your PMF score: ${data.pmfScore}/100`);
    }
  };

  // Define wizardSteps before using it in hooks
  const wizardSteps = [
    {
      key: "overview",
      title: "Business Concept (Days 1-2)",
      question: "🚀 Let's build your 30-day launch plan! What problem are you solving and for whom? This becomes your validation foundation.",
      placeholder: "Example: A mobile app that helps busy parents find and book last-minute childcare...",
      transition: "Perfect! Now let's define who your first customers will be..."
    },
    {
      key: "market", 
      title: "Target Customer (Days 3-4)",
      question: "📅 Day 3-4 Focus: Describe your ideal FIRST customer in detail. Where can we find them in the next 7 days?",
      placeholder: "Example: Working parents aged 28-45 in urban areas, active in mom Facebook groups and parenting subreddits...",
      transition: "Excellent! Now let's design your minimum viable product..."
    },
    {
      key: "problem",
      title: "Validation Plan (Days 5-7)", 
      question: "📊 Validation Goal: How will you validate demand this week? List 3 ways you'll test if people want this.",
      placeholder: "Example: 10 customer interviews, landing page with email signup, competitor research in 3 markets...",
      transition: "Great validation plan! Now, what's the simplest version we can build?"
    },
    {
      key: "solution",
      title: "MVP Design (Days 8-14)",
      question: "🛠️ MVP Focus: What's the absolute MINIMUM version that solves the core problem? What features are essential?", 
      placeholder: "Example: Simple booking form, verified sitter profiles, SMS notifications. NO fancy features yet...",
      transition: "Perfect MVP scope! Now, where will you launch?"
    },
    {
      key: "channels",
      title: "Launch Strategy (Days 15-21)",
      question: "🎯 Launch Goal: Where will you launch to get your first 10 users? Be specific about channels and tactics.",
      placeholder: "Example: Product Hunt launch, 5 parenting Facebook groups, Instagram influencer outreach, friend referrals...",
      transition: "Smart launch strategy! Now let's plan how you'll get your first paying customer..."
    },
    {
      key: "pricing",
      title: "Pricing Model (Days 22-25)",
      question: "💰 Pricing: How will you charge? What pricing makes sense for getting your first paying customer by Day 30?",
      placeholder: "Example: Early bird: $20/month (50% off), then $40/month. First 10 customers get lifetime discount...",
      transition: "Excellent pricing strategy! Finally, what does success look like on Day 30?"
    },
    {
      key: "goals",
      title: "Day 30 Success Metrics (Days 26-30)",
      question: "🎯 Final Goal: What does success look like on Day 30? How many customers or revenue would make this REAL?",
      placeholder: "Example: 1 paying customer ($20), 50 email signups, 20 active users. Proof this can work!",
      transition: "Amazing! Generating your personalized 30-day launch roadmap... 🎉"
    }
  ];

  const { showFeedback, feedbackCompleted, closeFeedback, completeFeedback } = useFeedbackModal(currentStep === wizardSteps.length);
  const { hasPendingCredits } = useFeedbackCredits();
  const {
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    updateSession,
    getSession,
    sessions
  } = useChatSessions();

  // True only if this user has never saved a completed BizMap plan before — used to make their first run free
  const isFirstBizMap = !sessions.some(s => s.launch_report && s.launch_report.trim().length > 0);
  const [searchParams] = useSearchParams();

  const [message, setMessage] = useState("");
  const [followUpState, setFollowUpState] = useState<{ active: boolean; stepKey: string | null; initialAnswer: string }>(
    { active: false, stepKey: null, initialAnswer: "" }
  );
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const hasShownSharePromptRef = useRef(false);

  // Demo mode: read ?demo=true&idea=... from URL
  const isDemoMode = searchParams.get('demo') === 'true';
  const demoIdea = searchParams.get('idea') || '';
  const [showDemoGate, setShowDemoGate] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId && sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
    }
  }, [searchParams, currentSessionId, setCurrentSessionId]);

  // Auto-populate and auto-submit the demo idea on mount
  useEffect(() => {
    if (!isDemoMode || !demoIdea) return;
    const trimmedIdea = demoIdea.trim();
    if (!trimmedIdea) return;
    // FIX(retention): mark the top of the BizMap demo funnel. trackBizMapDemoStarted
    // was defined but never called, so bizmap_demo_started never reached PostHog even
    // though demo_completed/demo_converted (further down the funnel) did.
    trackBizMapDemoStarted({ idea: trimmedIdea });
    setMessage(trimmedIdea);
    // Small delay so the UI renders first
    const timer = setTimeout(() => {
      handleSendMessage(trimmedIdea);
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, demoIdea]);

  // Sync currentSessionId changes from useChatSessions
  useEffect(() => {
    if (!currentSessionId) return;
    
    // Wait a tick to ensure getSession is available
    const timeoutId = setTimeout(() => {
      try {
        if (typeof getSession !== 'function') {
          console.warn('getSession is not a function yet');
          return;
        }
        
        const session = getSession(currentSessionId);
        if (session) {
          console.log('🟢 Dream2Plan: Syncing session state for', currentSessionId);
          // Map session answers to userAnswers structure with safe access
          const answers = session.answers || {};
          const mappedAnswers = {
            overview: answers.overview || "",
            market: answers.market || "",
            problem: answers.problem || "",
            solution: answers.solution || "",
            channels: answers.channels || "",
            pricing: answers.pricing || "",
            goals: answers.goals || ""
          };
          
          setUserAnswers(mappedAnswers);
          setCurrentStep(session.current_step || 0);
          setLaunchReport(session.launch_report || "");
        }
      } catch (error) {
        console.error('Error syncing session state:', error);
        // Don't throw - just log the error to prevent crash
      }
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [currentSessionId, getSession]);

  // Session Management Functions
  const handleSessionSelect = (session: ChatSession | null) => {
    console.log('🟢 Dream2Plan: handleSessionSelect called', session?.id);
    if (session) {
      try {
        console.log('🟢 Setting currentSessionId to:', session.id);
        setIsLoadingSession(true);
        
        // Set the current session ID - this will trigger message loading in useChatbot
        // Use the setCurrentSessionId from useChatSessions to ensure state sync
        setCurrentSessionId(session.id);
        
        // Properly map session answers to userAnswers structure with safe access
        const answers = session.answers || {};
        const mappedAnswers = {
          overview: answers.overview || "",
          market: answers.market || "",
          problem: answers.problem || "",
          solution: answers.solution || "",
          channels: answers.channels || "",
          pricing: answers.pricing || "",
          goals: answers.goals || ""
        };
        
        setUserAnswers(mappedAnswers);
        setCurrentStep(session.current_step || 0);
        setLaunchReport(session.launch_report || "");
        
        // Clear existing messages immediately to show loading state
        setMessages([]);
        
        // Messages will be loaded automatically by useChatbot hook when currentSessionId changes
        // The useEffect in useChatbot will detect the change and call loadMessagesFromSession
        // Loading state is managed by useChatbot's isTyping state
      } catch (error) {
        console.error('Error in handleSessionSelect:', error);
        toast.error('Failed to load session');
        setIsLoadingSession(false);
      }
    } else {
      // Reset for new chat
      setCurrentSessionId(null);
      resetChat();
      setIsLoadingSession(false);
    }
  };

  const resetChat = () => {
    setCurrentStep(0);
    setUserAnswers({
      overview: "",
      market: "",
      problem: "",
      solution: "",
      channels: "",
      pricing: "",
      goals: ""
    });
    setLaunchReport("");
    setMessages([
      {
        type: "assistant",
        content: "Hey there! 👋 I'm your AI co-founder, and I'm genuinely excited to help you build something amazing! \n\nI'd love to start by hearing about your business idea. In a few sentences, what are you planning to create or offer? Don't worry about making it perfect – just tell me what's on your mind!"
      }
    ]);
  };

  const handleNewChat = async () => {
    const sessionId = await createNewSession();
    if (sessionId) {
      resetChat();
    } else if (!user) {
      // For non-authenticated users, just reset the chat
      resetChat();
      setCurrentSessionId(null);
    }
  };

  // Auto-save session progress
  const saveSessionProgress = async () => {
    if (currentSessionId && user) {
      const session = getSession(currentSessionId);
      if (session) {
        // Generate title from first answer or use default
        let title = session.title;
        if (userAnswers.overview && userAnswers.overview.length > 10) {
          const words = userAnswers.overview.split(' ').slice(0, 6);
          title = words.join(' ') + (userAnswers.overview.split(' ').length > 6 ? '...' : '');
        }

        await updateSession(currentSessionId, {
          title,
          current_step: currentStep,
          answers: userAnswers,
          is_completed: !!launchReport,
          launch_report: launchReport
        });
        if (launchReport) {
          trackBizMapOutputSaved({ userId: user?.id, sessionId: currentSessionId });

          // Send celebration email (deduped inside the function — fires once per user)
          supabase.functions.invoke('send-retention-email', {
            body: {
              userId: user.id,
              email: user.email,
              fullName: user.user_metadata?.full_name ?? null,
              sequence: 'celebration',
            },
          }).catch(() => { /* non-blocking */ });

          // Show share prompt the first time a report is saved
          if (!hasShownSharePromptRef.current) {
            hasShownSharePromptRef.current = true;
            const shareUrl = `${window.location.origin}/bizmap-ai/chat?session=${currentSessionId}`;
            trackShareLinkCreated({ userId: user?.id, sessionId: currentSessionId });
            toast.success('Your BizMap plan is saved!', {
              description: 'Share it with your co-founder or advisor.',
              duration: 8000,
              action: {
                label: 'Copy link',
                onClick: () => {
                  navigator.clipboard.writeText(shareUrl).then(() => {
                    toast.success('Link copied to clipboard');
                  });
                },
              },
            });
          }
        }
      }
    }
  };

  // Auto-save when important state changes
  useEffect(() => {
    if (currentSessionId && user && (Object.values(userAnswers).some(answer => answer))) {
      const timeoutId = setTimeout(saveSessionProgress, 1000); // Debounce saves
      return () => clearTimeout(timeoutId);
    }
  }, [userAnswers, currentStep, launchReport, currentSessionId, user]);

  // Restore saved progress for new users
  useEffect(() => {
    if (user) {
      const savedProgress = localStorage.getItem('bizmap_progress');
      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress);
          const timeSinceProgress = Date.now() - progress.timestamp;
          
          // Only restore if progress is less than 24 hours old
          if (timeSinceProgress < 24 * 60 * 60 * 1000) {
            setCurrentStep(progress.step);
            setUserAnswers(progress.answers);
            toast.success("Welcome back! Your progress has been restored.");
          }
          
          // Clear the saved progress
          localStorage.removeItem('bizmap_progress');
        } catch (e) {
          console.error('Failed to restore progress:', e);
        }
      }
    }
  }, [user]);

  // Check for pre-populated prompt from Prompt Library or Template
  useEffect(() => {
    // Track first chatbot use (once per device)
    try {
      const key = 'ct_first_chatbot_use_tracked';
      if (!localStorage.getItem(key)) {
        trackActivity('chatbot:first_use', {});
        localStorage.setItem(key, '1');
      }
    } catch {}
    const savedPrompt = localStorage.getItem('bizmap_prompt');
    const savedTemplate = localStorage.getItem('bizmap_template');
    
    if (savedPrompt) {
      setUserAnswers(prev => ({ ...prev, overview: savedPrompt }));
      setMessage(savedPrompt);
      localStorage.removeItem('bizmap_prompt');
      toast.success("Prompt loaded from Prompt Library!");
    } else if (savedTemplate) {
      let template: any = null;
      try {
        template = JSON.parse(savedTemplate);
      } catch (error) {
        console.error('Failed to parse saved template:', error);
        localStorage.removeItem('bizmap_template');
        return;
      }
      setUserAnswers(template.answers);
      setCurrentStep(7); // Move to end since template is complete
      localStorage.removeItem('bizmap_template');
      toast.success(`${template.title} template loaded!`);
      
      // Reconstruct messages for template
      const templateMessages = [
        {
          type: "assistant",
          content: "Hey there! 👋 I'm your AI co-founder, and I'm genuinely excited to help you build something amazing! \n\nI'd love to start by hearing about your business idea. In a few sentences, what are you planning to create or offer? Don't worry about making it perfect – just tell me what's on your mind!"
        }
      ];
      
      wizardSteps.forEach((step, index) => {
        if (index > 0) {
          templateMessages.push({
            type: "assistant", 
            content: wizardSteps[index - 1].transition + "\n\n" + step.question
          });
        }
        templateMessages.push({
          type: "user",
          content: template.answers[step.key]
        });
      });
      
      templateMessages.push({
        type: "assistant",
        content: "Excellent! I have everything I need to create your personalized Launch Report. This template provides a solid foundation - let's generate your comprehensive business plan!"
      });
      
      setMessages(templateMessages);
    }
  }, []);

  // Listen for examples modal trigger from BizMapChat
  useEffect(() => {
    const handleTriggerExamples = () => {
      setShowExamplesModal(true);
    };
    window.addEventListener('triggerExamplesModal', handleTriggerExamples);
    return () => window.removeEventListener('triggerExamplesModal', handleTriggerExamples);
  }, []);

  // Helper: compute and store success score
  interface BusinessAnswers {
    idea?: string;
    problem?: string;
    solution?: string;
    market?: string;
    revenue?: string;
    competition?: string;
    team?: string;
    [key: string]: unknown;
  }
  
  const computeAndStoreSuccessScore = async (answers: BusinessAnswers) => {
    try {
      const { data: scoreData, error: scoreError } = await supabase.rpc('calculate_business_success_score', { answers });
      if (scoreError) throw scoreError;
      setSuccessScore(scoreData);

      // Persist for history/analytics
      const session = await getSessionSafely();
      const userId = session?.user?.id ?? null;
      const score = scoreData as { score: number; breakdown?: Record<string, number> };
      setSuccessScore(score);

      // Persist for history/analytics
      await supabase.from('business_success_scores').insert({
        user_id: userId,
        session_id: currentSessionId,
        overall_score: score.overall_score,
        market_clarity_score: score.market_clarity_score,
        problem_validation_score: score.problem_validation_score,
        solution_strength_score: score.solution_strength_score,
        market_strategy_score: score.market_strategy_score,
        financial_planning_score: score.financial_planning_score,
        execution_feasibility_score: score.execution_feasibility_score,
        risk_assessment: score.risk_assessment,
        success_likelihood: score.success_likelihood,
        key_strengths: score.key_strengths,
        improvement_areas: score.improvement_areas,
        action_recommendations: score.action_recommendations,
        scoring_criteria: score.scoring_breakdown
      });
      toast.success('Success score calculated.');
      } catch (e) {
        console.error('Scoring error:', e);
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        toast.error(`Could not calculate success score: ${errorMessage}. Please try again later.`, {
          duration: 5000,
        });
    }
  };

  // Simplified launch report generation - single step, fixed cost
  const generateLaunchReport = async (answers: any, isFreeForFeedback = false) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to generate a launch report.");
      return;
    }

    const reportCost = CREDIT_COSTS.LAUNCH_REPORT;

    if (!isFreeForFeedback) {
      const requiredCredits = ensureCredits('LAUNCH_REPORT', { featureName: 'Launch Report Generation' });
      if (requiredCredits === null) return;
    }

    try {
      setIsGeneratingReport(true);
      setIsLoading(true);
      
      // Add progress message
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: "Perfect! I'm analyzing your business idea and creating your personalized Launch Report. This will take about 30 seconds..." 
      }]);
      
      // Single API call - no research, no context refinement
      const { data, error } = await supabase.functions.invoke('bizmap-analysis', {
        body: { answers }
      });

      if (error) {
        console.error('Error generating launch report:', error);
        if (handleCreditError(error, data, 'LAUNCH_REPORT', { featureName: 'Launch Report Generation' })) {
          return;
        }
        
        // Try fallback but make it comprehensive
        const fallbackReport = generateFallbackReport(answers);
        toast.success("Generated your Launch Report successfully!");
        await computeAndStoreSuccessScore(answers);
        return fallbackReport;
      }

      if (data?.success) {
        const successMessage = isFreeForFeedback ?
          "FREE Launch Report generated successfully! 🎉" :
          `Launch Report generated successfully! (Used ${reportCost} credits)`;
        toast.success(successMessage);
        trackBizMapOutputGenerated({ userId: user?.id, sessionId: currentSessionId });
        await computeAndStoreSuccessScore(answers);
        await refreshBalance();
        
        // Auto-generate 30-day roadmap with wizard answers
        if (currentSessionId && user) {
          console.log('🗓️ Auto-generating 30-day roadmap with wizard context...');
          setShowReport(true);
          try {
            await generateRoadmap({
              sessionId: currentSessionId,
              businessIdea: answers.overview || 'Not specified',
              industry: 'General',
              targetMarket: answers.market || 'Not specified'
            }, answers);
            toast.success("🎉 Launch Report & 30-Day Roadmap Ready!", {
              description: "Your personalized launch plan is complete!"
            });
          } catch (roadmapError) {
            console.error('Roadmap generation failed:', roadmapError);
            // Don't fail the whole process if roadmap generation fails
          }
        } else {
          setShowReport(true);
        }
        
        return data.report;
      } else {
        if (handleCreditError(null, data, 'LAUNCH_REPORT', { featureName: 'Launch Report Generation' })) {
          return;
        }
        console.error('API returned error:', data?.error);
        const fallbackReport = generateFallbackReport(answers);
        toast.success("Generated your Launch Report successfully!");
        await computeAndStoreSuccessScore(answers);
        return fallbackReport;
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      // Always generate something - improved fallback
      const fallbackReport = generateFallbackReport(answers);
      toast.success("Generated your Launch Report successfully!");
      return fallbackReport;
    } finally {
      setIsGeneratingReport(false);
      setIsLoading(false);
    }
  };

  // Generate post-report assets (outreach email, social posts, landing page)
  const generateAsset = async (type: 'outreach' | 'social' | 'landing') => {
    const requiredCredits = ensureCredits('ASSET_GENERATION', { featureName: 'Asset Generation' });
    if (requiredCredits === null) return;

    try {
      setIsLoading(true);
      const label = type === 'outreach' ? 'your first outreach email' : type === 'social' ? '3 social posts' : 'a simple landing page outline';
      
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: `Perfect! I'm generating ${label} based on your Launch Report. This will take about 15 seconds...` 
      }]);
      
      const { data, error } = await supabase.functions.invoke('bizmap-assets', {
        body: { 
          assetType: type,
          answers: userAnswers 
        }
      });

      if (error) {
        console.error('Error generating asset:', error);
        if (handleCreditError(error, data, 'ASSET_GENERATION', { featureName: 'Asset Generation' })) {
          return;
        }
        toast.error("Failed to generate asset. Please try again.");
        return;
      }

      if (data?.success) {
        toast.success(`Generated ${label} successfully! (Used ${CREDIT_COSTS.ASSET_GENERATION} credits)`);
        await refreshBalance();
        
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          content: data.content 
        }]);
      } else {
        toast.error("Failed to generate asset. Please try again.");
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced improved fallback report generator with better structure and actionable insights
  const generateFallbackReport = (answers: any) => {
    const businessName = answers.overview?.split(' ').slice(0, 3).join(' ') || 'Your Business';
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `# 🚀 Launch Report for ${businessName}

*Generated on ${currentDate} by BizMap AI*

## 📊 Executive Summary

Your business concept shows strong potential in today's market. This comprehensive launch report provides strategic insights and actionable steps to bring your vision to reality.

**Key Opportunity**: ${answers.overview || 'Innovative business solution addressing market needs.'}

**Target Market**: ${answers.market || 'Defined customer segment with clear needs.'}

**Success Factors**:
• Clear problem-solution fit
• Targeted approach to customer acquisition  
• Realistic timeline and goals
• Scalable business model

---

## 🎯 Business Foundation

### Problem & Solution Analysis
**The Challenge**: ${answers.problem || 'Market gap identified with growth potential.'}

**Your Solution**: ${answers.solution || 'Innovative approach to solve customer pain points effectively.'}

**Why Now**: Market conditions are favorable for launching this type of solution.

### Target Customer Profile
${answers.market || 'Well-defined target audience with specific characteristics and behaviors.'}

**Customer Pain Points**:
• Time-consuming current solutions
• Lack of efficient alternatives
• Need for better user experience

---

## 📈 Go-to-Market Strategy

### Marketing & Customer Acquisition
${answers.channels || 'Multi-channel approach focusing on highest-impact tactics first.'}

**Recommended Channel Priority**:
1. **Primary**: Most cost-effective channel for your target market
2. **Secondary**: Scalable channels for growth phase
3. **Experimental**: Test channels with small budget

### Launch Timeline
**Phase 1 (Weeks 1-4)**: Validation & Setup
• Finalize MVP features
• Set up analytics and tracking
• Create content and marketing materials

**Phase 2 (Weeks 5-8)**: Soft Launch
• Launch to limited audience
• Gather feedback and iterate
• Optimize conversion funnel

**Phase 3 (Weeks 9-12)**: Scale & Growth
• Full market launch
• Expand marketing channels
• Monitor KPIs and adjust strategy

---

## 💰 Financial Strategy

### Revenue Model
${answers.pricing || 'Sustainable pricing strategy aligned with market expectations and business goals.'}

### Financial Projections (Conservative Estimates)
**Month 1-3**: Focus on validation and early revenue
**Month 4-6**: Growth phase with increasing customer base
**Month 7-12**: Scale and optimization

**Key Metrics to Track**:
• Customer Acquisition Cost (CAC)
• Customer Lifetime Value (CLV)
• Monthly Recurring Revenue (MRR)
• Conversion rates across funnel

---

## 🎯 90-Day Action Plan

### Month 1: Foundation (${answers.goals?.includes('30') ? 'Based on your goals' : 'Launch Preparation'})
**Week 1-2**: 
• Complete market validation interviews
• Finalize product/service features
• Set up business infrastructure

**Week 3-4**:
• Create marketing materials
• Launch pilot program
• Establish feedback collection system

### Month 2: Launch & Learn
**Goals**: First paying customers and initial traction
• Execute soft launch strategy
• Gather user feedback and iterate
• Monitor key performance indicators

### Month 3: Scale & Optimize  
**Goals**: ${answers.goals || 'Sustainable growth and proven business model'}
• Scale successful marketing channels
• Optimize operations and processes
• Plan for next growth phase

---

## 📋 Next Steps (Priority Order)

### This Week:
1. **Validate assumptions** - Talk to 5 potential customers
2. **Set up tracking** - Analytics, metrics dashboard
3. **Create content** - Website, social profiles, first marketing materials

### This Month:
1. **Build MVP** - Minimum viable product or service offering
2. **Launch pilot** - Test with small group of customers
3. **Establish processes** - Customer support, feedback collection

### Next 90 Days:
1. **Scale what works** - Double down on successful strategies
2. **Expand offerings** - Add complementary products/services
3. **Build team** - Hire key positions for growth

---

## ⚡ Quick-Start Templates

### Customer Interview Script:
"Hi [Name], I'm working on [solution] for [target market]. Could you help me understand: What's your biggest challenge with [problem area]? How do you currently handle this? What would make the biggest difference?"

### Social Media Post Template:
"🚀 Excited to share [business name] - helping [target market] [key benefit]. Early users are seeing [specific result]. Who else struggles with [problem]? #startup #Entrepreneurship"

### Email Outreach Template:
Subject: "Quick question about [their pain point]"
"Hi [Name], I noticed [relevant observation]. I'm building [solution] to help [target market] [benefit]. Would love 5 minutes to understand your experience with [problem area]."

---

## 🔥 Success Accelerators

### Immediate Actions (Next 48 Hours):
• Save this report and review weekly
• Schedule 3 customer interviews
• Set up basic landing page
• Create social media profiles

### Growth Hacks:
• Partner with complementary businesses
• Create valuable free content
• Build email list from day one
• Focus on word-of-mouth and referrals

---

## 📞 Support & Resources

**Remember**: This is your starting point, not your finish line. Successful businesses iterate constantly based on real customer feedback.

**Next Steps**: 
1. Download this report as PDF for future reference
2. Create a 90-day sprint to track your progress
3. Join our community for ongoing support

---

*This Launch Report was generated by BizMap AI based on your responses. For the most current version of your business plan, always refer to real customer feedback and market data.*

**🎯 Ready to take action?** Use the tools above to download this report, create marketing assets, or start your first 90-day sprint!`;
  };

  // Enhanced validation helper functions with better accuracy
  const isAnswerTooVague = (answer: string, stepKey: string) => {
    if (!answer || answer.trim().length < 10) return true;
    
    const wordCount = answer.trim().split(/\s+/).length;
    const t = answer.toLowerCase();
    
    // Enhanced vague indicators with more patterns
    const vague = /(i think|maybe|probably|sort of|kind of|not sure|i guess|possibly|i don't know|unclear|unsure)/i;
    const generic = /(make money|be successful|help people|solve problems|good idea|great opportunity|amazing|perfect|easy)/i;
    const tooGeneral = /(app|website|platform|service|business|company|startup|product)$/i; // Only these words
    
    // Check for step-specific requirements
    switch (stepKey) {
      case 'overview':
        // Need specific what they're building with clear value proposition
        const hasSpecificSolution = !tooGeneral.test(t) && /(mobile|web|saas|marketplace|tool|system|software)/i.test(t);
        const hasValueProp = /(save|reduce|increase|improve|automate|connect|enable|help)/i.test(t);
        return wordCount < 20 || !hasSpecificSolution || !hasValueProp || vague.test(t);
        
      case 'market':
        // Need specific demographics, psychographics, and behaviors
        const hasMarketSpecifics = /(age|years old|parents|professionals|students|small business|women|men|teens|seniors)/i.test(t);
        const hasLocation = /(urban|rural|city|country|global|local|region|state)/i.test(t);
        const hasBehavior = /(use|buy|spend|work|struggle|need|want|prefer)/i.test(t);
        return !hasMarketSpecifics || !hasBehavior || wordCount < 25 || vague.test(t);
        
      case 'problem':
        // Need concrete pain points with impact and frequency
        const hasPainPoints = /(waste time|expensive|difficult|frustrating|slow|manual|hard to|takes hours|costs too much|break down|fail)/i.test(t);
        const hasImpact = /(money|time|stress|productivity|revenue|customers|growth)/i.test(t);
        const hasFrequency = /(daily|weekly|monthly|always|often|frequently|every|constantly)/i.test(t);
        return !hasPainPoints || !hasImpact || wordCount < 30 || generic.test(t);
        
      case 'solution': 
        // Need clear differentiation and unique approach
        const hasDifferentiation = /(faster|cheaper|easier|better|automated|simple|instant|unique|innovative|first)/i.test(t);
        const hasFeatures = /(dashboard|algorithm|integration|api|mobile|cloud|ai|ml|automation)/i.test(t);
        const hasApproach = /(by|through|using|via|with|unlike|instead of|rather than)/i.test(t);
        return !hasDifferentiation || !hasApproach || wordCount < 25;
        
      case 'channels':
        // Need specific marketing tactics with budget and timeline
        const hasTactics = /(ads|social|email|seo|content|referral|partnership|direct|influencer|linkedin|facebook|google)/i.test(t);
        const hasBudget = /(\$|budget|cost|spend|free|organic)/i.test(t);
        const hasStrategy = /(first|start|begin|launch|target|reach|acquire)/i.test(t);
        return !hasTactics || !hasStrategy || wordCount < 20;
        
      case 'pricing':
        // Need numbers, revenue model, and cost structure
        const hasNumbers = /[\d$%]/;
        const hasModel = /(subscription|monthly|yearly|one-time|freemium|commission|revenue|tier)/i.test(t);
        const hasCosts = /(cost|expense|overhead|margin|profit|break-even)/i.test(t);
        return !hasNumbers.test(t) || !hasModel || wordCount < 25;
        
      case 'goals':
        // Need SMART goals with specific metrics and timelines
        const hasGoalSpecifics = /\d/.test(t) && /(users|customers|revenue|sales|downloads|signups)/i.test(t);
        const hasTimeframe = /(week|month|day|launch|by|within|next|first)/i.test(t);
        const hasActions = /(build|launch|grow|acquire|reach|achieve|complete)/i.test(t);
        const hasMeasurable = /(goal|target|milestone|metric|kpi)/i.test(t);
        return !hasGoalSpecifics || !hasTimeframe || !hasActions || wordCount < 25;
        
      default:
        return wordCount < 15;
    }
  };

  const generateClarifyingQuestion = (stepKey: string, answer: string) => {
    const questions = {
      overview: [
        "I'd love to understand better - what exactly are you building? Is it an app, website, physical product, or service?",
        "Can you help me visualize this? What would someone actually do or get when they use your product/service?",
        "That sounds interesting! What's the core thing you're creating and who would use it?"
      ],
      market: [
        "I need more specifics about your customers. Can you tell me their age range, occupation, or key characteristics?",
        "Where do these people currently go when they have the problem you're solving? What do they do today?",
        "Help me picture your ideal customer - what's their typical day like and when do they encounter this problem?"
      ],
      problem: [
        "I want to understand the pain better. How much time or money does this problem typically cost people?",
        "What happens when people can't solve this problem? What's the real impact on their day/business/life?",
        "Can you give me a specific example of when someone last experienced this frustration?"
      ],
      solution: [
        "What makes your approach different from what's already out there? What's your unique angle?",
        "If someone asked you 'why not just use [existing solution]?' - what would you say?",
        "What's the core innovation or improvement you're bringing to this problem?"
      ],
      channels: [
        "I need specifics on how you'll reach people. What's your plan to get your first 10 customers?",
        "Which marketing channel do you think will work best for your specific audience and why?",
        "Where do your ideal customers spend time online, and how will you reach them there?"
      ],
      pricing: [
        "I need to understand the money side better. What will you charge and what are your main costs?",
        "How much money do you need to get started, and what's your revenue target for month 1?",
        "What's your revenue model - subscription, one-time payment, commission, etc.?"
      ],
      goals: [
        "I need specific, measurable goals. What exact numbers do you want to hit and by when?",
        "What does success look like in the next 30, 60, and 90 days with specific metrics?",
        "How many hours per week can you dedicate to this, and what's your target launch date?"
      ]
    };
    
    const questionSet = questions[stepKey as keyof typeof questions] || questions.overview;
    return questionSet[Math.floor(Math.random() * questionSet.length)];
  };

  const shouldAskFollowUp = (stepKey: string, answer: string) => {
    const wordCount = answer.trim().split(/\s+/).length;
    
    // Don't ask follow-ups for very detailed answers
    if (wordCount > 60) return false;
    
    // Ask follow-ups for medium answers to get more strategic insight
    if (wordCount >= 25 && wordCount <= 60) {
      return Math.random() > 0.3; // 70% chance to ask follow-up for medium answers
    }
    
    return false; // Short answers get clarifying questions, not follow-ups
  };

  const generateContextualFollowUp = (stepKey: string, answer: string) => {
    const prev = userAnswers as BusinessAnswers;
    
    // Analyze user's business context for smarter follow-ups
    const businessType = prev.overview ? (
      prev.overview.toLowerCase().includes('app') ? 'tech' :
      prev.overview.toLowerCase().includes('service') ? 'service' :
      prev.overview.toLowerCase().includes('store') ? 'ecommerce' :
      prev.overview.toLowerCase().includes('restaurant') ? 'food' : 'general'
    ) : 'general';
    
    switch (stepKey) {
      case 'overview':
        return `Thank you for that overview! I'd like to understand your biggest concern right now. What's the one assumption about "${answer.slice(0, 100)}..." that keeps you up at night? This will help me tailor your launch plan perfectly.`;
        
      case 'market':
        return `Great start! I need to understand their behavior better. Could you tell me: where do these specific people spend most of their time online, and what's their typical decision-making process when they need solutions like yours?`;
        
      case 'problem':
        const problemContext = businessType === 'tech' ? 'inefficiency' : 
                              businessType === 'service' ? 'frustration' : 'cost or time waste';
        return `I can see this is a real issue. To help you build a compelling solution, could you quantify the impact? For example: How much time, money, or ${problemContext} does this problem typically cause your target customers each week or month?`;
        
      case 'solution':
        const competitorContext = prev.problem ? `given the problem of "${String(prev.problem).slice(0, 80)}..."` : 'in this space';
        return `That sounds promising! I need to understand your competitive advantage clearly. What makes your approach fundamentally different from existing solutions ${competitorContext}? What's your "unfair advantage"?`;
        
      case 'channels':
        return `Good thinking on channels! But I need specifics: How exactly will you get your first 10 customers through your top 2 channels? What's your step-by-step approach?`;
        
      case 'pricing':
        return `Perfect, I can see you've thought about the economics. What's your specific plan to test pricing with real customers in the next 2 weeks? This is crucial for ${businessType} businesses.`;
        
      case 'goals':
        return `Excellent goals! What's the biggest obstacle you anticipate in the next 30 days, and what's your backup plan if things don't go as expected? This foresight will be key to your success.`;
        
      default:
        return `Thank you for sharing that. To give you the most relevant advice for your ${businessType} business, could you provide one more specific detail that would help me understand your situation better?`;
    }
  };

  // Main handler for wizard steps
  const handleNextStep = async (currentAnswer: string) => {
    if (!currentAnswer.trim()) return;

    const currentKey = wizardSteps[currentStep].key;

    // Track first message sent — fires once when the user responds to step 0
    if (currentStep === 0) {
      trackBizMapFirstMessage({ userId: user?.id, messageLength: currentAnswer.length });
    }

    // Demo mode gate: allow step 0 to complete, then show signup prompt
    if (isDemoMode && !isAuthenticated && currentStep >= 1) {
      trackBizMapDemoCompleted({ idea: demoIdea });
      setShowDemoGate(true);
      return;
    }

    // If we're answering a pending follow-up for this step
    if (followUpState.active && followUpState.stepKey === currentKey) {
      // Add the follow-up answer
      setMessages(prev => [...prev, { type: "user", content: currentAnswer }]);

      // Save combined detail to the current step answer
      const combined = `${followUpState.initialAnswer}\n\nAdditional details: ${currentAnswer}`;
      setUserAnswers(prev => ({ ...prev, [currentKey]: combined }));

      setFollowUpState({ active: false, stepKey: null, initialAnswer: "" });
      setMessage("");

      if (currentStep < wizardSteps.length - 1) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        setMessages(prev => [...prev, {
          type: "assistant",
          content: wizardSteps[currentStep].transition + "\n\n" + wizardSteps[nextStep].question
        }]);
      } else {
        setMessages(prev => [...prev, { type: "assistant", content: "Amazing! I have everything I need now. Let me create your personalized Launch Report - this is going to be good! 🚀" }]);
        const completeAnswers = { ...userAnswers, [currentKey]: combined };
        const report = await generateLaunchReport(completeAnswers, feedbackCompleted || isFirstBizMap);
        setLaunchReport(report);
        setMessages(prev => [...prev, { type: "assistant", content: report }]);
      }
      return;
    }

    // Check if answer is too vague
    if (isAnswerTooVague(currentAnswer, currentKey)) {
      setMessages(prev => [...prev, {
        type: "user",
        content: currentAnswer
      }]);

      const clarifyingQuestion = generateClarifyingQuestion(currentKey, currentAnswer);
      setMessages(prev => [...prev, {
        type: "assistant",
        content: clarifyingQuestion
      }]);

      setMessage("");
      return; // Don't advance to next step
    }

    // Smart context-aware follow-up to deepen specificity (like a real advisor)
    if (shouldAskFollowUp(currentKey, currentAnswer)) {
      setMessages(prev => [...prev, { type: "user", content: currentAnswer }]);
      const followQ = generateContextualFollowUp(currentKey, currentAnswer);
      setMessages(prev => [...prev, { type: "assistant", content: followQ }]);
      setFollowUpState({ active: true, stepKey: currentKey, initialAnswer: currentAnswer });
      setMessage("");
      return; // Wait for follow-up response
    }

    // Answer is good enough, proceed
    setUserAnswers(prev => ({ ...prev, [currentKey]: currentAnswer }));

    // Add user message to chat
    setMessages(prev => [...prev, {
      type: "user",
      content: currentAnswer
    }]);

    setMessage("");

    if (currentStep < wizardSteps.length - 1) {
      // Move to next step
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      // Add next question to chat with conversational transition
      setMessages(prev => [...prev, {
        type: "assistant",
        content: wizardSteps[currentStep].transition + "\n\n" + wizardSteps[nextStep].question
      }]);
    } else {
      // All steps completed, generate launch report
      setMessages(prev => [...prev, {
        type: "assistant",
        content: "Amazing! I have everything I need now. Let me create your personalized Launch Report - this is going to be good! 🚀"
      }]);

      // Generate launch report
      const completeAnswers = { ...userAnswers };
      const report = await generateLaunchReport(completeAnswers, feedbackCompleted || isFirstBizMap);
      setLaunchReport(report);

      // Add final message with report
      setMessages(prev => [...prev, {
        type: "assistant",
        content: report
      }]);
    }
  };

  // Handle post-report conversation
  const handlePostReportMessage = async () => {
    if (!message.trim()) return;
    
    const userMessage = message.trim().toLowerCase();
    
    // Add user message
    setMessages(prev => [...prev, { type: "user", content: message }]);
    setMessage("");

    // Simple keyword-based responses
    let response = "";
    
    if (userMessage.includes('outreach') || userMessage.includes('email')) {
      response = "I'd be happy to help you create an outreach email template! Let me generate one based on your business plan...";
      setTimeout(() => generateAsset('outreach'), 1000);
    } else if (userMessage.includes('social') || userMessage.includes('post')) {
      response = "Great idea! Let me create some social media posts to help promote your launch...";
      setTimeout(() => generateAsset('social'), 1000);
    } else if (userMessage.includes('landing') || userMessage.includes('page')) {
      response = "A landing page is crucial for converting visitors! Let me create an outline for you...";
      setTimeout(() => generateAsset('landing'), 1000);
    } else if (userMessage.includes('sprint') || userMessage.includes('plan') || userMessage.includes('task')) {
      response = "Ready to turn your plan into action? Click the 'Sprint Planner' tab above to create your 90-day sprint!";
    } else if (userMessage.includes('pdf') || userMessage.includes('download') || userMessage.includes('export')) {
      response = "Absolutely! You can download your Launch Report as a professional PDF using the export options below. The PDF includes enhanced formatting, charts, and your success score breakdown.";
    } else {
      response = "I'm here to help you take action on your launch plan! You can:\n\n📧 Generate an outreach email template\n📱 Create social media posts\n🏗️ Get a landing page outline\n📄 Download your report as PDF\n🎯 Create a 90-day sprint plan\n\nWhat would you like to work on?";
    }

    // Add AI response
    setMessages(prev => [...prev, { type: "assistant", content: response }]);
  };

  const handleSendMessage = async (messageOverride?: string) => {
    const messageToSend = messageOverride || message.trim();
    if (currentStep < wizardSteps.length) {
      await handleNextStep(messageToSend);
    } else {
      await handlePostReportMessage();
    }
    if (!messageOverride) setMessage('');
  };

  const handleAudioTranscription = (text: string) => {
    setMessage(text);
    handleSendMessage(text);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'outreach':
        generateAsset('outreach');
        break;
      case 'social':
        generateAsset('social');
        break;
      case 'landing':
        generateAsset('landing');
        break;
      default:
        break;
    }
  };

  const getCurrentPlaceholder = () => {
    if (currentStep < wizardSteps.length) {
      return wizardSteps[currentStep].placeholder;
    }
    return "Type your message...";
  };

  const getProgressPercentage = () => {
    if (currentStep >= wizardSteps.length) return 100;
    return ((currentStep + 1) / wizardSteps.length) * 100;
  };

  const isCompleted = launchReport !== "";

  const getButtonText = () => {
    if (isLoading) return "Generating...";
    if (currentStep < wizardSteps.length) return `Next Step (${currentStep + 2}/${wizardSteps.length})`;
    return "Send";
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Structured data for Dream2Plan
  const structuredData = [
    createSoftwareSchema(),
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "How to Create a Business Plan with AI",
      "description": "Step-by-step guide to creating a comprehensive business plan using AI",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Business Overview",
          "text": "Describe your business idea and what you're planning to create or offer"
        },
        {
          "@type": "HowToStep",
          "name": "Target Market",
          "text": "Identify your ideal customers and who would benefit from your product or service"
        },
        {
          "@type": "HowToStep",
          "name": "Problem Definition",
          "text": "Define the specific problem or pain point your business solves"
        },
        {
          "@type": "HowToStep",
          "name": "Your Solution",
          "text": "Explain your solution and what makes it unique"
        },
        {
          "@type": "HowToStep",
          "name": "Marketing Channels",
          "text": "Plan how you'll reach and attract your first customers"
        },
        {
          "@type": "HowToStep",
          "name": "Pricing & Costs",
          "text": "Determine your pricing strategy and key business costs"
        },
        {
          "@type": "HowToStep",
          "name": "Goals & Timeline",
          "text": "Set achievable goals and timeline for your business launch"
        }
      ]
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'BizMap AI', url: '/bizmap-ai' },
      { name: 'BizMap AI', url: '/bizmap-ai' }
    ])
  ];

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen overflow-hidden">
        <SEO
          title="BizMap AI - Founder Idea Validation + 30-Day Launch OS"
          description="Validate your startup idea with AI-powered market analysis, get a 30-day launch roadmap, and join founder cohorts. Free market validation and personalized sprint planning."
          keywords="AI idea validation, startup validation, 30-day launch, founder OS, MVP builder, startup roadmap, market validation AI"
        url="/bizmap-ai"
          structuredData={structuredData}
        />
        
        <BizmapWallpaper />
        
        <div className="relative z-10 bg-transparent">
          <Navigation />
          
          {/* Feature Tour for New Users */}
          <BizMapTour />
        
        <div className="px-4 sm:px-6 pb-12 sm:pb-16">
          <div className="max-w-7xl mx-auto">
            {/* Modern Hero Section */}
            <BizMapHero />
            
            {/* Spacing between hero and chat */}
            <div className="pt-4 sm:pt-6">

            {/* Business Planning Chat Interface */}
            <div className="w-full">
                {/* Unified Chat Interface Container */}
                <div className="chat-unified-frame responsive-chat-frame mb-6 sm:mb-8 rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl">
                  <div className="flex flex-row h-full">
                    {/* Chat Sidebar */}
                    <ChatSidebar 
                      onSessionSelect={handleSessionSelect}
                      onNewChat={handleNewChat}
                      modeInfo={modeInfo}
                    />

                    {/* Internal Divider */}
                    <div className="w-px bg-border/40 flex-shrink-0" />

                    {/* Enhanced BizMapChat Component with 7 Principles */}
                    <div className="flex-1 min-w-0 h-full overflow-hidden">
                      <BizMapChat
                        wizardSteps={wizardSteps}
                        onStepComplete={(step, answer) => {
                          setCurrentStep(step + 1);
                          setUserAnswers(prev => ({
                            ...prev,
                            [wizardSteps[step].key]: answer
                          }));
                        }}
                        onWizardComplete={(finalAnswers) => {
                          // Save answers to parent state
                          setUserAnswers(prev => ({ ...prev, ...finalAnswers }));
                          
                          // Generate report from Zustand store
                          const report = generateReport();
                          setLaunchReport(report);
                          setShowReport(true);
                          
                          // Trigger Founder OS integration (market validation + roadmap)
                          if (user && currentSessionId) {
                            toast.success('🚀 Launching Founder OS features...');
                            // This will run in the background
                            supabase.functions.invoke('market-validation-engine', {
                              body: {
                                business_idea: finalAnswers.overview || finalAnswers.solution,
                                industry: 'General', // Can extract from answers
                                target_market: finalAnswers.market,
                                session_id: currentSessionId,
                              },
                            }).then(() => {
                              return supabase.functions.invoke('roadmap-task-generator', {
                                body: {
                                  session_id: currentSessionId,
                                  business_idea: finalAnswers.overview || finalAnswers.solution,
                                  industry: 'General',
                                  start_date: new Date().toISOString().split('T')[0],
                                  user_experience_level: 'intermediate',
                                },
                              });
                            }).then(() => {
                              // Fetch the validation score to display Reddit insights
                              supabase
                                .from('market_validation_scores')
                                .select('*')
                                .eq('session_id', currentSessionId)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .single()
                                .then(({ data, error }) => {
                                  if (!error && data) {
                                    setValidationScore(data);
                                  }
                                });
                              
                              toast.success('✅ Founder OS Ready! Check out your roadmap.', {
                                action: {
                                  label: 'View',
                                  onClick: () => window.open('/founder-os', '_blank'),
                                },
                              });
                            }).catch(err => {
                              console.error('Founder OS setup error:', err);
                            });
                          }
                          
                          // Still call backend for success score (existing functionality)
                          generateLaunchReport(finalAnswers);
                        }}
                        currentStep={currentStep}
                        answers={userAnswers}
                        onChatModeReady={(switchToFreeform) => {
                          setSwitchToFreeformFunc(() => switchToFreeform);
                        }}
                        onModeInfoReady={(info) => {
                          setModeInfo(info);
                        }}
                        sessionManagement={useMemo(() => ({
                          currentSessionId,
                          createNewSession,
                          setCurrentSessionId,
                          updateSession
                        }), [currentSessionId, createNewSession, setCurrentSessionId, updateSession])}
                      />
                    </div>
                  </div>
                </div>

                {/* BizMap AI Timeline */}
                <div className="animate-fade-in mb-8 mt-12 sm:mt-16">
                  <InteractiveProgress
                    currentStep={currentStep}
                    totalSteps={wizardSteps.length}
                    stepTitles={wizardSteps.map(step => step.title)}
                    isComplete={!!launchReport}
                  />
                </div>

                {/* Smart Recommendations */}
                {currentStep >= wizardSteps.length && (
                  <div className="mb-6 animate-fade-in">
                    <SmartRecommendations maxRecommendations={2} />
                  </div>
                )}

                {/* Example Conversations Modal */}
                <ExampleConversations
                  open={showExamplesModal}
                  onOpenChange={setShowExamplesModal}
                  onSelectTemplate={(template) => {
                    // Store the prompt in localStorage for BizMapChat to pick up
                    localStorage.setItem('bizmap_example_prompt', template.promptMessage);
                    // Trigger a page refresh or force BizMapChat to reload
                    window.location.reload();
                  }}
                />

                {/* Business Report Display */}
                {showReport && launchReport && (
                  <div className="mb-8">
                    <ReportDisplay 
                      report={launchReport}
                      validationScore={validationScore}
                      onDownloadPDF={() => {
                        // Trigger existing PDF generator
                        const pdfButton = document.querySelector('[data-pdf-download]') as HTMLButtonElement;
                        if (pdfButton) {
                          pdfButton.click();
                        }
                      }}
                    />
                  </div>
                )}

                {/* Founder OS Integration - Show after wizard completion */}
                {currentStep >= wizardSteps.length && (
                  <div className="mb-8 animate-fade-in">
                    <FounderOSIntegration
                      sessionId={currentSessionId}
                      businessIdea={userAnswers.overview}
                      industry={userAnswers.market}
                      targetMarket={userAnswers.market}
                      validationComplete={validationComplete}
                      roadmapComplete={roadmapComplete}
                      onValidate={async () => {
                        if (!user) {
                          toast.error("Please sign in to validate your idea");
                          return;
                        }
                        await runValidation({
                          sessionId: currentSessionId,
                          businessIdea: userAnswers.overview,
                          industry: userAnswers.market,
                          targetMarket: userAnswers.market
                        });
                      }}
                      onGenerateRoadmap={async () => {
                        if (!user) {
                          toast.error("Please sign in to generate your roadmap");
                          return;
                        }
                        await generateRoadmap({
                          sessionId: currentSessionId,
                          businessIdea: userAnswers.overview,
                          industry: userAnswers.market,
                          targetMarket: userAnswers.market
                        });
                      }}
                    />
                  </div>
                )}
             
                 {/* PDF Generator and Download Component - Show only when report is completed */}
                {launchReport && (
                  <div className="mt-6 sm:mt-8 space-y-4 px-4 sm:px-0">
                    <div className="glass-card border border-primary/20 p-4 sm:p-6 rounded-xl">
                      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                        <FileText className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
                        Export Your Launch Report
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <PDFGenerator
                          reportContent={launchReport}
                          businessName={userAnswers.overview?.split(' ').slice(0, 3).join(' ') || 'Business Plan'}
                          userAnswers={userAnswers}
                          successScore={successScore}
                          validationScore={validationScore}
                          className="flex-1"
                        />
                        <ReportDownload 
                          report={launchReport} 
                          title="BizMap Launch Report"
                          className="flex-1" 
                        />
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2 sm:mt-3">
                        💡 Pro tip: The PDF version includes professional formatting, charts, and your success score analysis.
                      </p>
                    </div>
                    
                    {/* Switch to Ask Me Anything Mode Button */}
                    <div className="glass-card border border-accent/20 p-4 sm:p-6 rounded-xl bg-gradient-to-br from-accent/5 via-transparent to-accent/10">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex-1">
                          <h3 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-accent" />
                            Continue Your Journey
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Your launch report is ready! Now switch to Ask Me Anything mode to get personalized advice, refine your strategy, or explore new ideas.
                          </p>
                        </div>
                        <Button 
                          onClick={() => {
                            if (switchToFreeformFunc) {
                              switchToFreeformFunc();
                              toast.success("Switched to Ask Me Anything mode! 🎉");
                            }
                          }}
                          className="gap-2 whitespace-nowrap"
                          size="lg"
                        >
                          <Sparkles className="w-4 h-4" />
                          Ask Me Anything
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
            </div>
          </div>
        </div>
      </div>

      <FeedbackQuestionnaire 
        open={showFeedback}
        onClose={closeFeedback}
        onComplete={(feedbackData) => {
          completeFeedback(feedbackData);
          // Auto-generate the free report after feedback completion
          setTimeout(() => {
            if (currentStep === wizardSteps.length) {
              const completeAnswers = { ...userAnswers };
              generateLaunchReport(completeAnswers, true).then(report => {
                if (report) {
                  setLaunchReport(report);
                  setMessages(prev => [...prev, {
                    type: "assistant", 
                    content: "🎉 Thank you for your feedback! Here's your FREE Launch Report as promised:\n\n" + report
                  }]);
                }
              });
            }
          }, 1000);
        }}
        sessionId={currentSessionId}
      />

      <Footer />

      {/* Demo Mode Signup Gate */}
      {showDemoGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-2xl p-8 text-center animate-fade-in-up">
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-2xl font-semibold font-space-grotesk mb-2">Your plan is taking shape</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Sign up for free to unlock your full BizMap AI plan — market analysis, validation roadmap, 30-day launch sprint, and more.
            </p>
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full rounded-full font-semibold"
                asChild
                onClick={() => trackBizMapDemoConverted({ idea: demoIdea })}
              >
                <Link to={`/signup?return=/bizmap-ai/chat&idea=${encodeURIComponent(demoIdea)}`}>
                  Build My Full Plan — Free
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full rounded-full text-muted-foreground"
                onClick={() => setShowDemoGate(false)}
              >
                Keep exploring the demo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
};

export default BizMapAI;
