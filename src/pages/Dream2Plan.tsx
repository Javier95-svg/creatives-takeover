import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, User, Lightbulb, Target, Rocket, CheckCircle } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";

const BizMapAI = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      type: "assistant",
      content: "Welcome to BizMap AI! I'm here to help you transform your business ideas into actionable business plans. What's your business idea or concept you'd like to work on?"
    }
  ]);

  const generateBusinessAnalysis = (userInput: string) => {
    const input = userInput.toLowerCase();
    
    // Determine business type for tailored analysis
    let businessType = "general";
    let viabilityScore = 7;
    let marketPotential = "";
    let risks = "";
    let opportunities = "";
    let improvements = [];
    
    if (input.includes("e-commerce") || input.includes("online store") || input.includes("selling online")) {
      businessType = "e-commerce";
      viabilityScore = 8;
      marketPotential = "High growth potential with global reach. E-commerce market continues expanding with $6.2T projected by 2024.";
      risks = "High competition, customer acquisition costs, inventory management, payment security.";
      opportunities = "Niche targeting, social commerce integration, subscription models, international expansion.";
      improvements = [
        "Focus on a specific niche or demographic to reduce competition and build brand loyalty",
        "Implement data-driven marketing strategies using customer behavior analytics",
        "Consider starting with dropshipping or print-on-demand to minimize initial inventory risks"
      ];
    } else if (input.includes("app") || input.includes("mobile") || input.includes("software")) {
      businessType = "tech/app";
      viabilityScore = 6;
      marketPotential = "Large addressable market but highly competitive. Success depends on unique value proposition and execution.";
      risks = "High development costs, user acquisition challenges, platform dependencies, rapid technology changes.";
      opportunities = "Scalable business model, potential for viral growth, data monetization, platform partnerships.";
      improvements = [
        "Validate the core problem with potential users before building to ensure product-market fit",
        "Start with an MVP focusing on one key feature rather than building a comprehensive solution",
        "Consider freemium or subscription models for sustainable revenue streams"
      ];
    } else if (input.includes("restaurant") || input.includes("food") || input.includes("café") || input.includes("catering")) {
      businessType = "food service";
      viabilityScore = 5;
      marketPotential = "Steady local demand but location-dependent. Food service industry worth $800B+ annually.";
      risks = "High overhead costs, thin profit margins, food safety regulations, staffing challenges, location dependency.";
      opportunities = "Local community building, delivery partnerships, catering expansion, unique dining experiences.";
      improvements = [
        "Conduct thorough location analysis including foot traffic, demographics, and competition density",
        "Develop a unique concept or cuisine specialization to differentiate from competitors",
        "Plan for multiple revenue streams (dine-in, delivery, catering, retail products)"
      ];
    } else if (input.includes("consulting") || input.includes("freelance") || input.includes("service")) {
      businessType = "consulting";
      viabilityScore = 8;
      marketPotential = "Low startup costs with high profit margins. Professional services market growing steadily.";
      risks = "Income volatility, client dependency, scaling limitations, competition from larger firms.";
      opportunities = "Expertise monetization, recurring revenue models, digital course creation, partnership networks.";
      improvements = [
        "Define a specific niche where you can become recognized as an expert authority",
        "Create standardized processes and frameworks to improve delivery efficiency and quality",
        "Build recurring revenue through retainer agreements or productized consulting offerings"
      ];
    } else {
      viabilityScore = 7;
      marketPotential = "Market potential depends on execution, differentiation, and customer validation.";
      risks = "Market competition, customer acquisition, operational challenges, financial management.";
      opportunities = "Innovation potential, market gaps, customer relationship building, scalable systems.";
      improvements = [
        "Conduct thorough market research to identify your target customer and their specific pain points",
        "Develop a minimum viable product (MVP) to test assumptions before full investment",
        "Create a strong value proposition that clearly differentiates you from existing solutions"
      ];
    }

    return `# Business Analysis Report

## 💡 Idea Overview
"${userInput}"

## 📊 Viability Assessment

### Market Potential
${marketPotential}

### Key Risks
${risks}

### Growth Opportunities  
${opportunities}

### **Viability Score: ${viabilityScore}/10**

---

## 🚀 Improvement Recommendations

${improvements.map((improvement, index) => `**${index + 1}.** ${improvement}`).join('\n\n')}

---

## 📋 Execution Blueprint

### **Phase 1: Validation (Weeks 1-4)**
**Goal:** Validate market demand and refine your concept

**Key Actions:**
- Conduct 20+ customer interviews with target audience
- Research competitors and analyze their strengths/weaknesses  
- Create customer personas and pain point mapping
- Validate pricing assumptions with potential customers

**Tools & Resources:**
- Google Forms/Typeform for surveys
- LinkedIn/Facebook for customer outreach
- SEMrush/Ahrefs for competitor analysis
- Google Trends for market interest validation

**Timeline:** 4 weeks
**Success Metric:** Clear evidence of customer demand and willingness to pay

### **Phase 2: MVP Development (Weeks 5-12)**
**Goal:** Build and test minimum viable product

**Key Actions:**
- Design core features based on validation feedback
- Develop MVP with essential functionality only
- Set up basic business operations (legal, accounting)
- Create initial marketing materials and website

**Tools & Resources:**
${businessType === "tech/app" ? "- No-code tools (Bubble, Webflow) or development team\n- Figma for design\n- Firebase/Supabase for backend" : 
  businessType === "e-commerce" ? "- Shopify/WooCommerce for platform\n- Canva for product photography\n- Stripe/PayPal for payments" :
  businessType === "food service" ? "- POS systems (Square, Toast)\n- Food supplier connections\n- Local permit and licensing\n- Kitchen equipment sourcing" :
  "- Industry-specific tools and platforms\n- Professional website builder\n- Basic CRM system"}
- Google Analytics for tracking
- Basic accounting software (QuickBooks, FreshBooks)

**Timeline:** 8 weeks  
**Success Metric:** Working MVP with first paying customers

### **Phase 3: Marketing & Growth (Weeks 13-24)**
**Goal:** Scale customer acquisition and optimize operations

**Key Actions:**
- Launch digital marketing campaigns (social media, SEO, paid ads)
- Gather customer feedback and iterate on product/service
- Implement customer retention strategies
- Build partnerships and referral programs

**Tools & Resources:**
- Social media management (Buffer, Hootsuite)
- Email marketing (Mailchimp, ConvertKit)  
- SEO tools (Google Search Console, Ubersuggest)
- Customer feedback platforms (Intercom, Hotjar)
- Analytics and attribution tracking

**Timeline:** 12 weeks
**Success Metric:** Predictable customer acquisition channels and positive unit economics

### **Phase 4: Scaling (Weeks 25-52)**  
**Goal:** Systematize operations and accelerate growth

**Key Actions:**
- Hire key team members for critical functions
- Implement scalable systems and processes
- Explore additional revenue streams or market expansion
- Secure growth funding if needed

**Tools & Resources:**
- HR platforms (BambooHR, Gusto)
- Project management (Asana, Monday.com)
- Advanced analytics and reporting tools
- Legal and compliance management
- Investor relations platforms if pursuing funding

**Timeline:** 28 weeks
**Success Metric:** Sustainable growth rate with systematized operations

---

## 🎯 Next Steps

1. **This Week:** Start customer interviews to validate your assumptions
2. **This Month:** Complete market research and competitor analysis  
3. **Next 90 Days:** Build and launch your MVP

Remember: Focus on solving a real problem for real customers. Every successful business starts with understanding and serving customer needs better than anyone else.

*This analysis can be copied and saved as your business planning reference document.*`;
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    const userMessage = message;
    setMessages([...messages, { type: "user", content: userMessage }]);
    setMessage("");
    
    // Generate comprehensive business analysis
    setTimeout(() => {
      const analysis = generateBusinessAnalysis(userMessage);
      setMessages(prev => [...prev, { 
        type: "assistant", 
        content: analysis
      }]);
    }, 1500);
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
                      <Button onClick={handleSendMessage} size="icon">
                        <Send className="w-4 h-4" />
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