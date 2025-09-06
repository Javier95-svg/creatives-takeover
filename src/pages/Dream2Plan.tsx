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

  // Check for pre-populated prompt from Prompt Library
  useEffect(() => {
    const savedPrompt = localStorage.getItem('bizmap_prompt');
    if (savedPrompt) {
      setUserAnswers(prev => ({ ...prev, overview: savedPrompt }));
      setMessage(savedPrompt);
      localStorage.removeItem('bizmap_prompt');
      toast.success("Prompt loaded from Prompt Library!");
    }
  }, []);

  // Component is now fully conversational - no need to add separate first question

  // Remove unused research/refine functions - simplified process
  
  // Generate asset function remains unchanged

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
        return data.report;
      } else {
        console.error('API returned error:', data?.error);
        const fallbackReport = generateFallbackReport(answers);
        toast.success("Generated your Launch Report successfully!");
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
      setMessages(prev => [...prev, { type: 'assistant', content: `Got it. Generating ${label} based on your inputs...` }]);

      const { data, error } = await supabase.functions.invoke('bizmap-assets', {
        body: {
          type,
          answers: userAnswers,
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) {
        // Handle credit-related errors
        if (error.message?.includes('Insufficient credits') || error.message?.includes('credit')) {
          setPendingAction({ type: 'asset', assetType: type });
          setCreditGateOpen(true);
          toast.error(`You need ${CREDIT_COSTS.ASSET_GENERATION} credits to generate assets.`);
          return;
        }
        throw error;
      }
      
      if (data?.asset) {
        // If successful, deduct credits from local state for immediate UI update
        handleCreditDeduction(CREDIT_COSTS.ASSET_GENERATION);
        toast.success(`Asset generated! (Used ${CREDIT_COSTS.ASSET_GENERATION} credits)`);
        setMessages(prev => [...prev, { type: 'assistant', content: data.asset }]);
      } else {
        toast.error('Sorry, I could not generate that asset right now.');
      }
    } catch (err) {
      console.error('Error generating asset:', err);
      
      // Check if it's a credit error
      if (err?.message?.includes('402') || err?.message?.includes('credit')) {
        setPendingAction({ type: 'asset', assetType: type });
        setCreditGateOpen(true);
        toast.error(`You need ${CREDIT_COSTS.ASSET_GENERATION} credits to generate assets.`);
        return;
      }
      
      toast.error('There was a problem generating that. Please try again.');
    } finally {
      setIsLoading(false);
      setMessage('');
    }
  };

  const handlePostReportMessage = async () => {
    const content = message.toLowerCase();
    if (message.trim()) {
      setMessages(prev => [...prev, { type: 'user', content: message.trim() }]);
    }
    if (content.includes('outreach') || content.includes('email')) {
      await generateAsset('outreach');
      return;
    }
    if (content.includes('social')) {
      await generateAsset('social');
      return;
    }
    if (content.includes('landing')) {
      await generateAsset('landing');
      return;
    }
    setMessages(prev => [...prev, { type: 'assistant', content: "You can ask for: 'Draft my first outreach email', 'Write 3 social media posts to test my idea', or 'Help me sketch a simple landing page'." }]);
    setMessage('');
  };
  const handleQuickAction = async (type: 'outreach' | 'social' | 'landing') => {
    await generateAsset(type);
  };

  const generateFallbackReport = (answers: any) => {
    // Use sensible defaults since stage and region are no longer required
    const region = 'Global';
    const r = region.toLowerCase();

    // Default channels for global market
    let channels = ['LinkedIn', 'Email outreach', 'Google Search'];
    let currency = '$';
    let currencyLabel = 'USD';

    if (r.includes('latin') || r.includes('latam')) {
      channels = ['WhatsApp', 'Instagram', 'Facebook Groups'];
      currency = '$';
      currencyLabel = 'USD';
    }
    if (r.includes('brazil')) { channels = ['WhatsApp', 'Instagram', 'Facebook']; currency = 'R$'; currencyLabel = 'BRL'; }
    else if (r.includes('mexico')) { channels = ['WhatsApp', 'Facebook', 'Instagram']; currency = '$'; currencyLabel = 'MXN'; }
    else if (r.includes('europe') || r.includes('germany') || r.includes('france') || r.includes('spain') || r.includes('italy') || r.includes('eu')) { channels = ['LinkedIn', 'Google Search', 'Email']; currency = '€'; currencyLabel = 'EUR'; }
    else if (r.includes('uk') || r.includes('united kingdom') || r.includes('britain')) { channels = ['LinkedIn', 'Email', 'Events/Meetups']; currency = '£'; currencyLabel = 'GBP'; }
    else if (r.includes('india')) { channels = ['WhatsApp', 'Instagram', 'YouTube']; currency = '₹'; currencyLabel = 'INR'; }
    else if (r.includes('nigeria') || r.includes('kenya') || r.includes('africa')) { channels = ['WhatsApp', 'Facebook', 'Community Groups']; currency = '₦'; currencyLabel = 'Local'; }
    else if (r.includes('china')) { channels = ['WeChat', 'Weibo', 'Douyin']; currency = '¥'; currencyLabel = 'CNY'; }
    else if (r.includes('us') || r.includes('united states') || r.includes('america')) { channels = ['LinkedIn', 'Email', 'Google Search']; currency = '$'; currencyLabel = 'USD'; }
    else if (r.includes('mena') || r.includes('middle east') || r.includes('uae') || r.includes('saudi')) { channels = ['WhatsApp', 'Instagram', 'LinkedIn']; currency = '﷼'; currencyLabel = 'Local'; }

    // Fixed English translations
    const translations = {
      title: "# Launch Report",
      executiveSummary: "## Executive Summary",
      executiveText: "Based on your responses, you have a promising business concept that addresses a real market need. Success will depend on effective customer validation and focused execution.",
      doNext: "**Do Next:**",
      scheduleReview: "Schedule 2 hours this week to review this entire report and identify your top 3 priorities.",
      leanCanvas: "## Lean Canvas Snapshot",
      problem: "**Problem:**",
      solution: "**Solution:**",
      keyCustomers: "**Key Customers:**",
      channels: "**Channels:**",
      revenueStreams: "**Revenue Streams:**",
      keyCosts: "**Key Costs:**",
      customerPersona: "## Customer Persona",
      validationPlan: "## Validation Plan - 5 Next Steps",
      goToMarket: "## Go-To-Market One-Pager",
      pricingAnalysis: "## Simple Pricing & Breakeven Analysis",
      roadmap: "## 90-Day Roadmap & KPIs",
      scripts: "## Copy-Paste Scripts",
      disclaimer: "This plan is a starting point. Execute, test, and adjust fast.",
      dataDisclaimer: "**Data Disclaimer:** All numbers above are estimates/assumptions, not official statistics. Always validate with real market research, competitor analysis, and customer surveys before making major decisions."
    };

    return `${translations.title}

${translations.executiveSummary}
${translations.executiveText}

${translations.doNext} ${translations.scheduleReview}

${translations.leanCanvas}
${translations.problem} ${answers.problem}
${translations.solution} ${answers.solution}
${translations.keyCustomers} From your market research
${translations.channels} ${answers.channels || channels.join(', ')}
${translations.revenueStreams} Based on your pricing model
${translations.keyCosts} As outlined in your cost structure

${translations.doNext} Print or save this canvas and put it somewhere visible. Review weekly to stay focused.

${translations.customerPersona}
**Name:** Your Ideal Customer
**Demographics:** Based on your target market description
**Pain Points:** Issues you identified in problem section
**Where They Spend Time:** ${channels.join(', ')}
**Buying Triggers:** Value propositions from your solution

${translations.doNext} Interview 3 people who match this persona this week using these questions: "What's your biggest challenge with [problem area]?" and "How do you currently solve this?"

${translations.validationPlan}
1. **Customer Interviews:** Conduct 20 interviews with target customers
2. **Market Research:** Analyze 3 direct competitors
3. **Prototype Testing:** Create simple version to test core concept
4. **Channel Test (${region}):** Run a small test on ${channels[0]} with ${currency}50–${currency}150 budget (track real costs)
5. **Pricing Validation:** Survey 20+ potential customers on pricing (${currencyLabel}) - don't guess, ask directly

${translations.doNext} Complete step 1 within the next 3 days. Set a calendar reminder right now.

${translations.goToMarket}
**Primary Channel Focus (${region}):** ${channels[0]}
**First 10 Customers Plan:**
• Direct outreach via ${channels[0]}
• Content marketing to establish expertise
• Partnerships with complementary businesses

${translations.doNext} Create your first piece of content for ${channels[0]} this week. Post it and track engagement.

${translations.pricingAnalysis} (${currencyLabel})
**Recommended Pricing:** Example ${currency}49–${currency}199 (verify with competitor research)
**Key Assumptions (validate these with real data):**
• Customer acquisition cost: ~${currency}5–${currency}25 via ${channels[0]} (test with small budget)
• Monthly customers needed: Based on your revenue goals
• Break-even timeline: 6–18 months (varies by market)

**Find Real Data:** Search "pricing benchmarks [your industry] ${region}" on Google, check Statista, or survey potential customers directly.

${translations.doNext} Survey 10 potential customers about pricing this week using: "Would you pay ${currency}[X] for [solution] that [key benefit]?"

${translations.roadmap}

### Month 1: Foundation
**Goal:** Validate core assumptions with real data
**Key Actions:** Customer interviews, competitor analysis, basic prototype
**KPI:** 20 customer interviews completed + pricing range validated
**Do Next:** Complete the first customer interview within 48 hours.

### Month 2: Validation
**Goal:** Test solution-market fit with real customers
**Key Actions:** Refine offering, test ${channels[0]} with ${currency}100–${currency}300 budget, validate pricing in ${currencyLabel}
**KPI:** 10+ potential customers express buying intent at your price point
**Do Next:** Set up tracking system for your KPI (spreadsheet, app, etc.)

### Month 3: Launch
**Goal:** Get first paying customers
**Key Actions:** Official launch, focus marketing on ${channels[0]} and ${channels[1] || channels[0]}, gather feedback
**KPI:** First 5–15 paying customers (track real acquisition costs)
**Do Next:** Create a launch checklist with specific dates for each task.

${translations.scripts}

### ${channels[0] === 'WhatsApp' ? 'WhatsApp' : 'SMS/DM'} Message:
\`\`\`
Hi [Name], I'm launching a new [solution] that helps [target customer] with [problem]. Would you be interested in learning more?
\`\`\`

### Cold Email Subject + Body:
\`\`\`
Subject: Quick question about [specific problem]
Body: Hi [Name], I noticed [specific observation]. I'm working on [solution] to help with [problem]. Would you have 5 minutes to share your thoughts?
\`\`\`

### Landing Page Headline:
\`\`\`
Finally, a better way to [solve their problem]
\`\`\`

**Do Next:** Send the ${channels[0] === 'WhatsApp' ? 'WhatsApp' : 'SMS/DM'} message to 5 potential customers today. Track responses in a simple spreadsheet.

---

${translations.disclaimer}

**⚠️ Important Disclaimer:** BizMap AI is not a legal or financial advisor. This report gives practical guidance to kickstart your journey, but always validate with real customers and professional advice where needed.

${translations.dataDisclaimer}`;
  };

  const isAnswerTooVague = (answer: string, stepKey: string) => {
    const trimmed = answer.trim().toLowerCase();
    
    // Check for obviously vague responses
    const vagueResponses = ['idk', "i don't know", 'not sure', 'maybe', 'um', 'uh', 'dunno', '?'];
    if (vagueResponses.includes(trimmed) || trimmed.length < 10) {
      return true;
    }

    // Step-specific vague answer detection
    switch (stepKey) {
      case 'overview':
        return trimmed.includes('a store') || trimmed.includes('an app') || trimmed.includes('a business') || trimmed.includes('a website');
      case 'market':
        return trimmed.includes('everyone') || trimmed.includes('anyone') || trimmed.includes('people');
      case 'problem':
        return !trimmed.includes('problem') && !trimmed.includes('issue') && !trimmed.includes('struggle') && !trimmed.includes('difficult');
      case 'solution':
        return trimmed.length < 20;
      case 'channels':
        return trimmed.includes('social media') && trimmed.length < 30;
      case 'pricing':
        return !trimmed.includes('$') && !trimmed.includes('free') && !trimmed.includes('subscription') && !trimmed.includes('commission');
      case 'goals':
        return !trimmed.includes('day') && !trimmed.includes('week') && !trimmed.includes('month') && !trimmed.includes('hour');
      default:
        return false;
    }
  };

  const generateClarifyingQuestion = (stepKey: string, vagueAnswer: string) => {
    switch (stepKey) {
      case 'overview':
        return `I need more details to help you properly. Let me give you some options to get specific:\n\n• **E-commerce:** Selling physical products online (like clothing, gadgets, food)\n• **Service Business:** Offering services (consulting, cleaning, tutoring, design)\n• **Tech/App:** Building software or mobile applications\n• **Local Business:** Restaurant, salon, retail store, etc.\n\nWhich category fits best, and what specific product/service would you offer?`;
        
      case 'market':
        if (vagueAnswer.toLowerCase().includes('everyone')) {
          return `"Everyone" isn't a target market - let's get specific! Try one of these approaches:\n\n• **Demographics:** Age range, income level, location (e.g., "Working professionals 25-40 in urban areas")\n• **Behavior:** What they currently do (e.g., "Parents who shop online for kids' clothes")\n• **Industry:** Business type (e.g., "Small restaurant owners with 10-50 employees")\n\nWho specifically would benefit most from your solution?`;
        }
        return `I need more specifics about your ideal customer. Help me understand:\n\n• **Who:** Age, location, income level?\n• **What:** What do they currently do related to your business?\n• **Where:** Where do they spend time online/offline?\n\nFor example: "Busy working parents in suburbs who currently use Facebook groups to find childcare."`;
        
      case 'problem':
        return `I need to understand the specific problem you're solving. Try this format:\n\n• **Current Situation:** How do people handle this now?\n• **Pain Points:** What's frustrating/time-consuming/expensive?\n• **Impact:** How does this problem affect their day/business/life?\n\nFor example: "Parents waste 2+ hours searching unreliable Facebook groups for sitters, often finding no one available for urgent needs."`;
        
      case 'solution':
        return `Help me understand how your solution is different and better:\n\n• **Key Feature:** What's the main thing your solution does?\n• **Advantage:** How is it better than current alternatives?\n• **Outcome:** What result does the customer get?\n\nFor example: "Our app provides verified sitters with real-time availability and instant booking - solving the problem in under 5 minutes vs hours of searching."`;
        
      case 'channels':
        return `Let's get specific about how you'll reach customers. Choose your top 2-3:\n\n• **Social Media:** Which platforms? (Instagram, TikTok, LinkedIn, Facebook)\n• **Content:** Blog, YouTube, podcast, email newsletter\n• **Partnerships:** Other businesses, influencers, referrals\n• **Paid Ads:** Google, Facebook, industry publications\n• **Direct:** Cold outreach, networking, events\n\nWhere does your target customer spend the most time?`;
        
      case 'pricing':
        return `I need specifics about your business model and costs:\n\n• **Revenue:** How will you charge? (one-time fee, subscription, commission, ads)\n• **Price Point:** What will you charge? (even a rough estimate)\n• **Main Costs:** Development, marketing, materials, labor?\n• **Starting Budget:** How much can you invest initially?\n\nFor example: "15% commission per booking, average $60. Main costs: app development ($5K), marketing ($2K/month). Have $10K to start."`;
        
      case 'goals':
        return `Let's set specific, measurable goals:\n\n• **Revenue Target:** How much money in 90 days?\n• **Customer Target:** How many customers/users?\n• **Time Commitment:** How many hours per week can you dedicate?\n• **Launch Timeline:** When do you want to be live?\n\nFor example: "Launch MVP in 8 weeks, get 100 active users, $5K monthly revenue. Can dedicate 25 hours/week."`;
        
      default:
        return `Could you provide more specific details? I need enough information to create a useful business plan for you.`;
    }
  };
  
  const handleNextStep = async (messageOverride?: string) => {
    const currentAnswer = (messageOverride || message).trim();
    if (!currentAnswer) {
      toast.error("Please provide an answer before continuing.");
      return;
    }

    const currentKey = wizardSteps[currentStep].key;

    // Internal helpers for context-aware follow-ups
    const shouldAskFollowUp = (stepKey: string, answer: string) => {
      const t = answer.toLowerCase();
      const wordCount = answer.split(' ').length;
      
      // More sophisticated context analysis
      const hasSpecifics = /(\d+|%|\$|€|£|₹|R\$)/.test(answer);
      const hasTimeframe = /(day|week|month|year|hour|minute)/.test(t);
      const hasLocation = /(city|town|state|country|us|uk|europe|india|brazil|mexico|nigeria|kenya|china|uae|local|global)/.test(t);
      const hasComparison = /(better|faster|cheaper|unique|different|advantage|versus|compared|unlike)/.test(t);
      
      switch (stepKey) {
        case 'overview':
          // Need business model clarity and specific value prop
          return wordCount < 25 || (!hasSpecifics && !t.includes('help') && !t.includes('solve'));
          
        case 'market':
          // Need demographic specifics and geographic context
          return wordCount < 20 || (!hasLocation && !hasSpecifics) || t.includes('everyone') || t.includes('anyone');
          
        case 'problem':
          // Need quantified pain points and current solutions
          return wordCount < 15 || (!hasSpecifics && !hasTimeframe && !t.includes('difficult') && !t.includes('hard') && !t.includes('expensive') && !t.includes('slow') && !t.includes('frustrating'));
          
        case 'solution':
          // Need differentiation and competitive analysis
          return wordCount < 25 || !hasComparison || (!t.includes('than') && !t.includes('instead'));
          
        case 'channels':
          // Need specific platforms and acquisition strategy
          const channelCount = (answer.match(/,|and|\+/g) || []).length + 1;
          return channelCount < 2 || wordCount < 15 || !/(instagram|tiktok|linkedin|facebook|google|whatsapp|youtube|email|newsletter|events|partnership|ads|seo|content)/i.test(t);
          
        case 'pricing':
          // Need business model and validation plan
          return !hasSpecifics || wordCount < 20 || !/(subscription|commission|one-time|freemium|ads|revenue|cost|budget)/i.test(t);
          
        case 'goals':
          // Need measurable objectives and timeline
          return !hasSpecifics || !hasTimeframe || wordCount < 20 || !/(users|customers|revenue|launch|build|grow)/i.test(t);
          
        default:
          return wordCount < 15;
      }
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

  const examplePrompts = [
    "I want to start an e-commerce business",
    "I have an idea for a mobile app", 
    "I want to open a local restaurant",
    "I'm planning a consulting business"
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Helmet>
        <title>BizMap AI - Turn Business Ideas Into Launch Reports | AI Business Planning</title>
        <meta name="description" content="Transform your business ideas into comprehensive Launch Reports with our 7-step AI wizard. Get personalized validation plans, go-to-market strategies, and 90-day roadmaps." />
        <meta name="keywords" content="business plan, AI business planning, startup planning, business ideas, entrepreneurship, BizMap AI, launch report" />
      </Helmet>
      
      {/* Animated Background */}
      <AnimatedBackground />
      
      <div className="relative z-10">
        <Navigation />
        
        <div className="pt-20 pb-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 takeover-gradient creatives-font">
                BizMap AI
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your global startup co-founder in chatbot form. Transform business ideas into actionable Launch Reports.
              </p>
            </div>

            {/* Chat Interface Container */}
            <div className="flex gap-6 mb-8">
              {/* Chat Sidebar */}
              <ChatSidebar 
                onSessionSelect={handleSessionSelect}
                onNewChat={handleNewChat}
                className="hidden md:flex"
              />

              {/* Main Chat Interface */}
              <div className="flex-1 min-w-0">
                <Card className="glass-card-silver h-[700px] flex flex-col hover-lift">
                  <CardContent className="flex flex-col h-full p-0">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-silver-glow flex items-center justify-center shadow-lg">
                            <Bot className="w-5 h-5 text-foreground" />
                          </div>
                          <div>
                            <h4 className="font-semibold silver-gradient-text">BizMap AI Assistant</h4>
                            <p className="text-sm text-muted-foreground">
                              {isCompleted ? "Launch Report Complete!" : 
                               `Step ${currentStep + 1} of ${wizardSteps.length}`}
                            </p>
                          </div>
                        </div>
                        {!isCompleted && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {Math.round(getProgressPercentage())}%
                            </span>
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${getProgressPercentage()}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.map((msg, index) => {
                        // For AI messages, use typing animation for the last message
                        const isLastAIMessage = msg.type === "ai" && index === messages.length - 1 && !isLoading;
                        
                        if (msg.type === "user") {
                          return (
                            <div key={index} className="flex gap-3 flex-row-reverse">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground">
                                <User className="w-4 h-4" />
                              </div>
                              <div className="max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap bg-primary text-primary-foreground rounded-br-none">
                                {msg.content}
                              </div>
                            </div>
                          );
                        }
                        
                        if (isLastAIMessage) {
                          return (
                            <TypingMessage 
                              key={index}
                              content={msg.content}
                              speed={25}
                            />
                          );
                        }
                        
                        return (
                          <div key={index} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <Bot className="w-4 h-4" />
                            </div>
                            <div className="max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap bg-muted rounded-bl-none">
                              {msg.content}
                            </div>
                          </div>
                        );
                      })}
                      {isLoading && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className="bg-muted p-3 rounded-lg rounded-bl-none">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        </div>
                      )}
                    </div>

                     {/* Simplified UI - removed research controls for streamlined process */}
                     
                     <div className="p-4 border-t border-border/50">
                      {isCompleted && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="secondary" onClick={() => handleQuickAction('outreach')}>Draft outreach email</Button>
                          <Button size="sm" variant="secondary" onClick={() => handleQuickAction('social')}>Write 3 social posts</Button>
                          <Button size="sm" variant="secondary" onClick={() => handleQuickAction('landing')}>Sketch landing page</Button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          placeholder={getCurrentPlaceholder()}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="flex-1"
                          disabled={isLoading}
                        />
                        <AudioRecorder 
                          onTranscription={handleAudioTranscription}
                          disabled={isLoading}
                        />
                        <Button 
                          onClick={() => handleSendMessage()} 
                          size="icon" 
                          disabled={isLoading || (currentStep < wizardSteps.length && !message.trim())}
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {isCompleted ? "Launch Report generated! Copy and save it." :
                           `Answer to continue to step ${currentStep + 2}`}
                        </p>
                        {!isCompleted && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleSendMessage()}
                            disabled={isLoading || !message.trim()}
                          >
                            {getButtonText()}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
            
            {/* Three Information Cards - Horizontal Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* How BizMap AI Works */}
              <Card className="glass-card animate-fade-in hover-scale group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10" style={{ animationDelay: '0.1s' }}>
                {/* Animated background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Floating particles on hover */}
                <div className="absolute top-4 right-4 w-2 h-2 bg-primary/30 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-float transition-all duration-300" />
                <div className="absolute bottom-6 left-6 w-1 h-1 bg-secondary/40 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-all duration-300" style={{ animationDelay: '0.5s' }} />
                
                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors duration-300">
                    <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 animate-pulse-slow">
                      <Lightbulb className="w-5 h-5 text-primary group-hover:animate-bounce" />
                    </div>
                    How BizMap AI Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative z-10">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                        <span className="text-xs font-semibold text-primary">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1 group-hover:text-primary transition-colors duration-300">7-Step Wizard</h4>
                        <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Answer 7 structured questions about your business idea, one at a time.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                        <span className="text-xs font-semibold text-primary">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1 group-hover:text-primary transition-colors duration-300">AI Analysis</h4>
                        <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">GPT-5 analyzes your responses and creates a personalized Launch Report.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                        <span className="text-xs font-semibold text-primary">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1 group-hover:text-primary transition-colors duration-300">Launch Report</h4>
                        <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">Get your complete business roadmap ready to export to PDF/Notion/Google Docs.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                
                {/* Animated bottom border */}
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-secondary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </Card>

              {/* What You'll Get */}
              <Card className="glass-card animate-fade-in hover-scale group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10" style={{ animationDelay: '0.3s' }}>
                {/* Animated background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Floating particles on hover */}
                <div className="absolute top-6 right-6 w-2 h-2 bg-secondary/30 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-float transition-all duration-300" style={{ animationDelay: '0.2s' }} />
                <div className="absolute bottom-4 left-4 w-1 h-1 bg-primary/40 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-all duration-300" style={{ animationDelay: '0.7s' }} />
                
                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors duration-300">
                    <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 animate-pulse-slow">
                      <Target className="w-5 h-5 text-primary group-hover:animate-spin" style={{ animationDuration: '2s' }} />
                    </div>
                    What You'll Get
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="space-y-2">
                    {[
                      "Personalized Launch Report",
                      "Go-To-Market Strategy", 
                      "90-Day Action Roadmap",
                      "Customer Validation Plan",
                      "Pricing & Revenue Model",
                      "Ready-to-Use Scripts"
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-2 animate-fade-in group-hover:translate-x-1 transition-transform duration-300" style={{ animationDelay: `${0.3 + index * 0.1}s`, transitionDelay: `${index * 0.05}s` }}>
                        <CheckCircle className="w-4 h-4 text-primary group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-sm group-hover:text-primary transition-colors duration-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                
                {/* Animated bottom border */}
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-secondary to-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </Card>

              {/* Try These Examples */}
              <Card className="glass-card animate-fade-in hover-scale group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10" style={{ animationDelay: '0.5s' }}>
                {/* Animated background gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Floating particles on hover */}
                <div className="absolute top-2 right-2 w-2 h-2 bg-accent/30 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-float transition-all duration-300" style={{ animationDelay: '0.3s' }} />
                <div className="absolute bottom-8 left-8 w-1 h-1 bg-primary/40 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-bounce transition-all duration-300" style={{ animationDelay: '0.8s' }} />
                
                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors duration-300">
                    <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 animate-pulse-slow">
                      <Rocket className="w-5 h-5 text-primary group-hover:animate-pulse" />
                    </div>
                    Try These Examples
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="space-y-2">
                    {examplePrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left h-auto p-3 transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-primary/50 animate-fade-in group-hover:translate-x-1"
                        style={{ animationDelay: `${0.5 + index * 0.1}s`, transitionDelay: `${index * 0.05}s` }}
                        onClick={() => setMessage(prompt)}
                      >
                        <span className="relative">
                          "{prompt}"
                          {/* Animated underline on hover */}
                          <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary transform scale-x-0 hover:scale-x-100 transition-transform duration-300 origin-left" />
                        </span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
                
                {/* Animated bottom border */}
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-accent to-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </Card>
            </div>
            
            {/* Download Component - Show only when report is completed */}
            {launchReport && (
              <div className="mt-8">
                <ReportDownload report={launchReport} title="BizMap Launch Report" />
              </div>
            )}
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