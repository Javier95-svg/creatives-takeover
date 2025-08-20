import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Bot, User, Lightbulb, Target, Rocket, CheckCircle, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AnimatedBackground from "@/components/AnimatedBackground";

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
  const [userStage, setUserStage] = useState("Explore");
  const [userRegion, setUserRegion] = useState("US");
  const [launchReport, setLaunchReport] = useState("");
  const [messages, setMessages] = useState([
    {
      type: "assistant",
      content: "Welcome to BizMap AI! 👋 I'm your global startup co-founder in chatbot form. I'll guide you through 7 quick questions to create a personalized Launch Report for your business idea.\n\nLet's start with the first question:"
    }
  ]);

  const wizardSteps = [
    {
      key: "overview",
      title: "Business Overview",
      question: "In 2-3 sentences, describe your business idea. What are you building or planning to offer?",
      placeholder: "e.g., A mobile app that helps busy parents find and book last-minute childcare services in their neighborhood..."
    },
    {
      key: "market", 
      title: "Target Market",
      question: "Who is your ideal customer? Be specific about demographics, location, and current behavior.",
      placeholder: "e.g., Working parents aged 28-45 in urban areas who currently struggle with childcare arrangements and use Facebook groups to find sitters..."
    },
    {
      key: "problem",
      title: "Problem Definition", 
      question: "What specific problem does your business solve? How do people currently handle this problem?",
      placeholder: "e.g., Parents waste hours searching unreliable Facebook groups and calling multiple sitters, often finding no one available for urgent needs..."
    },
    {
      key: "solution",
      title: "Your Solution",
      question: "How does your product/service solve this problem better than existing alternatives?", 
      placeholder: "e.g., Our app provides verified sitters with real-time availability, instant booking, and background checks - solving the problem in under 5 minutes..."
    },
    {
      key: "channels",
      title: "Marketing Channels",
      question: "How will you reach and acquire your first customers? What platforms do they use most?",
      placeholder: "e.g., Instagram ads targeting parent hashtags, partnerships with pediatricians, referral program, local parenting Facebook groups..."
    },
    {
      key: "pricing",
      title: "Pricing & Costs", 
      question: "How will you make money? What are your main costs? What's your available budget to start?",
      placeholder: "e.g., 15% commission per booking, avg $60/booking. Main costs: app development ($5K), marketing ($2K/month). Available budget: $10K..."
    },
    {
      key: "goals",
      title: "Goals & Timeline",
      question: "What are your goals for the next 90 days? How much time can you dedicate weekly?",
      placeholder: "e.g., Launch MVP, get 100 active users, $5K monthly revenue. Can dedicate 25 hours/week, want to launch in 8 weeks..."
    }
  ];

  const [message, setMessage] = useState("");

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

  // Add first question to messages on component mount
  useEffect(() => {
    if (messages.length === 1) { // Only initial message
      setMessages(prev => [...prev, {
        type: "assistant",
        content: `**${wizardSteps[0].title}** (Step 1 of 7)\n\n${wizardSteps[0].question}`
      }]);
    }
  }, []);

  const generateLaunchReport = async (answers: any, stage: string, region: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('bizmap-analysis', {
        body: { 
          answers,
          stage,
          region
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      return data.launchReport;
    } catch (error) {
      console.error('Error generating launch report:', error);
      toast.error("Sorry, I'm having trouble connecting to the AI service. Please try again in a moment.");
      
      // Fallback to basic structure if API fails
      return generateFallbackReport(answers, stage, region);
    } finally {
      setIsLoading(false);
    }
};

  // Generate post-report assets (outreach email, social posts, landing page)
  const generateAsset = async (type: 'outreach' | 'social' | 'landing') => {
    try {
      setIsLoading(true);
      const label = type === 'outreach' ? 'your first outreach email' : type === 'social' ? '3 social posts' : 'a simple landing page outline';
      setMessages(prev => [...prev, { type: 'assistant', content: `Got it. Generating ${label} based on your inputs...` }]);

      const { data, error } = await supabase.functions.invoke('bizmap-assets', {
        body: {
          type,
          answers: userAnswers,
          stage: userStage,
          region: userRegion,
        }
      });

      if (error) throw error;
      if (data?.asset) {
        setMessages(prev => [...prev, { type: 'assistant', content: data.asset }]);
      } else {
        toast.error('Sorry, I could not generate that asset right now.');
      }
    } catch (err) {
      console.error('Error generating asset:', err);
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

  const generateFallbackReport = (answers: any, stage: string, regionInput?: string) => {
    const region = (regionInput || 'Global').trim();
    const r = region.toLowerCase();

    // Region-aware channels and currency
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
  const handleNextStep = async () => {
    const currentAnswer = message.trim();
    if (!currentAnswer) {
      toast.error("Please provide an answer before continuing.");
      return;
    }

    const currentKey = wizardSteps[currentStep].key;
    
    // Check if answer is too vague
    if (isAnswerTooVague(currentAnswer, currentKey)) {
      // Add user's vague message to chat
      setMessages(prev => [...prev, {
        type: "user", 
        content: currentAnswer
      }]);

      // Ask for clarification
      const clarifyingQuestion = generateClarifyingQuestion(currentKey, currentAnswer);
      setMessages(prev => [...prev, {
        type: "assistant",
        content: clarifyingQuestion
      }]);

      setMessage("");
      return; // Don't advance to next step
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
      
      // Add next question to chat
      setMessages(prev => [...prev, {
        type: "assistant",
        content: `Great! Now for step ${nextStep + 1} of 7:\n\n**${wizardSteps[nextStep].title}**\n\n${wizardSteps[nextStep].question}`
      }]);
    } else {
      // All steps completed, generate launch report
      setMessages(prev => [...prev, {
        type: "assistant",
        content: "Excellent! Now I'm generating your personalized Launch Report based on all your responses. This may take a moment..."
      }]);

      // Generate launch report
      const completeAnswers = { ...userAnswers };
      const report = await generateLaunchReport(completeAnswers, userStage, userRegion);
      setLaunchReport(report);

      // Add final message with report
      setMessages(prev => [...prev, {
        type: "assistant", 
        content: report
      }]);
    }
  };


  const handleSendMessage = async () => {
    if (currentStep < wizardSteps.length) {
      handleNextStep();
    } else {
      await handlePostReportMessage();
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

            <div className="grid lg:grid-cols-5 gap-8">
              {/* Instructions Panel */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-primary" />
                      How BizMap AI Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-semibold text-primary">1</span>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">7-Step Wizard</h4>
                          <p className="text-sm text-muted-foreground">Answer 7 structured questions about your business idea, one at a time.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-semibold text-primary">2</span>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">AI Analysis</h4>
                          <p className="text-sm text-muted-foreground">GPT-5 analyzes your responses and creates a personalized Launch Report.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-semibold text-primary">3</span>
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">Launch Report</h4>
                          <p className="text-sm text-muted-foreground">Get your complete business roadmap ready to export to PDF/Notion/Google Docs.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" />
                      What You'll Get
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        "Personalized Launch Report",
                        "Go-To-Market Strategy", 
                        "90-Day Action Roadmap",
                        "Customer Validation Plan",
                        "Pricing & Revenue Model",
                        "Ready-to-Use Scripts"
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-primary" />
                      Try These Examples
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {examplePrompts.map((prompt, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto p-3"
                          onClick={() => setMessage(prompt)}
                        >
                          "{prompt}"
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chat Interface */}
              <div className="lg:col-span-3">
                <Card className="glass-card h-[700px] flex flex-col">
                  <CardContent className="flex flex-col h-full p-0">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">BizMap AI Assistant</h4>
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
                      {messages.map((msg, index) => (
                        <div key={index} className={`flex gap-3 ${msg.type === "user" ? "flex-row-reverse" : ""}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            msg.type === "user" 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-muted"
                          }`}>
                            {msg.type === "user" ? 
                              <User className="w-4 h-4" /> : 
                              <Bot className="w-4 h-4" />
                            }
                          </div>
                          <div className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap ${
                            msg.type === "user"
                              ? "bg-primary text-primary-foreground rounded-br-none"
                              : "bg-muted rounded-bl-none"
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
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

                    {/* Preferences */}
                    <div className="p-4 border-t border-border/50 bg-muted/20">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Stage</label>
                          <Select value={userStage} onValueChange={setUserStage}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Explore">Explore (idea stage)</SelectItem>
                              <SelectItem value="Validate">Validate (no customers yet)</SelectItem>
                              <SelectItem value="Build">Build (MVP)</SelectItem>
                              <SelectItem value="Grow">Grow (some revenue)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">Region</label>
                          <Select value={userRegion} onValueChange={setUserRegion}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="US">United States</SelectItem>
                              <SelectItem value="Europe">Europe</SelectItem>
                              <SelectItem value="Latin America">Latin America</SelectItem>
                              <SelectItem value="Brazil">Brazil</SelectItem>
                              <SelectItem value="Mexico">Mexico</SelectItem>
                              <SelectItem value="UK">United Kingdom</SelectItem>
                              <SelectItem value="India">India</SelectItem>
                              <SelectItem value="China">China</SelectItem>
                              <SelectItem value="Nigeria">Nigeria</SelectItem>
                              <SelectItem value="Kenya">Kenya</SelectItem>
                              <SelectItem value="UAE">UAE</SelectItem>
                              <SelectItem value="Global">Global</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

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
                        <Button 
                          onClick={handleSendMessage} 
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
                            onClick={handleSendMessage}
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
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BizMapAI;