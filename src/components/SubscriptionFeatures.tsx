import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  MessageSquare, 
  Zap, 
  Users, 
  TrendingUp, 
  FileText, 
  BarChart3,
  ArrowRight,
  Check,
  Sparkles,
  Target
} from "lucide-react";

const SubscriptionFeatures = () => {
  const features = [
    {
      icon: <MessageSquare className="w-10 h-10 text-primary" />,
      title: "AI Business Planning",
      description: "Get personalized business insights with our BizMap AI Creative Operating System and strategic planning tools.",
      benefits: ["AI-powered business analysis", "Custom launch reports", "Strategic recommendations"],
      highlight: "Core Feature"
    },
    {
      icon: <Users className="w-10 h-10 text-primary" />,
      title: "Community & Collaboration",
      description: "Connect with fellow entrepreneurs and collaborate on projects in real-time.",
      benefits: ["Entrepreneur community", "Real-time collaboration", "Team workspaces"],
      highlight: "Most Popular"
    },
    {
      icon: <TrendingUp className="w-10 h-10 text-primary" />,
      title: "Market Intelligence",
      description: "Stay ahead with real-time market insights and trend analysis for your industry.",
      benefits: ["Market trend analysis", "Industry insights", "Opportunity detection"],
      highlight: "New"
    },
    {
      icon: <Target className="w-10 h-10 text-primary" />,
      title: "Sprint Planning & Kanban",
      description: "Organize your projects with advanced sprint planning and Kanban board management.",
      benefits: ["Sprint planning tools", "Kanban boards", "Progress tracking"],
      highlight: ""
    },
    {
      icon: <Sparkles className="w-10 h-10 text-primary" />,
      title: "Prompt Library",
      description: "Access our curated collection of business prompts and templates for various scenarios.",
      benefits: ["Curated business prompts", "Template library", "Export functionality"],
      highlight: ""
    },
    {
      icon: <BarChart3 className="w-10 h-10 text-primary" />,
      title: "Success Analytics",
      description: "Track your business performance with detailed analytics and success scoring.",
      benefits: ["Business success scores", "Performance tracking", "Analytics dashboard"],
      highlight: ""
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-muted/30" id="features">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            AI Solopreneur Platform Features
          </Badge>
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Everything You Need to Build Your Business
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our comprehensive platform combines AI-powered business planning, community collaboration, 
            and market intelligence to accelerate your entrepreneurial journey.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
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
                <ul className="space-y-3 mb-6">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center text-sm">
                      <Check className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubscriptionFeatures;