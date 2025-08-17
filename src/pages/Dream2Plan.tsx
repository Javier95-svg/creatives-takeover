import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, User, Lightbulb, Target, Rocket, CheckCircle, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BizMapAI = () => {
  const [message, setMessage] = useState("");
  const [conversationState, setConversationState] = useState("initial"); // initial, gathering_context, analysis
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState({
    budget: "",
    skills: "",
    timeCommitment: "",
    businessIdea: ""
  });
  const [messages, setMessages] = useState([
    {
      type: "assistant",
      content: "Welcome to BizMap AI! I'm here to help you transform your business ideas into actionable business plans powered by GPT-5. What's your business idea or concept you'd like to work on?"
    }
  ]);

  const callGPT5Analysis = async (businessIdea: string, context: any) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('bizmap-analysis', {
        body: {
          businessIdea,
          budget: context.budget,
          skills: context.skills,
          timeCommitment: context.timeCommitment
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      return data.analysis;
    } catch (error) {
      console.error('Error calling GPT-5 analysis:', error);
      toast.error("Sorry, I'm having trouble connecting to the AI service. Please try again in a moment.");
      
      // Fallback to local analysis if API fails
      return generatePersonalizedAnalysis(businessIdea, context);
    } finally {
      setIsLoading(false);
    }
  };

  const gatherContextQuestions = (businessIdea: string) => {
    return `Thanks for sharing your business idea: "${businessIdea}"

To create a personalized strategy that fits your situation, I need to understand your context better. Please answer these quick questions:

**1. What's your available budget for this business?**
   • Under $1,000 (bootstrap mode)
   • $1,000 - $10,000 (moderate investment) 
   • $10,000+ (substantial investment)

**2. What relevant skills do you have?**
   • Technical (coding, design, development)
   • Marketing (social media, content, advertising)
   • Sales (customer relationships, negotiations)
   • Operations (project management, logistics)
   • Industry expertise (specific domain knowledge)
   • None of the above (I'm starting fresh)

**3. How much time can you dedicate weekly?**
   • 5-10 hours (side project while working)
   • 20-30 hours (part-time focus)
   • 40+ hours (full-time commitment)

Just type your answers like: "Budget: Under $1,000, Skills: Marketing and sales, Time: 20-30 hours"`;
  };

  const generatePersonalizedAnalysis = (businessIdea: string, context: any) => {
    const idea = businessIdea.toLowerCase();
    
    // Determine business type and base scoring
    let businessType = "general";
    let baseViability = 7;
    let marketSize = "";
    let competitionLevel = "";
    let startupComplexity = "";
    
    if (idea.includes("e-commerce") || idea.includes("online store") || idea.includes("selling online")) {
      businessType = "e-commerce";
      baseViability = 8;
      marketSize = "$6.2T global market, highly accessible";
      competitionLevel = "High - but niche opportunities exist";
      startupComplexity = "Medium - platform setup, inventory, marketing";
    } else if (idea.includes("app") || idea.includes("mobile") || idea.includes("software")) {
      businessType = "tech";
      baseViability = 6;
      marketSize = "$650B software market, scalable potential";
      competitionLevel = "Very High - requires strong differentiation";
      startupComplexity = "High - development, user acquisition, retention";
    } else if (idea.includes("consulting") || idea.includes("freelance") || idea.includes("service")) {
      businessType = "consulting";
      baseViability = 8;
      marketSize = "$250B+ professional services, location-flexible";
      competitionLevel = "Medium - expertise and relationships key";
      startupComplexity = "Low - mainly personal branding and networking";
    } else if (idea.includes("restaurant") || idea.includes("food") || idea.includes("café")) {
      businessType = "food";
      baseViability = 5;
      marketSize = "$800B food service, location-dependent";
      competitionLevel = "High - local market saturation common";
      startupComplexity = "High - permits, equipment, staff, location";
    }

    // Adjust viability based on user context
    let contextualViability = baseViability;
    let budgetFit = "";
    let skillsAlignment = "";
    let timeRealism = "";
    
    // Budget assessment
    if (context.budget?.includes("Under $1,000")) {
      if (businessType === "consulting" || businessType === "e-commerce") {
        budgetFit = "✅ Good fit - low startup costs possible";
      } else {
        contextualViability -= 2;
        budgetFit = "⚠️ Challenging - may need creative funding approaches";
      }
    } else if (context.budget?.includes("$1,000 - $10,000")) {
      budgetFit = "✅ Adequate for most startup phases";
    } else if (context.budget?.includes("$10,000+")) {
      contextualViability += 1;
      budgetFit = "✅ Excellent - allows for quality tools and faster validation";
    }

    // Skills assessment
    const skillsLower = context.skills?.toLowerCase() || "";
    if (businessType === "tech" && skillsLower.includes("technical")) {
      contextualViability += 2;
      skillsAlignment = "✅ Perfect match - technical skills reduce development costs";
    } else if (businessType === "consulting" && (skillsLower.includes("industry") || skillsLower.includes("sales"))) {
      contextualViability += 1;
      skillsAlignment = "✅ Good alignment - leverages existing expertise";
    } else if (skillsLower.includes("marketing")) {
      contextualViability += 1;
      skillsAlignment = "✅ Marketing skills valuable for customer acquisition";
    } else if (skillsLower.includes("starting fresh")) {
      contextualViability -= 1;
      skillsAlignment = "⚠️ Learning curve ahead - consider partnerships or training";
    }

    // Time assessment
    if (context.timeCommitment?.includes("5-10 hours")) {
      if (businessType === "consulting") {
        timeRealism = "✅ Realistic for service-based business";
      } else {
        contextualViability -= 1;
        timeRealism = "⚠️ Limited time may slow progress - focus on high-impact activities";
      }
    } else if (context.timeCommitment?.includes("40+ hours")) {
      contextualViability += 1;
      timeRealism = "✅ Full-time commitment accelerates development and validation";
    }

    // Cap viability between 1-10
    contextualViability = Math.max(1, Math.min(10, contextualViability));

    // Generate validation experiments
    const validationExperiments = generateValidationExperiments(businessType, context);
    
    // Generate custom execution phases
    const executionPhases = generateCustomPhases(businessType, context);
    
    // Generate prioritized next steps
    const nextSteps = generateNextSteps(businessType, context);

    return `# 📊 Personalized Business Analysis

## 💡 Your Business Idea
"${businessIdea}"

---

## 🎯 Viability Assessment

### **Overall Viability Score: ${contextualViability}/10**

**Reasoning:**
• **Market Size:** ${marketSize}
• **Competition:** ${competitionLevel}  
• **Startup Complexity:** ${startupComplexity}
• **Budget Fit:** ${budgetFit}
• **Skills Alignment:** ${skillsAlignment}
• **Time Commitment:** ${timeRealism}

---

## 🧪 Quick Validation Experiments (Complete in 2 weeks)

${validationExperiments}

---

## 🚀 Your Custom Execution Strategy

${executionPhases}

---

## 📋 Prioritized Next Steps

${nextSteps}

---

*💾 This personalized plan can be copied and saved for your reference. Update it as you progress through each phase.*`;
  };

  const generateValidationExperiments = (businessType: string, context: any) => {
    const budget = context.budget || "";
    const lowBudget = budget.includes("Under $1,000");
    
    if (businessType === "e-commerce") {
      return `### Experiment 1: Landing Page + Pre-Orders (Week 1)
**Method:** Create a simple landing page with product mockups and "Pre-order now" button
**Tools:** ${lowBudget ? "Carrd ($19/year) + Google Forms" : "Unbounce ($80/month) + Stripe"}  
**Target:** 100 website visitors, aim for 2-5% conversion to pre-orders
**Budget:** ${lowBudget ? "$20-50" : "$80-150"}

### Experiment 2: Social Proof Test (Week 2)  
**Method:** Post product concept in relevant Facebook groups/Reddit communities
**Tools:** Free - existing social platforms
**Target:** 20+ positive comments or 50+ upvotes/reactions
**Budget:** $0 (time investment only)`;
    } 
    
    else if (businessType === "tech") {
      return `### Experiment 1: Problem Interview Campaign (Week 1)
**Method:** Contact 50 potential users via LinkedIn/email to discuss their pain points
**Tools:** ${lowBudget ? "Free LinkedIn + Google Forms" : "LinkedIn Premium ($60) + Calendly"}
**Target:** 15+ completed interviews with clear problem validation
**Budget:** ${lowBudget ? "$0" : "$60-100"}

### Experiment 2: Feature Mockup Testing (Week 2)
**Method:** Create clickable prototype and gather user feedback
**Tools:** ${lowBudget ? "Figma (free) + social media sharing" : "Figma + UserTesting ($49/test)"}
**Target:** 20+ users test the mockup, 70%+ find it valuable
**Budget:** ${lowBudget ? "$0" : "$200-300"}`;
    }
    
    else if (businessType === "consulting") {
      return `### Experiment 1: Free Value-First Approach (Week 1)
**Method:** Offer free mini-consultation or audit to 10 target clients
**Tools:** LinkedIn outreach + Zoom (free) + simple template
**Target:** 5+ completed sessions with positive feedback
**Budget:** $0 (time investment)

### Experiment 2: Content Authority Building (Week 2)
**Method:** Publish 3 valuable posts/articles in your niche + engage with prospects
**Tools:** ${lowBudget ? "LinkedIn + free blog platform" : "LinkedIn + Medium + scheduling tools"}
**Target:** 200+ content views, 5+ direct inquiries about services  
**Budget:** ${lowBudget ? "$0" : "$30-50"}`;
    }
    
    else if (businessType === "food") {
      return `### Experiment 1: Pop-Up/Catering Test (Week 1)
**Method:** Cater a small event or set up at local farmers market
**Tools:** Basic cooking equipment + simple payment system (Square)
**Target:** Serve 50+ customers, gather feedback, test pricing
**Budget:** $100-300 (ingredients + permits)

### Experiment 2: Pre-Order Campaign (Week 2)
**Method:** Offer weekly meal prep or special event catering via social media
**Tools:** Instagram/Facebook + basic ordering system
**Target:** 20+ pre-orders for next week's service
**Budget:** $50-150 (marketing + initial ingredients)`;
    }
    
    else {
      return `### Experiment 1: Customer Discovery Interviews (Week 1)
**Method:** Interview 25 potential customers about their problems and needs
**Tools:** ${lowBudget ? "Free video calls + Google Forms" : "Calendly + interview incentives"}
**Target:** Clear pattern of customer pain points and willingness to pay
**Budget:** ${lowBudget ? "$0" : "$100-200"}

### Experiment 2: Minimum Viable Service (Week 2)
**Method:** Deliver a simplified version of your solution to 5 customers
**Tools:** Manual processes + basic payment collection
**Target:** Complete 5 successful deliveries with positive feedback
**Budget:** $50-200 (depending on service type)`;
    }
  };

  const generateCustomPhases = (businessType: string, context: any) => {
    const budget = context.budget || "";
    const skills = context.skills?.toLowerCase() || "";
    const time = context.timeCommitment || "";
    
    const isLowBudget = budget.includes("Under $1,000");
    const isPartTime = time.includes("5-10 hours");
    const hasTechSkills = skills.includes("technical");
    const hasMarketingSkills = skills.includes("marketing");

    if (businessType === "e-commerce") {
      return `### Phase 1: Validation & Setup (Weeks 1-6)
**Main Objective:** Validate demand and establish basic operations

**Key Steps (Tailored to Your Context):**
• Run validation experiments (see above)
• ${isLowBudget ? "Start with dropshipping or print-on-demand to minimize inventory risk" : "Source initial inventory from 1-2 suppliers"}
• Set up basic e-commerce store (${isLowBudget ? "Shopify Basic $29/month" : "Shopify Advanced $299/month"})
• ${hasMarketingSkills ? "Leverage your marketing skills for organic social media growth" : "Hire a part-time social media manager ($500-800/month)"}

**Free/Low-Cost Tools:**
• Shopify (14-day free trial, then $29/month)
• Canva (free design tool)
• Google Analytics (free)
• ${isLowBudget ? "Facebook/Instagram organic posting" : "Facebook Ads ($20/day budget)"}

**Timeline:** ${isPartTime ? "8-10 weeks (adjust for part-time)" : "6 weeks"}
**Success Metrics:** 50+ orders, positive customer feedback, break-even on first batch

### Phase 2: Growth & Optimization (Weeks 7-18)
**Main Objective:** Scale profitable customer acquisition

**Key Steps:**
• ${hasMarketingSkills ? "Implement advanced SEO and content marketing strategies" : "Focus on paid advertising with clear ROAS targets"}
• Expand product line based on customer feedback
• ${isLowBudget ? "Bootstrap reinvestment of profits" : "Invest in professional photography and branding"}
• Implement email marketing automation

**Timeline:** ${isPartTime ? "16-20 weeks" : "12 weeks"}
**Success Metrics:** $10K+ monthly revenue, 20%+ profit margin, automated systems

### Phase 3: Scaling & Systems (Weeks 19-32)
**Main Objective:** Build sustainable, scalable business operations

**Key Steps:**
• ${isPartTime ? "Consider hiring part-time virtual assistant" : "Build small team for key functions"}
• Implement inventory management and forecasting
• Expand to additional sales channels (Amazon, etc.)
• ${isLowBudget ? "Gradual expansion to international markets" : "Aggressive market expansion and partnerships"}

**Timeline:** ${isPartTime ? "20-26 weeks" : "14 weeks"}
**Success Metrics:** $50K+ monthly revenue, systematized operations, team delegation`;
    }

    else if (businessType === "tech") {
      return `### Phase 1: Validation & MVP Planning (Weeks 1-8)
**Main Objective:** Validate core problem and plan technical solution

**Key Steps (Tailored to Your Context):**
• Complete validation experiments (customer interviews + mockup testing)
• ${hasTechSkills ? "Design technical architecture and choose tech stack" : "Find technical co-founder or development partner"}
• Create detailed product requirements document
• ${isLowBudget ? "Plan no-code/low-code MVP approach" : "Assemble development team"}

**Free/Low-Cost Tools:**
• Figma (free design and prototyping)
• ${hasTechSkills ? "GitHub (free), VS Code (free)" : "No-code platforms: Bubble ($29/month), Webflow ($23/month)"}
• Google Analytics (free)
• Hotjar (free tier for user behavior)

**Timeline:** ${isPartTime ? "10-12 weeks" : "8 weeks"}
**Success Metrics:** Clear product roadmap, technical feasibility confirmed, development plan

### Phase 2: MVP Development (Weeks 9-20)
**Main Objective:** Build and launch minimum viable product

**Key Steps:**
• ${hasTechSkills ? "Develop core features yourself" : isLowBudget ? "Use no-code tools for rapid prototyping" : "Work with development team ($5K-15K budget)"}
• Set up basic analytics and user tracking
• Create landing page and onboarding flow
• ${hasMarketingSkills ? "Build content marketing strategy" : "Focus on product-led growth features"}

**Timeline:** ${isPartTime ? "16-20 weeks" : "12 weeks"}
**Success Metrics:** Working MVP, first 100 active users, user feedback loop established

### Phase 3: Growth & Product-Market Fit (Weeks 21-36)
**Main Objective:** Achieve product-market fit and sustainable growth

**Key Steps:**
• Iterate based on user feedback and usage data
• ${hasMarketingSkills ? "Scale content and social marketing" : "Implement referral and viral features"}
• ${isLowBudget ? "Bootstrap growth through user referrals" : "Invest in paid user acquisition ($2K-5K/month)"}
• Build customer success and retention systems

**Timeline:** ${isPartTime ? "24-30 weeks" : "16 weeks"}
**Success Metrics:** 1000+ active users, positive unit economics, clear growth trajectory`;
    }

    else if (businessType === "consulting") {
      return `### Phase 1: Authority Building (Weeks 1-6)
**Main Objective:** Establish expertise and generate first clients

**Key Steps (Tailored to Your Context):**
• Complete validation experiments (free consultations + content)
• ${skills.includes("industry") ? "Leverage existing industry connections" : "Build network through LinkedIn and industry events"}
• Create content showcasing expertise (blog posts, case studies)
• ${hasMarketingSkills ? "Develop comprehensive content marketing strategy" : "Focus on networking and referral generation"}

**Free/Low-Cost Tools:**
• LinkedIn (free + Sales Navigator $80/month if budget allows)
• ${isLowBudget ? "Free blog platform (Medium, LinkedIn articles)" : "Professional website (Squarespace $18/month)"}
• Zoom (free for client calls)
• Calendly (free scheduling)

**Timeline:** ${isPartTime ? "8-10 weeks" : "6 weeks"}
**Success Metrics:** 5+ paying clients, testimonials collected, referral system active

### Phase 2: Service Systematization (Weeks 7-18)
**Main Objective:** Create scalable service delivery and pricing

**Key Steps:**
• Develop standardized service packages and frameworks
• ${isPartTime ? "Focus on high-value, low-time clients" : "Scale to handle 10-15 clients simultaneously"}
• Create templates, tools, and processes for efficiency
• ${hasMarketingSkills ? "Scale content marketing and thought leadership" : "Build partnership network for referrals"}

**Timeline:** ${isPartTime ? "16-20 weeks" : "12 weeks"}
**Success Metrics:** $10K+ monthly revenue, 80%+ client retention, systematized delivery

### Phase 3: Business Scaling (Weeks 19-32)
**Main Objective:** Scale beyond personal time through systems and team

**Key Steps:**
• ${isPartTime ? "Consider transitioning to full-time or hiring support" : "Hire junior consultants or virtual assistants"}
• Create digital products (courses, templates, software tools)
• ${isLowBudget ? "Focus on organic growth and partnerships" : "Invest in professional marketing and business development"}
• Explore recurring revenue models (retainers, subscriptions)

**Timeline:** ${isPartTime ? "20-26 weeks" : "14 weeks"}
**Success Metrics:** $25K+ monthly revenue, team delegation, passive income streams`;
    }

    else {
      return `### Phase 1: Market Validation (Weeks 1-6)
**Main Objective:** Confirm market demand and refine offering

**Key Steps:**
• Execute validation experiments
• ${skills.includes("industry") ? "Leverage existing knowledge for faster market understanding" : "Conduct thorough market research and competitor analysis"}
• Refine value proposition based on customer feedback
• ${hasMarketingSkills ? "Build marketing foundation" : "Focus on direct sales and networking"}

**Timeline:** ${isPartTime ? "8-10 weeks" : "6 weeks"}
**Success Metrics:** Clear customer segments, validated pricing, initial sales

### Phase 2: Business Development (Weeks 7-18)
**Main Objective:** Build sustainable operations and customer base

**Key Steps:**
• ${isLowBudget ? "Bootstrap growth with minimal investment" : "Invest in quality tools and systems"}
• Develop operational processes and quality control
• ${hasMarketingSkills ? "Scale marketing efforts" : "Focus on customer referrals and partnerships"}
• Build team if needed for key functions

**Timeline:** ${isPartTime ? "16-20 weeks" : "12 weeks"}
**Success Metrics:** Predictable revenue, operational efficiency, growth trajectory

### Phase 3: Growth & Optimization (Weeks 19-32)
**Main Objective:** Scale and optimize for long-term success

**Key Steps:**
• ${isPartTime ? "Optimize for part-time management" : "Build full management systems"}
• Expand market reach and product/service offerings
• ${isLowBudget ? "Reinvest profits strategically" : "Explore funding options for rapid expansion"}
• Implement advanced analytics and optimization

**Timeline:** ${isPartTime ? "20-26 weeks" : "14 weeks"}
**Success Metrics:** Sustainable growth, market position, scalable systems`;
    }
  };

  const generateNextSteps = (businessType: string, context: any) => {
    const isPartTime = context.timeCommitment?.includes("5-10 hours");
    const isLowBudget = context.budget?.includes("Under $1,000");
    
    return `### 📅 This Week (Start Immediately)
${isPartTime ? "**Focus: 2-3 hours of high-impact activities**" : "**Focus: Foundation building**"}

1. **Day 1-2:** Set up basic business structure
   ${isLowBudget ? "• Free business name check + social media handles" : "• Register business name and social handles"}
   • Create simple landing page (Carrd, Wix, or Squarespace)
   
2. **Day 3-5:** Launch first validation experiment
   • ${businessType === "consulting" ? "Reach out to 10 potential clients for free consultation" : "Set up and promote your validation test"}
   • Document all feedback and responses
   
3. **Day 6-7:** Plan next week's activities
   • Schedule time blocks for business development
   • ${isPartTime ? "Set realistic weekly goals (5-8 hours total)" : "Create daily action plan"}

### 📅 This Month (Build Momentum)
**Focus: Validation completion and MVP planning**

**Week 2:** Complete second validation experiment
**Week 3:** Analyze results and refine business model  
**Week 4:** ${isLowBudget ? "Plan bootstrap approach for MVP development" : "Secure resources (team, tools, funding) for Phase 1"}

**Monthly Goals:**
• Complete both validation experiments
• ${businessType === "consulting" ? "Secure 2-3 paying clients" : "Prove market demand exists"}
• ${isPartTime ? "Establish sustainable work routine" : "Build full business development rhythm"}
• Set up basic business operations (banking, accounting, legal)

### 📅 Next Quarter (Scale Foundation)
**Focus: MVP launch and initial growth**

**Month 2:** ${businessType === "tech" ? "Complete MVP development" : businessType === "consulting" ? "Systematize service delivery" : "Launch initial product/service offering"}
**Month 3:** Gather customer feedback and iterate rapidly
**Month 4:** ${isPartTime ? "Optimize for part-time efficiency" : "Scale to sustainable growth metrics"}

**Quarterly Goals:**
• ${businessType === "consulting" ? "$5K+ monthly recurring revenue" : "First 100 customers/users"}
• Operational systems in place
• ${isPartTime ? "Proven part-time business model" : "Clear path to full-time viability"}
• Team expansion planning (if applicable)`;
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;
    
    const userMessage = message;
    setMessages(prev => [...prev, { type: "user", content: userMessage }]);
    setMessage("");
    
    if (conversationState === "initial") {
      // First message - collect business idea and ask for context
      setUserContext(prev => ({ ...prev, businessIdea: userMessage }));
      setConversationState("gathering_context");
      
      setTimeout(() => {
        const contextQuestions = gatherContextQuestions(userMessage);
        setMessages(prev => [...prev, { 
          type: "assistant", 
          content: contextQuestions
        }]);
      }, 1000);
      
    } else if (conversationState === "gathering_context") {
      // Second message - parse context and call GPT-5 for analysis
      const contextData = parseUserContext(userMessage);
      const fullContext = { ...userContext, ...contextData };
      setUserContext(fullContext);
      setConversationState("analysis");
      
      // Add loading message
      setMessages(prev => [...prev, { 
        type: "assistant", 
        content: "🤖 Analyzing your business idea with GPT-5... This may take a moment while I create your personalized business plan."
      }]);
      
      try {
        const analysis = await callGPT5Analysis(userContext.businessIdea, fullContext);
        
        // Replace loading message with analysis
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            type: "assistant", 
            content: analysis
          };
          return newMessages;
        });
        
      } catch (error) {
        // Replace loading message with error
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { 
            type: "assistant", 
            content: "I apologize, but I encountered an issue generating your analysis. Please try again, and I'll do my best to help you with your business plan."
          };
          return newMessages;
        });
      }
      
    } else {
      // Follow-up questions - could also be enhanced with GPT-5
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          type: "assistant", 
          content: "I'd be happy to help you refine any part of this plan! You can ask me to:\n\n• Adjust the timeline based on your constraints\n• Provide more details on specific phases\n• Suggest alternative approaches for your budget\n• Help with specific challenges you're facing\n\nWhat would you like to explore further?"
        }]);
      }, 1000);
    }
  };

  const parseUserContext = (contextMessage: string) => {
    const message = contextMessage.toLowerCase();
    
    let budget = "";
    let skills = "";
    let timeCommitment = "";
    
    // Parse budget
    if (message.includes("under $1,000") || message.includes("under 1000") || message.includes("bootstrap")) {
      budget = "Under $1,000";
    } else if (message.includes("1,000") && message.includes("10,000")) {
      budget = "$1,000 - $10,000";
    } else if (message.includes("10,000+") || message.includes("substantial")) {
      budget = "$10,000+";
    }
    
    // Parse skills
    const skillCategories = [];
    if (message.includes("technical") || message.includes("coding") || message.includes("development")) {
      skillCategories.push("Technical");
    }
    if (message.includes("marketing") || message.includes("social media") || message.includes("content")) {
      skillCategories.push("Marketing");
    }
    if (message.includes("sales") || message.includes("customer") || message.includes("negotiations")) {
      skillCategories.push("Sales");
    }
    if (message.includes("operations") || message.includes("project management") || message.includes("logistics")) {
      skillCategories.push("Operations");
    }
    if (message.includes("industry") || message.includes("domain") || message.includes("expertise")) {
      skillCategories.push("Industry expertise");
    }
    if (message.includes("none") || message.includes("starting fresh") || message.includes("no skills")) {
      skillCategories.push("Starting fresh");
    }
    skills = skillCategories.join(", ");
    
    // Parse time commitment
    if (message.includes("5-10") || message.includes("side project")) {
      timeCommitment = "5-10 hours (side project while working)";
    } else if (message.includes("20-30") || message.includes("part-time")) {
      timeCommitment = "20-30 hours (part-time focus)";
    } else if (message.includes("40+") || message.includes("full-time")) {
      timeCommitment = "40+ hours (full-time commitment)";
    }
    
    return { budget, skills, timeCommitment };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
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
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>BizMap AI - Transform Business Ideas into Action Plans</title>
        <meta name="description" content="Turn your business ideas into actionable business plans with our AI-powered BizMap AI assistant. Get step-by-step guidance to launch and grow your business." />
      </Helmet>
      
      <Navigation />
      
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              BizMap AI
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your business ideas into actionable plans with AI guidance
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Instructions Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    How to Use BizMap AI
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-xs font-semibold text-primary">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Share Your Business Idea</h4>
                        <p className="text-sm text-muted-foreground">Tell me about your business concept, startup idea, or business plan. Be as specific or general as you'd like.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-xs font-semibold text-primary">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Get Business Strategy</h4>
                        <p className="text-sm text-muted-foreground">I'll help you break down your business idea into manageable steps and create a strategic business plan.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-xs font-semibold text-primary">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">Receive Business Plan</h4>
                        <p className="text-sm text-muted-foreground">Get a detailed business roadmap with market analysis, financial projections, and actionable next steps.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    What I Can Help With
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      "Business strategy and planning",
                      "Market research and analysis",
                      "Financial planning and projections", 
                      "Marketing and sales strategies",
                      "Product development roadmaps",
                      "Funding and investment guidance",
                      "Operations and scaling plans",
                      "Risk assessment and mitigation"
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
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">BizMap AI Assistant</h4>
                        <p className="text-sm text-muted-foreground">Ready to help you plan your business</p>
                      </div>
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
                        <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                          msg.type === "user"
                            ? "bg-primary text-primary-foreground rounded-br-none"
                            : "bg-muted rounded-bl-none"
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-border/50">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Describe your business idea or business plan..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1"
                      />
                      <Button onClick={handleSendMessage} size="icon" disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Share your business idea and I'll help you create a business plan
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BizMapAI;