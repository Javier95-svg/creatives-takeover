import { Lightbulb, Users, Rocket, Sparkles, LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ValuePropositionCards = () => {
  const allCards = [
    {
      icon: Lightbulb,
      title: "PLAN",
      subtitle: "BizMap AI",
      description: "Transform scattered ideas into a strategic roadmap. Get AI-powered market research, competitor analysis, and actionable steps to launch your creative business in 30 days.",
      cta: "Start Planning",
      link: "/bizmap-ai",
      metric: "30-day launch"
    },
    {
      icon: Users,
      title: "SHARE",
      subtitle: "Community",
      description: "Join creative entrepreneurs who get it. Share your journey, celebrate wins, get honest feedback, and find accountability partners who'll keep you moving forward.",
      cta: "Join Community",
      link: "/community",
      metric: "Active community"
    },
    {
      icon: LayoutDashboard,
      title: "EXECUTE",
      subtitle: "Dashboard",
      description: "Your command center for tracking progress, managing tasks, and monitoring your business progress. Track daily check-ins, maintain momentum streaks, and manage priorities, all in one place.",
      cta: "View Dashboard",
      link: "/dashboard",
      metric: "Track progress"
    },
    {
      icon: Sparkles,
      title: "EXPLORE",
      subtitle: "Prompt Library",
      description: "Discover tested prompt-chains from uprising industries. Jumpstart your business planning with proven frameworks across AI, e-commerce, SaaS, and more, ready to be used at BizMap AI.",
      cta: "Learn Prompts",
      link: "/prompt-library"
    },
    {
      icon: Rocket,
      title: "FUNDRAISE",
      subtitle: "Insighta",
      description: "Access a complete fundraising toolkit designed for entrepreneurs and founders. Discover curated accelerator programs, assess your investment readiness, and find practical resources that help you craft a winning strategy.",
      cta: "Explore Insighta",
      link: "/insighta"
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-background relative">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-foreground leading-tight">
            Here's What You Get
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Transform your idea into an investable, revenue-driving business. The perfect ecosystem for early-stage founders and entrepreneurs serious about building a lasting venture.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allCards.map((card, index) => {
            const Icon = card.icon;
            
            return (
              <Card 
                key={index} 
                className="border-border hover:shadow-lg transition-shadow duration-300 flex flex-col h-full"
              >
                <Link to={card.link} className="block h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    {/* Icon */}
                    <div className="mb-4">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                        {card.title}
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-1">
                        {card.subtitle}
                      </h3>
                      {card.metric && (
                        <p className="text-sm text-muted-foreground">{card.metric}</p>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-6 flex-grow leading-relaxed">
                      {card.description}
                    </p>

                    {/* CTA Button */}
                    <div className="w-full">
                      <Button 
                        variant="outline" 
                        className="w-full"
                      >
                        {card.cta}
                      </Button>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ValuePropositionCards;
