import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Users, 
  TrendingUp, 
  Check,
  Sparkles,
  LayoutDashboard,
  BookOpen,
  ChevronDown
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import PricingWallpaper from "@/components/wallpapers/PricingWallpaper";

const SubscriptionFeatures = () => {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const features = [
    {
      icon: <Bot className="w-10 h-10 text-primary" />,
      title: "BizMap AI",
      description: "Your AI co-founder that guides you through a 7-step business planning wizard to transform ideas into actionable roadmaps.",
      benefits: ["7-step interactive wizard", "AI-powered validation", "Success probability scoring", "Downloadable business roadmap"],
      highlight: "Core Feature",
      details: "Start with our BizMap AI Creative Operating System to analyze your business idea, validate market fit, and create a comprehensive 30-day launch strategy. Get real-time AI guidance, competitor analysis, and strategic recommendations tailored to your creative business."
    },
    {
      icon: <Users className="w-10 h-10 text-primary" />,
      title: "Community",
      description: "Connect with vetted startup mentors and coaches through discovery calls. Get hands-on guidance, actionable feedback on your roadmap and pitch, and practical support to accelerate your startup growth.",
      benefits: ["Discovery calls with mentors", "Vetted mentor network", "Actionable feedback & guidance", "Pitch review & support"],
      highlight: "Most Popular",
      details: "Access our curated mentorship marketplace featuring experienced startup mentors and coaches. Book discovery calls to get personalized guidance on your business roadmap, pitch deck, and growth strategy. Connect with mentors who have successfully built and scaled businesses, and get the support you need to accelerate from idea to funding."
    },
    {
      icon: <TrendingUp className="w-10 h-10 text-primary" />,
      title: "Insighta",
      description: "Your complete fundraising toolkit with investor matchmaking, readiness assessments, and curated funding opportunities to accelerate your path to investment.",
      benefits: ["Investor Matchmaker", "Insighta Test Assessment", "Funding opportunities", "Investment readiness tools"],
      highlight: "New",
      details: "Access a complete fundraising toolkit designed for entrepreneurs. Use the Investor Matchmaker to connect with potential investors, take the Insighta Test Assessment to evaluate your investment readiness, and discover curated funding opportunities and accelerator programs. Get the tools you need to craft a winning fundraising strategy."
    },
    {
      icon: <BookOpen className="w-10 h-10 text-primary" />,
      title: "Stories",
      description: "Read expert insights, real-world stories, and actionable advice from successful entrepreneurs and creative professionals.",
      benefits: ["Expert insights & articles", "Real-world success stories", "Actionable business advice", "LinkedIn post integration"],
      highlight: "",
      details: "Discover actionable insights, real-world stories, and expert advice from successful entrepreneurs and creative professionals. Learn from their experiences, mistakes, and triumphs as they build and grow their businesses. All stories are tagged and searchable by topic."
    },
    {
      icon: <LayoutDashboard className="w-10 h-10 text-primary" />,
      title: "Dashboard",
      description: "Your command center for tracking business progress, managing tasks, and monitoring your business growth. Stay organized and maintain momentum with daily check-ins and priority management.",
      benefits: ["Daily check-ins & goal tracking", "Task & priority management", "Business progress metrics", "Momentum streaks & gamification"],
      highlight: "",
      details: "Your personalized command center that helps you stay organized and motivated. Track your daily goals, manage priorities, monitor business progress, and maintain momentum with streak tracking. Get a clear view of your business health, upcoming tasks, and recent wins all in one place."
    },
    {
      icon: <Sparkles className="w-10 h-10 text-primary" />,
      title: "Prompt Library",
      description: "Access 30+ battle-tested prompts for AI, E-commerce, SaaS, and creative businesses with one-click copy.",
      benefits: ["4 industry categories", "One-click copy prompts", "BizMap AI integration", "Customizable templates"],
      highlight: "",
      details: "Leverage hundreds of proven business prompts and templates. From pitch decks to financial models, get professional-grade resources tailored to your industry and stage. Copy prompts directly into BizMap AI conversations for seamless workflow."
    }
  ];

  return (
    <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden" id="features">
      <PricingWallpaper />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="mb-6">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              Platform Features
            </Badge>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 pb-2 gradient-text">
            The Perfect Ecosystem
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get the tools, community, and insights you need to turn your idea into a real business. Start planning today and launch in 30 days.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const isExpanded = expandedCard === index;
            return (
              <Card 
                key={index} 
                className="relative glass border-border hover:shadow-xl transition-all duration-500 hover-lift group" 
                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              >
                {feature.highlight && (
                  <div className="absolute -top-3 left-6">
                    <Badge className={`${
                      feature.highlight === "Most Popular" ? "bg-primary" : "bg-green-500"
                    } text-white shadow-lg`}>
                      {feature.highlight}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="pb-4">
                  <div className="flex items-center mb-4">
                    <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors mr-4">
                      {feature.icon}
                    </div>
                  </div>
                  <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                  <CardDescription className="text-base text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <ul className="space-y-3 mb-4">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Collapsible open={isExpanded} onOpenChange={() => setExpandedCard(isExpanded ? null : index)}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-between text-sm"
                      >
                        Learn more
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature.details}
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SubscriptionFeatures;