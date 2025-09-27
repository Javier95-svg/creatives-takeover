import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Bot, User, Lightbulb, Target, Rocket, CheckCircle, Loader2, FileText } from "lucide-react";
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
import { ArrowLeft, Zap } from "lucide-react";
import PDFGenerator from "@/components/PDFGenerator";
import ChatbotWidget from "@/components/ChatbotWidget";

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
"🚀 Excited to share [business name] - helping [target market] [key benefit]. Early users are seeing [specific result]. Who else struggles with [problem]? #startup #entrepreneurship"

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
        
        <div className="pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 takeover-gradient creatives-font animate-fade-in">
                BizMap AI
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Your global startup co-founder in chatbot form. Transform business ideas into <span className="gradient-text font-semibold">actionable Launch Reports</span>.
              </p>
            </div>

            {/* Enhanced Tab Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-center mb-6 sm:mb-8">
                <TabsList className="glass-card border border-primary/20 shadow-xl backdrop-blur-xl p-1 sm:p-2 animate-fade-in w-full sm:w-auto max-w-md sm:max-w-none" style={{ animationDelay: '0.5s' }}>
                  <TabsTrigger 
                    value="bizmap" 
                    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary transition-all duration-300 hover:bg-primary/5 rounded-lg font-medium text-xs sm:text-sm"
                  >
                    <Lightbulb className="w-4 sm:w-5 h-4 sm:h-5" />
                    <span className="hidden sm:inline">Business Planning</span>
                    <span className="sm:hidden">Planning</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sprint" 
                    className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-secondary/20 data-[state=active]:to-secondary/10 data-[state=active]:text-secondary transition-all duration-300 hover:bg-secondary/5 rounded-lg font-medium text-xs sm:text-sm"
                  >
                    <Target className="w-4 sm:w-5 h-4 sm:h-5" />
                    <span className="hidden sm:inline">Sprint Planner</span>
                    <span className="sm:hidden">Sprint</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="bizmap">
                {/* Chat Interface Container */}
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 mb-6 sm:mb-8">
                  {/* Chat Sidebar */}
                  <ChatSidebar 
                    onSessionSelect={handleSessionSelect}
                    onNewChat={handleNewChat}
                    className="hidden lg:flex"
                  />

                  {/* Enhanced Main Chat Interface */}
                  <div className="flex-1 min-w-0">
                    <div className="glass-card border border-primary/30 shadow-2xl backdrop-blur-xl h-[500px] sm:h-[600px] lg:h-[700px] flex flex-col hover-lift transition-all duration-500 hover:shadow-primary/20 rounded-xl lg:rounded-2xl overflow-hidden">
                      <div className="flex flex-col h-full">
                        {/* Enhanced Chat Header */}
                        <div className="p-3 sm:p-4 lg:p-6 border-b border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                              <div className="relative">
                                <div className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-lg animate-pulse-glow">
                                  <Bot className="w-4 sm:w-5 lg:w-6 h-4 sm:h-5 lg:h-6 text-white" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-3 sm:w-4 h-3 sm:h-4 bg-green-400 rounded-full animate-pulse border-2 border-card"></div>
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm sm:text-base lg:text-lg font-semibold gradient-text truncate">BizMap AI Assistant</h4>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {isCompleted ? "🎉 Launch Report Complete!" : 
                                   `Step ${currentStep + 1} of ${wizardSteps.length} • Your AI Co-founder`}
                                </p>
                              </div>
                            </div>
                            {!isCompleted && (
                              <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-xs sm:text-sm font-medium text-primary">
                                  {Math.round(getProgressPercentage())}%
                                </span>
                                <div className="w-12 sm:w-16 lg:w-20 h-2 sm:h-3 bg-muted/50 rounded-full overflow-hidden border border-primary/20">
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
                        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 bg-gradient-to-b from-transparent to-primary/2">
                          {messages.map((msg, index) => {
                            const isLastAIMessage = msg.type === "ai" && index === messages.length - 1 && !isLoading;
                            
                            if (msg.type === "user") {
                              return (
                                <div key={index} className="flex gap-2 sm:gap-3 lg:gap-4 flex-row-reverse animate-slide-in-right" style={{ animationDelay: `${index * 0.1}s` }}>
                                  <div className="w-8 sm:w-9 lg:w-10 h-8 sm:h-9 lg:h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-secondary to-accent shadow-lg hover:scale-110 transition-transform duration-300">
                                    <User className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                                  </div>
                                  <div className="max-w-[85%] sm:max-w-[80%] group">
                                    <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm whitespace-pre-wrap bg-gradient-to-br from-secondary/20 to-accent/10 border border-secondary/30 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm rounded-br-sm">
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
                                <div key={index} className="flex gap-2 sm:gap-3 lg:gap-4 animate-slide-in-left" style={{ animationDelay: `${index * 0.1}s` }}>
                                  <div className="w-8 sm:w-9 lg:w-10 h-8 sm:h-9 lg:h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse-glow hover:scale-110 transition-transform duration-300">
                                    <Bot className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                                  </div>
                                  <div className="max-w-[85%] sm:max-w-[80%]">
                                    <TypingMessage 
                                      content={msg.content}
                                      speed={25}
                                    />
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <div key={index} className="flex gap-2 sm:gap-3 lg:gap-4 animate-slide-in-left" style={{ animationDelay: `${index * 0.1}s` }}>
                                <div className="w-8 sm:w-9 lg:w-10 h-8 sm:h-9 lg:h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg hover:scale-110 transition-transform duration-300">
                                  <Bot className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                                </div>
                                <div className="max-w-[85%] sm:max-w-[80%] group">
                                  <div className="glass-card border-primary/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm whitespace-pre-wrap hover:shadow-xl hover:scale-[1.02] transition-all duration-300 rounded-bl-sm backdrop-blur-sm">
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
                            <div className="flex gap-2 sm:gap-3 lg:gap-4 animate-fade-in">
                              <div className="w-8 sm:w-9 lg:w-10 h-8 sm:h-9 lg:h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse-glow shadow-lg">
                                <Bot className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                              </div>
                              <div className="glass-card border-primary/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl rounded-bl-sm">
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-3 sm:w-4 h-3 sm:h-4 animate-spin text-primary" />
                                  <div className="flex space-x-1">
                                    <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-primary rounded-full animate-pulse"></div>
                                    <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Enhanced Input Area */}
                        <div className="p-3 sm:p-4 lg:p-6 border-t border-primary/20 bg-gradient-to-t from-card/50 via-primary/2 to-transparent">
                          {isCompleted && (
                            <div className="mb-4 sm:mb-6 grid grid-cols-3 gap-2 sm:gap-3">
                              <Button 
                                variant="outline"
                                size="sm"
                                className="glass border-primary/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/5 transition-all duration-300 hover:scale-105 text-xs sm:text-sm p-2 sm:p-3"
                                onClick={() => handleQuickAction('outreach')}
                              >
                                <span className="mr-1 sm:mr-2">📧</span>
                                Email
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                className="glass border-secondary/30 hover:bg-gradient-to-r hover:from-secondary/10 hover:to-accent/5 transition-all duration-300 hover:scale-105 text-xs sm:text-sm p-2 sm:p-3"
                                onClick={() => handleQuickAction('social')}
                              >
                                <span className="mr-1 sm:mr-2">📱</span>
                                Social
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                className="glass border-accent/30 hover:bg-gradient-to-r hover:from-accent/10 hover:to-primary/5 transition-all duration-300 hover:scale-105 text-xs sm:text-sm p-2 sm:p-3"
                                onClick={() => handleQuickAction('landing')}
                              >
                                <span className="mr-1 sm:mr-2">🏗️</span>
                                Landing
                              </Button>
                            </div>
                          )}
                          
                          <div className="flex gap-2 sm:gap-3 items-end">
                            <div className="flex-1">
                              <div className="relative">
                                <Input
                                  placeholder={getCurrentPlaceholder()}
                                  value={message}
                                  onChange={(e) => setMessage(e.target.value)}
                                  onKeyPress={handleKeyPress}
                                  className="glass bg-input/50 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/70 transition-all duration-300 hover:border-primary/50 pr-10 sm:pr-12 py-2 sm:py-3 text-sm sm:text-base"
                                  disabled={isLoading}
                                />
                                {message && (
                                  <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
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
                              className="btn-magnetic bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white border border-primary/30 shadow-lg w-10 sm:w-12 h-10 sm:h-12"
                            >
                              {isLoading ? <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" /> : <Send className="w-4 sm:w-5 h-4 sm:h-5" />}
                            </Button>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 sm:mt-4 gap-2 sm:gap-0">
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {isCompleted ? "✨ Launch Report generated! Ready to create your sprint?" :
                               `💬 Answer to continue to step ${currentStep + 2}`}
                            </p>
                            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                              {isCompleted && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setActiveTab("sprint")}
                                  className="btn-magnetic glass border-secondary/30 hover:bg-gradient-to-r hover:from-secondary/10 hover:to-accent/5 flex-1 sm:flex-none"
                                >
                                  <Zap className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />
                                  Create Sprint
                                </Button>
                              )}
                              {!isCompleted && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleSendMessage()}
                                  disabled={isLoading || !message.trim()}
                                  className="hover:bg-primary/10 transition-all duration-300 flex-1 sm:flex-none"
                                >
                                  {getButtonText()}
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {!isCompleted && currentStep < wizardSteps.length && (
                            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <div className="flex items-start gap-2 sm:gap-3">
                                <div className="w-4 sm:w-5 h-4 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <span className="text-white text-xs font-bold">🧠</span>
                                </div>
                                <div className="text-xs sm:text-sm">
                                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                                    Enhanced AI Validation Active
                                  </p>
                                  <p className="text-blue-700 dark:text-blue-200">
                                    Our improved AI will detect vague answers and ask clarifying questions to help you create a more detailed business plan.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
             
                {/* Full Width Sections */}
                {/* Interactive Progress Visualization - Synchronized with chatbot */}
                <div className="animate-fade-in mb-6 sm:mb-8">
                  <InteractiveProgress
                    currentStep={currentStep}
                    totalSteps={wizardSteps.length}
                    stepTitles={wizardSteps.map(step => step.title)}
                    isComplete={!!launchReport}
                  />
                </div>
                
                {/* Three Information Cards - Minimalistic with Silver Glass Effect */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 px-4 sm:px-0">
                  {/* How BizMap AI Works - Enhanced with new features */}
                  <div className="group relative overflow-hidden glass-card-silver hover-lift transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 border border-primary/10 rounded-xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10 p-4 sm:p-6">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Lightbulb className="w-3 sm:w-4 h-3 sm:h-4 text-primary group-hover:animate-pulse" />
                        </div>
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors duration-300 text-sm sm:text-base">Enhanced AI Features</h3>
                      </div>
                      <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                        <div className="flex gap-2 sm:gap-3 group-hover:translate-x-1 transition-transform duration-300">
                          <span className="w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors duration-300">🧠</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300"><strong>Smarter Validation:</strong> AI detects vague answers and asks clarifying questions</p>
                        </div>
                        <div className="flex gap-2 sm:gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '50ms' }}>
                          <span className="w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors duration-300">📄</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300"><strong>Professional PDFs:</strong> Download formatted reports with charts and branding</p>
                        </div>
                        <div className="flex gap-2 sm:gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '100ms' }}>
                          <span className="w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors duration-300">⭐</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300"><strong>Success Scoring:</strong> Get detailed business viability analysis</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Market Intelligence */}
                  <div className="group relative overflow-hidden glass-card-silver hover-lift transition-all duration-500 hover:shadow-xl hover:shadow-secondary/10 border border-secondary/10 rounded-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-secondary/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10 p-4 sm:p-6">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Target className="w-3 sm:w-4 h-3 sm:h-4 text-secondary group-hover:animate-pulse" />
                        </div>
                        <h3 className="font-medium text-foreground group-hover:text-secondary transition-colors duration-300 text-sm sm:text-base">Market Intelligence</h3>
                      </div>
                      <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                        <div className="flex gap-2 sm:gap-3 group-hover:translate-x-1 transition-transform duration-300">
                          <span className="text-secondary group-hover:scale-110 transition-transform duration-300 text-sm">📊</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Real-time market trends and competitor insights</p>
                        </div>
                        <div className="flex gap-2 sm:gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '50ms' }}>
                          <span className="text-secondary group-hover:scale-110 transition-transform duration-300 text-sm">🎯</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Customer validation strategies</p>
                        </div>
                        <div className="flex gap-2 sm:gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '100ms' }}>
                          <span className="text-secondary group-hover:scale-110 transition-transform duration-300 text-sm">📈</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Growth opportunities identification</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Success Scoring */}
                  <div className="group relative overflow-hidden glass-card-silver hover-lift transition-all duration-500 hover:shadow-xl hover:shadow-accent/10 border border-accent/10 rounded-xl animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    {/* Background Effects */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10 p-4 sm:p-6">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Rocket className="w-3 sm:w-4 h-3 sm:h-4 text-accent group-hover:animate-pulse" />
                        </div>
                        <h3 className="font-medium text-foreground group-hover:text-accent transition-colors duration-300 text-sm sm:text-base">Success Scoring</h3>
                      </div>
                      <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                        <div className="flex gap-2 sm:gap-3 group-hover:translate-x-1 transition-transform duration-300">
                          <span className="text-accent font-mono text-xs group-hover:scale-110 transition-transform duration-300">95%</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Business model validation score</p>
                        </div>
                        <div className="flex gap-2 sm:gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '50ms' }}>
                          <span className="text-accent font-mono text-xs group-hover:scale-110 transition-transform duration-300">8.7</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Product-market fit assessment</p>
                        </div>
                        <div className="flex gap-2 sm:gap-3 group-hover:translate-x-1 transition-transform duration-300" style={{ transitionDelay: '100ms' }}>
                          <span className="text-accent font-mono text-xs group-hover:scale-110 transition-transform duration-300">90d</span>
                          <p className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">Optimized launch timeline</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
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
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sprint">
                <div className="flex items-center gap-4 mb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab("bizmap")}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to BizMap
                  </Button>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">Sprint Planning</h2>
                    <p className="text-muted-foreground">Turn your business plan into actionable sprints</p>
                  </div>
                </div>
                
                {!activeSprint ? (
                  <SprintPlannerComponent 
                    onSprintCreated={handleSprintCreated}
                    businessPlanData={launchReport ? {
                      answers: userAnswers,
                      launchReport: launchReport,
                      successScore: successScore
                    } : undefined}
                  />
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold creatives-font">Sprint Dashboard</h2>
                        <p className="text-muted-foreground">Track your progress and stay accountable</p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setActiveSprintId(null);
                          setCurrentSprint(null);
                        }}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Create New Sprint
                      </Button>
                    </div>
                    
                    <SprintKanban 
                      sprint={activeSprint} 
                      onStatusChange={(status) => {
                        if (activeSprint) {
                          setCurrentSprint({ ...activeSprint, status });
                        }
                      }}
                    />
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
      <ChatbotWidget />
    </div>
  );
};

export default BizMapAI;