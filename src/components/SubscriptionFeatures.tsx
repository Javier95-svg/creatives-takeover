import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Check,
  Sparkles,
  Target,
  BarChart3,
  ChevronDown
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const SubscriptionFeatures = () => {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const features = [
    {
      icon: <MessageSquare className="w-10 h-10 text-primary" />,
      title: "Business Planning",
      description: "Get personalized business insights with our BizMap Creative Operating System and strategic planning tools.",
      benefits: ["Business analysis & insights", "Custom launch reports", "Strategic recommendations"],
      highlight: "Core Feature",
      details: "Our AI-powered business planning system analyzes your ideas, market conditions, and competitive landscape to provide actionable insights. Get step-by-step guidance from ideation to launch."
    },
    {
      icon: <Users className="w-10 h-10 text-primary" />,
      title: "Community & Collaboration",
      description: "Connect with fellow entrepreneurs and collaborate on projects in real-time.",
      benefits: ["Entrepreneur community", "Real-time collaboration", "Team workspaces"],
      highlight: "Most Popular",
      details: "Join thousands of entrepreneurs sharing insights, feedback, and support. Collaborate with your team using whiteboards, video calls, and shared workspaces designed for distributed teams."
    },
    {
      icon: <TrendingUp className="w-10 h-10 text-primary" />,
      title: "Market Intelligence",
      description: "Stay ahead with real-time market insights and trend analysis for your industry.",
      benefits: ["Market trend analysis", "Industry insights", "Opportunity detection"],
      highlight: "New",
      details: "Access real-time market data, emerging trends, and competitive intelligence. Our AI monitors thousands of sources to identify opportunities before your competitors do."
    },
    {
      icon: <Target className="w-10 h-10 text-primary" />,
      title: "Sprint Planning & Kanban",
      description: "Organize your projects with advanced sprint planning and Kanban board management.",
      benefits: ["Sprint planning tools", "Kanban boards", "Progress tracking"],
      highlight: "",
      details: "Break down big goals into manageable sprints. Visualize your workflow, track progress, and maintain momentum with daily check-ins and accountability features."
    },
    {
      icon: <Sparkles className="w-10 h-10 text-primary" />,
      title: "Prompt Library",
      description: "Access our curated collection of business prompts and templates for various scenarios.",
      benefits: ["Curated business prompts", "Template library", "Export functionality"],
      highlight: "",
      details: "Leverage hundreds of proven business prompts and templates. From pitch decks to financial models, get professional-grade resources tailored to your industry and stage."
    },
    {
      icon: <BarChart3 className="w-10 h-10 text-primary" />,
      title: "Success Analytics",
      description: "Track your business performance with detailed analytics and success scoring.",
      benefits: ["Business success scores", "Performance tracking", "Analytics dashboard"],
      highlight: "",
      details: "Measure what matters with our comprehensive analytics suite. Track KPIs, monitor progress, and get AI-powered recommendations to improve your success trajectory."
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-muted/30" id="features">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Platform Features
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Everything You Need to Build Your Business
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our comprehensive platform combines business planning, community collaboration, 
            and market intelligence to accelerate your entrepreneurial journey.
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