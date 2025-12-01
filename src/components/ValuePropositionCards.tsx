import { Lightbulb, Users, Rocket, Sparkles, LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ValuePropositionCards = () => {
  // All cards in a single row with semantic RGB color assignments
  const allCards = [
    {
      icon: Lightbulb,
      title: "PLAN",
      subtitle: "BizMap AI",
      description: "Transform scattered ideas into a strategic roadmap. Get AI-powered market research, competitor analysis, and actionable steps to launch your creative business in 30 days.",
      cta: "Start Planning",
      link: "/bizmap-ai",
      color: "planning", // Blue for planning/trust
      metric: "30-day launch"
    },
    {
      icon: Users,
      title: "SHARE",
      subtitle: "Community",
      description: "Join creative entrepreneurs who get it. Share your journey, celebrate wins, get honest feedback, and find accountability partners who'll keep you moving forward.",
      cta: "Join Community",
      link: "/community",
      color: "action", // Red for action/urgency
      metric: "Active community"
    },
    {
      icon: LayoutDashboard,
      title: "EXECUTE",
      subtitle: "Dashboard",
      description: "Your command center for tracking progress, managing tasks, and monitoring your business progress. Track daily check-ins, maintain momentum streaks, and manage priorities, all in one place.",
      cta: "View Dashboard",
      link: "/dashboard",
      color: "growth", // Green for growth/success
      metric: "Track progress"
    },
    {
      icon: Sparkles,
      title: "EXPLORE",
      subtitle: "Prompt Library",
      description: "Discover tested prompt-chains from uprising industries. Jumpstart your business planning with proven frameworks across AI, e-commerce, SaaS, and more, ready to be used at BizMap AI.",
      cta: "Learn Prompts",
      link: "/prompt-library",
      color: "planning" // Blue for planning/exploration
    },
    {
      icon: Rocket,
      title: "FUNDRAISE",
      subtitle: "Insighta",
      description: "Access a complete fundraising toolkit designed for entrepreneurs and founders. Discover curated accelerator programs, assess your investment readiness, and find practical resources that help you craft a winning strategy.",
      cta: "Explore Insighta",
      link: "/insighta",
      color: "growth" // Green for growth/fundraising success
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-background relative overflow-hidden">
      {/* Subtle grid pattern - reduced opacity */}
      <div className="absolute inset-0 dark:opacity-[0.02] opacity-[0.01]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 px-4">
          <h2 className="text-headline-lg sm:text-headline-xl font-bold mb-4 sm:mb-6 gradient-unified">
            Here's What You Get
          </h2>
          <p className="text-body sm:text-body-lg text-foreground/90 max-w-3xl mx-auto">
            Transform your idea into an investable, revenue-driving business. The perfect ecosystem for early-stage founders and entrepreneurs serious about building a lasting venture.
          </p>
        </div>

        {/* All Cards - Single Row */}
        <div className="flex flex-row gap-4 md:gap-6 mx-auto overflow-x-auto pb-4">
          {allCards.map((card, index) => {
            const Icon = card.icon;
            const colorClasses = {
              planning: {
                border: 'border-planning/30 hover:border-planning/60',
                bg: 'bg-planning/10 group-hover:bg-planning/20',
                text: 'text-planning',
                textHover: 'text-planning group-hover:text-planning/90',
                metric: 'text-planning/80',
                gradient: 'bg-gradient-planning',
                glass: 'glass-blue',
                shadow: 'hover:shadow-planning/20'
              },
              action: {
                border: 'border-action/30 hover:border-action/60',
                bg: 'bg-action/10 group-hover:bg-action/20',
                text: 'text-action',
                textHover: 'text-action group-hover:text-action/90',
                metric: 'text-action/80',
                gradient: 'bg-gradient-action',
                glass: 'glass-red',
                shadow: 'hover:shadow-action/20'
              },
              growth: {
                border: 'border-growth/30 hover:border-growth/60',
                bg: 'bg-growth/10 group-hover:bg-growth/20',
                text: 'text-growth',
                textHover: 'text-growth group-hover:text-growth/90',
                metric: 'text-growth/80',
                gradient: 'bg-gradient-growth',
                glass: 'glass-green',
                shadow: 'hover:shadow-growth/20'
              }
            };
            const colors = colorClasses[card.color as keyof typeof colorClasses];
            
            return (
              <Card 
                key={index} 
                className={`relative overflow-hidden group hover:shadow-lg transition-all duration-200 border ${colors.border} hover:-translate-y-1 cursor-pointer flex-shrink-0 min-w-[200px] md:min-w-[240px] flex-1`}
              >
                <Link to={card.link} className="block h-full">
                  <CardContent className="relative p-6 md:p-8 flex flex-col h-full items-center">
                    {/* Icon - simplified */}
                    <div className="mb-4">
                      <div className={`w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center transition-transform duration-200 group-hover:scale-105`}>
                        <Icon className={`w-6 h-6 ${colors.text}`} />
                      </div>
                    </div>

                    {/* Title - simplified */}
                    <div className="mb-3 text-center">
                      <div className={`text-xs font-bold mb-1 ${colors.text}`}>
                        {card.title}
                      </div>
                      <h3 className="text-base font-semibold mb-1">
                        {card.subtitle}
                      </h3>
                      {card.metric && (
                        <p className={`text-xs font-medium ${colors.metric}`}>{card.metric}</p>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-foreground/80 mb-6 flex-grow leading-relaxed text-left w-full">
                      {card.description}
                    </p>

                    {/* CTA Button - simplified */}
                    <div className="w-full">
                      <Button 
                        variant="outline" 
                        className={`w-full text-sm border ${colors.border} transition-colors duration-200`}
                        style={{
                          ...(card.color === 'planning' && { '--hover-bg': 'hsl(var(--blue-primary) / 0.1)' }),
                          ...(card.color === 'action' && { '--hover-bg': 'hsl(var(--red-primary) / 0.1)' }),
                          ...(card.color === 'growth' && { '--hover-bg': 'hsl(var(--green-primary) / 0.1)' }),
                        }}
                        onMouseEnter={(e) => {
                          if (card.color === 'planning') {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--blue-primary) / 0.1)';
                          } else if (card.color === 'action') {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--red-primary) / 0.1)';
                          } else if (card.color === 'growth') {
                            e.currentTarget.style.backgroundColor = 'hsl(var(--green-primary) / 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '';
                        }}
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
