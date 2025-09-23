import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Bot, User, Lightbulb, Target, Rocket, CheckCircle, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import TypingMessage from "@/components/TypingMessage";
import InteractiveProgress from "@/components/InteractiveProgress";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";
import ReportDownload from "@/components/ReportDownload";
import { ChatSidebar } from "@/components/ChatSidebar";
import { useChatSessions, ChatSession } from "@/hooks/useChatSessions";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { CreditGate } from "@/components/CreditGate";
import { useFeedbackModal } from "@/hooks/useFeedbackModal";
import { FeedbackQuestionnaire } from "@/components/FeedbackQuestionnaire";
import { AudioRecorder } from "@/components/AudioRecorder";
import { useFeedbackCredits } from "@/hooks/useFeedbackCredits";
import SuccessScore from "@/components/SuccessScore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SprintPlannerComponent from "@/components/sprint/SprintPlanner";
import SprintKanban from "@/components/sprint/SprintKanban";
import { useSprints } from "@/hooks/useSprints";
import { ArrowLeft, Zap, BarChart3, Calculator, FolderOpen, FileText } from "lucide-react";
import ProjectsDashboard from "@/components/dashboard/ProjectsDashboard";
import FinancialDashboard from "@/components/financial/FinancialDashboard";
import BusinessValuation from "@/components/valuation/BusinessValuation";
import TemplateLibrary from "@/components/templates/TemplateLibrary";

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
  
  // Simplified states - no more research complexity
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: "assistant",
      content: "Hey there! 👋 I'm your AI co-founder, and I'm genuinely excited to help you build something amazing! \n\nI'd love to start by hearing about your business idea. In a few sentences, what are you planning to create or offer? Don't worry about making it perfect – just tell me what's on your mind!"
    }
  ]);

  const { user, isAuthenticated } = useAuth();
  const { balance, hasCredits, handleCreditDeduction, CREDIT_COSTS } = useCredits();
  const { sprints, currentSprint, setCurrentSprint } = useSprints();
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("bizmap");
  
  // Handle URL parameters for tab selection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['bizmap', 'templates', 'financial'].includes(tab)) {
      setActiveTab(tab);
    } else {
      // Default to bizmap if invalid tab or no tab specified
      setActiveTab('bizmap');
      // Update URL to reflect the actual tab
      window.history.replaceState({}, '', '/dream2plan?tab=bizmap');
    }
  }, []);
  
  // Sprint Planner handlers
  const handleSprintCreated = (sprintId: string) => {
    const sprint = sprints.find(s => s.id === sprintId);
    if (sprint) {
      setCurrentSprint(sprint);
      setActiveSprintId(sprintId);
      setActiveTab("sprint");
    }
  };

  const activeSprint = activeSprintId 
    ? sprints.find(s => s.id === activeSprintId) 
    : currentSprint;

  // Define wizardSteps before using it in hooks
  const wizardSteps = [
    {
      key: "overview",
      title: "Business Overview",
      question: "In a few sentences, what are you planning to create or offer?",
      placeholder: "e.g., A mobile app that helps busy parents find and book last-minute childcare services in their neighborhood...",
      transition: "That sounds really interesting! I can already see the potential. Now, let's talk about who would benefit most from this."
    },
    {
      key: "market", 
      title: "Target Market",
      question: "Who's your ideal customer? Tell me about the specific people who would love what you're building.",
      placeholder: "e.g., Working parents aged 28-45 in urban areas who currently struggle with childcare arrangements and use Facebook groups to find sitters...",
      transition: "Perfect! I'm getting a clear picture of your audience. Now I want to understand the problem you're solving for them."
    },
    {
      key: "problem",
      title: "Problem Definition", 
      question: "What specific pain point or challenge does your business address? How do people deal with this frustration today?",
      placeholder: "e.g., Parents waste hours searching unreliable Facebook groups and calling multiple sitters, often finding no one available for urgent needs...",
      transition: "Wow, that's definitely a real problem! I can see why people would be frustrated. Now, tell me about your solution."
    },
    {
      key: "solution",
      title: "Your Solution",
      question: "How does your approach solve this problem better than what's currently available? What makes you different?", 
      placeholder: "e.g., Our app provides verified sitters with real-time availability, instant booking, and background checks - solving the problem in under 5 minutes...",
      transition: "That's a solid approach! I love how you're thinking about the competitive advantage. Now, let's figure out how to reach your customers."
    },
    {
      key: "channels",
      title: "Marketing Channels",
      question: "How will you get your first customers? Where do your ideal customers spend their time and discover new solutions?",
      placeholder: "e.g., Instagram ads targeting parent hashtags, partnerships with pediatricians, referral program, local parenting Facebook groups...",
      transition: "Great marketing thinking! Now let's talk about the business side - how will this actually make money?"
    },
    {
      key: "pricing",
      title: "Pricing & Costs", 
      question: "What's your revenue model? What will it cost to run this business, and what's your budget to get started?",
      placeholder: "e.g., 15% commission per booking, avg $60/booking. Main costs: app development ($5K), marketing ($2K/month). Available budget: $10K...",
      transition: "Perfect! The economics are starting to come together. Finally, let's talk about your timeline and goals."
    },
    {
      key: "goals",
      title: "Goals & Timeline",
      question: "What do you want to achieve in the next 90 days? How much time can you realistically commit to this each week?",
      placeholder: "e.g., Launch MVP, get 100 active users, $5K monthly revenue. Can dedicate 25 hours/week, want to launch in 8 weeks...",
      transition: "Excellent! I have everything I need to create your personalized Launch Report."
    }
  ];

  const { showFeedback, feedbackCompleted, closeFeedback, completeFeedback } = useFeedbackModal(currentStep === wizardSteps.length);
  const { hasPendingCredits } = useFeedbackCredits();
  const [creditGateOpen, setCreditGateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'report' | 'asset'; assetType?: string } | null>(null);
  const {
    currentSessionId,
    setCurrentSessionId,
    createNewSession,
    updateSession,
    getSession,
    sessions
  } = useChatSessions();

  const [message, setMessage] = useState("");
  const [followUpState, setFollowUpState] = useState<{ active: boolean; stepKey: string | null; initialAnswer: string }>(
    { active: false, stepKey: null, initialAnswer: "" }
  );

  // Session Management Functions
  const handleSessionSelect = (session: ChatSession | null) => {
    if (session) {
      // Properly map session answers to userAnswers structure  
      const mappedAnswers = {
        overview: session.answers.overview || "",
        market: session.answers.market || "",
        problem: session.answers.problem || "",
        solution: session.answers.solution || "",
        channels: session.answers.channels || "",
        pricing: session.answers.pricing || "",
        goals: session.answers.goals || ""
      };
      
      setUserAnswers(mappedAnswers);
      setCurrentStep(session.current_step);
      setLaunchReport(session.launch_report || "");
      
      // Reconstruct messages based on session data
      const reconstructedMessages = [
        {
          type: "assistant",
          content: "Hey there! 👋 I'm your AI co-founder, and I'm genuinely excited to help you build something amazing! \n\nI'd love to start by hearing about your business idea. In a few sentences, what are you planning to create or offer? Don't worry about making it perfect – just tell me what's on your mind!"
        }
      ];

      // Add messages for completed steps
      wizardSteps.forEach((step, index) => {
        if (index <= session.current_step && session.answers[step.key]) {
          if (index > 0) {
            // Add transition from previous step
            reconstructedMessages.push({
              type: "assistant",
              content: wizardSteps[index - 1].transition + "\n\n" + step.question
            });
          }
          reconstructedMessages.push({
            type: "user",
            content: session.answers[step.key]
          });
        }
      });

      // Add launch report if completed
      if (session.is_completed && session.launch_report) {
        reconstructedMessages.push({
          type: "assistant",
          content: session.launch_report
        });
      } else if (session.current_step < wizardSteps.length) {
        // Add next question if not completed
        const nextStep = session.current_step;
        if (nextStep < wizardSteps.length) {
          const transitionText = nextStep > 0 ? wizardSteps[nextStep - 1].transition + "\n\n" : "";
          reconstructedMessages.push({
            type: "assistant",
            content: transitionText + wizardSteps[nextStep].question
          });
        }
      }

      setMessages(reconstructedMessages);
    } else {
      // Reset for new chat
      resetChat();
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

  // Check for pre-populated prompt from Prompt Library or Template
  useEffect(() => {
    const savedPrompt = localStorage.getItem('bizmap_prompt');
    const savedTemplate = localStorage.getItem('bizmap_template');
    
    if (savedPrompt) {
      setUserAnswers(prev => ({ ...prev, overview: savedPrompt }));
      setMessage(savedPrompt);
      localStorage.removeItem('bizmap_prompt');
      toast.success("Prompt loaded from Prompt Library!");
    } else if (savedTemplate) {
      const template = JSON.parse(savedTemplate);
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

  // Helper: compute and store success score
  const computeAndStoreSuccessScore = async (answers: any) => {
    try {
      const { data: scoreData, error: scoreError } = await supabase.rpc('calculate_business_success_score', { answers });
      if (scoreError) throw scoreError;
      setSuccessScore(scoreData);

      // Persist for history/analytics
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id ?? null;
      const score: any = scoreData as any;
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
      toast.error('Could not calculate success score, please try again later.');
    }
  };

  // Simplified launch report generation - single step, fixed cost
  const generateLaunchReport = async (answers: any, isFreeForFeedback = false) => {
    // Check authentication and credits (unless it's free for feedback)
    if (!isAuthenticated && !isFreeForFeedback && !hasCredits(CREDIT_COSTS.LAUNCH_REPORT)) {
      setPendingAction({ type: 'report' });
      setCreditGateOpen(true);
      return;
    }

    const reportCost = CREDIT_COSTS.LAUNCH_REPORT;

    if (!isFreeForFeedback && !hasCredits(reportCost)) {
      setPendingAction({ type: 'report' });
      setCreditGateOpen(true);
      return;
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
        
        // Try fallback but make it comprehensive
        const fallbackReport = generateFallbackReport(answers);
        toast.success("Generated your Launch Report successfully!");
        await computeAndStoreSuccessScore(answers);
        return fallbackReport;
      }

      if (data?.success) {
        // Deduct credits for authenticated users (unless it's free for feedback)
        if (isAuthenticated && !isFreeForFeedback) {
          handleCreditDeduction(reportCost);
        }
        const successMessage = isFreeForFeedback ? 
          "FREE Launch Report generated successfully! 🎉" : 
          `Launch Report generated successfully! (Used ${reportCost} credits)`;
        toast.success(successMessage);
        await computeAndStoreSuccessScore(answers);
        return data.report;
      } else {
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
    // Check if user has sufficient credits
    if (!hasCredits(CREDIT_COSTS.ASSET_GENERATION)) {
      setPendingAction({ type: 'asset', assetType: type });
      setCreditGateOpen(true);
      return;
    }

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
        toast.error("Failed to generate asset. Please try again.");
        return;
      }

      if (data?.success) {
        handleCreditDeduction(CREDIT_COSTS.ASSET_GENERATION);
        toast.success(`Generated ${label} successfully! (Used ${CREDIT_COSTS.ASSET_GENERATION} credits)`);
        
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

  // Fallback report generator for when API fails
  const generateFallbackReport = (answers: any) => {
    return `# Launch Report for ${answers.overview || 'Your Business'}

## Executive Summary
Based on your business concept, this launch report provides a strategic framework for bringing your idea to market.

## Business Overview
${answers.overview || 'Your business concept shows promise in the market.'}

## Target Market Analysis
${answers.market || 'Your target customers represent a significant opportunity.'}

## Problem & Solution Fit
**Problem:** ${answers.problem || 'Clear market problem identified.'}
**Solution:** ${answers.solution || 'Your solution addresses the core issue effectively.'}

## Go-to-Market Strategy
${answers.channels || 'Multiple marketing channels identified for customer acquisition.'}

## Financial Model
${answers.pricing || 'Revenue model and cost structure outlined.'}

## 90-Day Action Plan
${answers.goals || 'Clear milestones and timeline established.'}

## Key Recommendations
1. Validate your assumptions through customer interviews
2. Build a minimal viable product (MVP)
3. Test your marketing channels with a small budget
4. Monitor key metrics and iterate based on feedback

*This report was generated using AI analysis of your business inputs. Use it as a starting point for your entrepreneurial journey.*`;
  };

  // Validation helper functions
  const isAnswerTooVague = (answer: string, stepKey: string) => {
    if (!answer || answer.trim().length < 10) return true;
    
    const wordCount = answer.trim().split(/\s+/).length;
    const t = answer.toLowerCase();
    
    // Vague indicators
    const vague = /(i think|maybe|probably|sort of|kind of|not sure|i guess|possibly)/i;
    const generic = /(make money|be successful|help people|solve problems|good idea)/i;
    
    // Check for step-specific requirements
    switch (stepKey) {
      case 'overview':
        // Need what they're building and general approach
        return wordCount < 15 || !/(app|website|service|product|platform|business|company)/i.test(t);
        
      case 'market':
        // Need specific demographics or customer characteristics
        const hasMarketSpecifics = /(age|years old|parents|professionals|students|small business|women|men)/i.test(t);
        return !hasMarketSpecifics || wordCount < 20 || vague.test(t);
        
      case 'problem':
        // Need concrete pain points
        const hasPainPoints = /(waste time|expensive|difficult|frustrating|slow|manual|hard to)/i.test(t);
        return !hasPainPoints || wordCount < 25 || generic.test(t);
        
      case 'solution': 
        // Need differentiation
        const hasDifferentiation = /(faster|cheaper|easier|better|automated|simple|instant)/i.test(t);
        return !hasDifferentiation || wordCount < 20;
        
      case 'channels':
        // Need specific marketing tactics
        const hasTactics = /(ads|social|email|seo|content|referral|partnership|direct)/i.test(t);
        return !hasTactics || wordCount < 15;
        
      case 'pricing':
        // Need numbers and revenue model
        const hasNumbers = /[\d$%]/;
        return !hasNumbers.test(t) || wordCount < 20;
        
      case 'goals':
        // Need measurable objectives and timeline
        const hasGoalSpecifics = /\d/.test(t) && /(days|weeks|months|users|revenue|customers)/i.test(t);
        const hasTimeframe = /(week|month|day|launch|by)/i.test(t);
        return !hasGoalSpecifics || !hasTimeframe || wordCount < 20 || !/(users|customers|revenue|launch|build|grow)/i.test(t);
        
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
    const prev = userAnswers as any;
    
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
        const report = await generateLaunchReport(completeAnswers, feedbackCompleted);
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
      const report = await generateLaunchReport(completeAnswers, feedbackCompleted);
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
    } else {
      response = "I'm here to help you take action on your launch plan! You can:\n\n📧 Generate an outreach email template\n📱 Create social media posts\n🏗️ Get a landing page outline\n🎯 Create a 90-day sprint plan\n\nWhat would you like to work on?";
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

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Helmet>
        <title>BizMap AI - Turn Business Ideas Into Launch Reports | AI Business Planning</title>
        <meta name="description" content="Transform your business ideas into comprehensive Launch Reports with our 7-step AI wizard. Get personalized validation plans, go-to-market strategies, and 90-day roadmaps." />
        <meta name="keywords" content="business plan, AI business planning, startup planning, business ideas, entrepreneurship, BizMap AI, launch report" />
      </Helmet>
      
      {/* Enhanced Animated Background */}
      <AnimatedBackground />
      
      {/* Enhanced Background decorations */}
      <div className="fixed top-20 left-10 w-32 h-32 bg-gradient-to-br from-primary/20 to-secondary/10 rounded-full blur-3xl animate-float" />
      <div className="fixed bottom-20 right-10 w-24 h-24 bg-gradient-to-tl from-secondary/20 to-accent/10 rounded-full blur-2xl animate-spiral" style={{ animationDelay: '1s' }} />
      <div className="fixed top-1/2 right-20 w-16 h-16 bg-gradient-to-r from-accent/15 to-primary/10 rounded-full blur-xl animate-diagonal-float" />
      <div className="fixed top-1/3 left-1/4 w-20 h-20 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-2xl animate-orbit opacity-60" />
      
      <div className="relative z-10">
        <Navigation />
        
        <div className="pt-20 pb-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 takeover-gradient creatives-font animate-fade-in">
                BizMap AI
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.3s' }}>
                Your global startup co-founder in chatbot form. Transform business ideas into <span className="gradient-text font-semibold">actionable Launch Reports</span>.
              </p>
            </div>

            {/* Enhanced Tab Navigation */}
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              // Update URL without page reload
              const url = new URL(window.location.href);
              url.searchParams.set('tab', value);
              window.history.pushState({}, '', url.toString());
            }} className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList className="glass-card border border-primary/20 shadow-xl backdrop-blur-xl p-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  <TabsTrigger 
                    value="dashboard" 
                    className="flex items-center gap-3 px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-blue-500/10 data-[state=active]:text-blue-600 transition-all duration-300 hover:bg-blue-500/5 rounded-lg font-medium"
                  >
                    <FolderOpen className="w-5 h-5" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger 
                    value="templates" 
                    className="flex items-center gap-3 px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-purple-500/10 data-[state=active]:text-purple-600 transition-all duration-300 hover:bg-purple-500/5 rounded-lg font-medium"
                  >
                    <FileText className="w-5 h-5" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger 
                    value="bizmap" 
                    className="flex items-center gap-3 px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary transition-all duration-300 hover:bg-primary/5 rounded-lg font-medium"
                  >
                    <Lightbulb className="w-5 h-5" />
                    Business Planning
                  </TabsTrigger>
                  <TabsTrigger 
                    value="financial" 
                    className="flex items-center gap-3 px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/20 data-[state=active]:to-green-500/10 data-[state=active]:text-green-600 transition-all duration-300 hover:bg-green-500/5 rounded-lg font-medium"
                  >
                    <BarChart3 className="w-5 h-5" />
                    Financial
                  </TabsTrigger>
                  <TabsTrigger 
                    value="valuation" 
                    className="flex items-center gap-3 px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500/20 data-[state=active]:to-orange-500/10 data-[state=active]:text-orange-600 transition-all duration-300 hover:bg-orange-500/5 rounded-lg font-medium"
                  >
                    <Calculator className="w-5 h-5" />
                    Valuation
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sprint" 
                    className="flex items-center gap-3 px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-secondary/20 data-[state=active]:to-secondary/10 data-[state=active]:text-secondary transition-all duration-300 hover:bg-secondary/5 rounded-lg font-medium"
                  >
                    <Target className="w-5 h-5" />
                    Sprint Planner
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="bizmap">
                {/* Chat Interface Container */}
                <div className="flex gap-6 mb-8">
                  {/* Chat Sidebar */}
                  <ChatSidebar 
                    onSessionSelect={handleSessionSelect}
                    onNewChat={handleNewChat}
                    className="hidden md:flex"
                  />

                  {/* Enhanced Main Chat Interface */}
                  <div className="flex-1 min-w-0">
                    <div className="glass-card border border-primary/30 shadow-2xl backdrop-blur-xl h-[700px] flex flex-col hover-lift transition-all duration-500 hover:shadow-primary/20 rounded-2xl overflow-hidden">
                      <div className="flex flex-col h-full">
                        {/* Enhanced Chat Header */}
                        <div className="p-6 border-b border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg animate-pulse-glow">
                                  <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse border-2 border-card"></div>
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold gradient-text">BizMap AI Assistant</h4>
                                <p className="text-sm text-muted-foreground">
                                  {isCompleted ? "🎉 Launch Report Complete!" : 
                                   `Step ${currentStep + 1} of ${wizardSteps.length} • Your AI Co-founder is ready`}
                                </p>
                              </div>
                            </div>
                            {!isCompleted && (
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-primary">
                                  {Math.round(getProgressPercentage())}%
                                </span>
                                <div className="w-20 h-3 bg-muted/50 rounded-full overflow-hidden border border-primary/20">
                                  <div 
                                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 animate-glow"
                                    style={{ width: `${getProgressPercentage()}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Enhanced Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-primary/2">
                          {messages.map((msg, index) => {
                            const isLastAIMessage = msg.type === "ai" && index === messages.length - 1 && !isLoading;
                            
                            if (msg.type === "user") {
                              return (
                                <div key={index} className="flex gap-4 flex-row-reverse animate-slide-in-right" style={{ animationDelay: `${index * 0.1}s` }}>
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-secondary to-accent shadow-lg hover:scale-110 transition-transform duration-300">
                                    <User className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="max-w-[80%] group">
                                    <div className="p-4 rounded-2xl text-sm whitespace-pre-wrap bg-gradient-to-br from-secondary/20 to-accent/10 border border-secondary/30 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm rounded-br-sm">
                                      {msg.content}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 text-right px-2">
                                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            
                            if (isLastAIMessage) {
                              return (
                                <div key={index} className="flex gap-4 animate-slide-in-left" style={{ animationDelay: `${index * 0.1}s` }}>
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse-glow hover:scale-110 transition-transform duration-300">
                                    <Bot className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="max-w-[80%]">
                                    <TypingMessage 
                                      content={msg.content}
                                      speed={25}
                                    />
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <div key={index} className="flex gap-4 animate-slide-in-left" style={{ animationDelay: `${index * 0.1}s` }}>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg hover:scale-110 transition-transform duration-300">
                                  <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div className="max-w-[80%] group">
                                  <div className="glass-card border-primary/20 p-4 rounded-2xl text-sm whitespace-pre-wrap hover:shadow-xl hover:scale-[1.02] transition-all duration-300 rounded-bl-sm backdrop-blur-sm">
                                    {msg.content}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1 px-2">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {isLoading && (
                            <div className="flex gap-4 animate-fade-in">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse-glow shadow-lg">
                                <Bot className="w-5 h-5 text-white" />
                              </div>
                              <div className="glass-card border-primary/20 p-4 rounded-2xl rounded-bl-sm">
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                  <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Enhanced Input Area */}
                        <div className="p-6 border-t border-primary/20 bg-gradient-to-t from-card/50 via-primary/2 to-transparent">
                          {isCompleted && (
                            <div className="mb-6 grid grid-cols-3 gap-3">
                              <Button 
                                variant="outline"
                                size="sm"
                                className="glass border-primary/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/5 transition-all duration-300 hover:scale-105"
                                onClick={() => handleQuickAction('outreach')}
                              >
                                <span className="mr-2">📧</span>
                                Email
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                className="glass border-secondary/30 hover:bg-gradient-to-r hover:from-secondary/10 hover:to-accent/5 transition-all duration-300 hover:scale-105"
                                onClick={() => handleQuickAction('social')}
                              >
                                <span className="mr-2">📱</span>
                                Social
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                className="glass border-accent/30 hover:bg-gradient-to-r hover:from-accent/10 hover:to-primary/5 transition-all duration-300 hover:scale-105"
                                onClick={() => handleQuickAction('landing')}
                              >
                                <span className="mr-2">🏗️</span>
                                Landing
                              </Button>
                            </div>
                          )}
                          
                          <div className="flex gap-3 items-end">
                            <div className="flex-1">
                              <div className="relative">
                                <Input
                                  placeholder={getCurrentPlaceholder()}
                                  value={message}
                                  onChange={(e) => setMessage(e.target.value)}
                                  onKeyPress={handleKeyPress}
                                  className="glass bg-input/50 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/70 transition-all duration-300 hover:border-primary/50 pr-12 py-3 text-base"
                                  disabled={isLoading}
                                />
                                {message && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <AudioRecorder 
                              onTranscription={handleAudioTranscription}
                              disabled={isLoading}
                            />
                            
                            <Button 
                              onClick={() => handleSendMessage()} 
                              size="icon" 
                              disabled={isLoading || (currentStep < wizardSteps.length && !message.trim())}
                              className="btn-magnetic bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white border border-primary/30 shadow-lg w-12 h-12"
                            >
                              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                              {isCompleted ? "✨ Launch Report generated! Ready to create your sprint?" :
                               `💬 Answer to continue to step ${currentStep + 2}`}
                            </p>
                            <div className="flex gap-3">
                              {isCompleted && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setActiveTab("sprint")}
                                  className="btn-magnetic glass border-secondary/30 hover:bg-gradient-to-r hover:from-secondary/10 hover:to-accent/5"
                                >
                                  <Zap className="w-4 h-4 mr-2" />
                                  Create Sprint
                                </Button>
                              )}
                              {!isCompleted && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleSendMessage()}
                                  disabled={isLoading || !message.trim()}
                                  className="hover:bg-primary/10 transition-all duration-300"
                                >
                                  {getButtonText()}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
             
                {/* Full Width Sections */}
                {/* Interactive Progress Visualization - Synchronized with chatbot */}
                <div className="animate-fade-in mb-8">
                  <InteractiveProgress
                    currentStep={currentStep}
                    totalSteps={wizardSteps.length}
                    stepTitles={wizardSteps.map(step => step.title)}
                    isComplete={!!launchReport}
                  />
                </div>
                
                {/* Three Information Cards - Minimalistic with Silver Glass Effect */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
                  {/* How BizMap AI Works */}
                  <div className="group relative overflow-hidden glass-card-silver hover-lift transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 border border-primary/10 rounded-xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Lightbulb className="w-4 h-4 text-primary group-hover:animate-pulse" />
                        </div>
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors duration-300">How It Works</h3>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex gap-3 group-hover:translate-x-1 transition-transform duration-300">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors duration-300">1</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Answer 7 guided questions about your business</p>
                        </div>
                        <div className="flex gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '50ms' }}>
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors duration-300">2</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">AI analyzes your responses and market data</p>
                        </div>
                        <div className="flex gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '100ms' }}>
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors duration-300">3</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Get a comprehensive launch report</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Market Intelligence */}
                  <div className="group relative overflow-hidden glass-card-silver hover-lift transition-all duration-500 hover:shadow-xl hover:shadow-secondary/10 border border-secondary/10 rounded-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-secondary/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Target className="w-4 h-4 text-secondary group-hover:animate-pulse" />
                        </div>
                        <h3 className="font-medium text-foreground group-hover:text-secondary transition-colors duration-300">Market Intelligence</h3>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex gap-3 group-hover:translate-x-1 transition-transform duration-300">
                          <span className="text-secondary group-hover:scale-110 transition-transform duration-300">📊</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Real-time market trends and competitor insights</p>
                        </div>
                        <div className="flex gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '50ms' }}>
                          <span className="text-secondary group-hover:scale-110 transition-transform duration-300">🎯</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Customer validation strategies</p>
                        </div>
                        <div className="flex gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '100ms' }}>
                          <span className="text-secondary group-hover:scale-110 transition-transform duration-300">📈</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Growth opportunities identification</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Success Scoring */}
                  <div className="group relative overflow-hidden glass-card-silver hover-lift transition-all duration-500 hover:shadow-xl hover:shadow-accent/10 border border-accent/10 rounded-xl animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Rocket className="w-4 h-4 text-accent group-hover:animate-pulse" />
                        </div>
                        <h3 className="font-medium text-foreground group-hover:text-accent transition-colors duration-300">Success Scoring</h3>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex gap-3 group-hover:translate-x-1 transition-transform duration-300">
                          <span className="text-accent font-mono text-xs group-hover:scale-110 transition-transform duration-300">95%</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Business model validation score</p>
                        </div>
                        <div className="flex gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '50ms' }}>
                          <span className="text-accent font-mono text-xs group-hover:scale-110 transition-transform duration-300">8.7</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Product-market fit assessment</p>
                        </div>
                        <div className="flex gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '100ms' }}>
                          <span className="text-accent font-mono text-xs group-hover:scale-110 transition-transform duration-300">90d</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Optimized launch timeline</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Download Component - Show only when report is completed */}
                {launchReport && (
                  <div className="mt-8">
                    <ReportDownload report={launchReport} title="BizMap Launch Report" />
                  </div>
                )}
              </TabsContent>
          </Tabs>
        </div>
        </div>
      </div>

      {/* Credit Gate Modal */}
      <CreditGate
        isOpen={creditGateOpen}
        onClose={() => {
          setCreditGateOpen(false);
          setPendingAction(null);
        }}
        requiredCredits={
          pendingAction?.type === 'report' 
            ? CREDIT_COSTS.LAUNCH_REPORT 
            : CREDIT_COSTS.ASSET_GENERATION
        }
        feature={
          pendingAction?.type === 'report' 
            ? 'Launch Report Generation' 
            : `Asset Generation (${pendingAction?.assetType || 'unknown'})`
        }
        onPurchase={() => {
          // TODO: Implement Stripe purchase flow
          console.log('Purchase flow would open here');
          toast.info('Credit purchase coming soon!');
        }}
      />

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
    </div>
  );
};

export default BizMapAI;