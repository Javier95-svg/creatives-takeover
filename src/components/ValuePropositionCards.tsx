import { Lightbulb, Users, Rocket, LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ValuePropositionCards = () => {
  // Core value propositions - condensed to 4 essential offerings
  const allCards = [
    {
      icon: Lightbulb,
      title: "PLAN",
      subtitle: "BizMap AI",
      description: "Transform scattered ideas into a strategic roadmap. Get AI-powered market research, competitor analysis, and actionable steps to launch your creative business in 30 days.",
      cta: "Start Planning",
      link: "/bizmap-ai",
      color: "planning", // Blue for planning/trust
      metric: "Design your plan"
    },
    {
      icon: Users,
      title: "CONNECT",
      subtitle: "Community",
      description: "Connect with vetted startup mentors and coaches. Get hands-on guidance, actionable feedback on your roadmap and pitch, and practical support to accelerate your startup growth from idea to funding.",
      cta: "Join Community",
      link: "/community",
      color: "action", // Red for action/urgency
      metric: "Access mentorship"
    },
    {
      icon: LayoutDashboard,
      title: "EXECUTE",
      subtitle: "Dashboard",
      description: "Your command center for tracking progress, managing tasks, and monitoring your business growth. Track daily check-ins, maintain momentum streaks, and manage priorities, all in one place.",
      cta: "View Dashboard",
      link: "/dashboard",
      color: "growth", // Green for growth/success
      metric: "Track your progress"
    },
    {
      icon: Rocket,
      title: "FUNDRAISE",
      subtitle: "Insighta",
      description: "Access a complete fundraising toolkit designed for entrepreneurs and founders. Discover curated accelerator programs, assess your investment readiness, and find practical resources that help you craft a winning strategy.",
      cta: "Explore Insighta",
      link: "/insighta",
      color: "planning", // Blue for planning/fundraising
      metric: "Find your VC"
    }
  ];

  return (
    <section className="py-section-mobile lg:py-section-desktop bg-background relative overflow-hidden bg-gradient-rgb-subtle">
      {/* RGB gradient overlay */}
      <div className="absolute inset-0 bg-gradient-rgb-soft opacity-30" />
      
      {/* Subtle grid pattern - adjusts for theme */}
      <div className="absolute inset-0 dark:opacity-[0.04] opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in px-4">
          <h2 className="text-headline-lg sm:text-headline-xl font-bold mb-4 sm:mb-6 pb-2">
            <span className="gradient-unified">Here's What You Get</span>
          </h2>
          <p className="text-body sm:text-body-lg text-foreground/85 max-w-3xl mx-auto leading-relaxed">
            Everything you need to go from idea to launch. Four core tools designed for creative entrepreneurs who want to build real, sustainable businesses.
          </p>
        </div>

        {/* Core Value Props - Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
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
                className={`relative overflow-hidden group hover:shadow-xl ${colors.shadow} transition-all duration-500 border-2 ${colors.border} animate-fade-in hover:-translate-y-2 cursor-pointer h-full`}
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: 'both'
                }}
              >
                {/* RGB gradient background overlay */}
                <div className={`absolute inset-0 ${colors.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
                
                <Link to={card.link} className="block h-full">
                  <CardContent className="relative p-5 md:p-6 flex flex-col h-full items-center">
                    {/* Icon with enhanced animations */}
                    <div className="mb-3">
                      <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 group-hover:shadow-lg`}>
                        <Icon className={`w-5 h-5 ${colors.text} group-hover:scale-110 transition-transform duration-500`} />
                      </div>
                    </div>

                    {/* Title with fade-in animation */}
                    <div className="mb-2 transform group-hover:scale-105 transition-transform duration-300 text-center">
                      <div className={`text-xs font-bold mb-1 transition-colors ${colors.textHover}`}>
                        {card.title}
                      </div>
                      <h3 className="text-base font-semibold group-hover:text-foreground transition-colors mb-1">
                        {card.subtitle}
                      </h3>
                      {card.metric && (
                        <p className={`text-xs font-semibold ${colors.metric}`}>{card.metric}</p>
                      )}
                    </div>

                    {/* Description with subtle animation - left aligned */}
                    <p className="text-xs text-muted-foreground mb-4 flex-grow group-hover:text-foreground/80 transition-colors duration-300 leading-relaxed text-left w-full">
                      {card.description}
                    </p>

                    {/* CTA Button with RGB gradient on hover */}
                    <div className="w-full">
                      <Button 
                        variant="outline" 
                        className={`w-full text-xs group-hover:text-primary-foreground group-hover:scale-105 group-hover:shadow-lg transition-all duration-300 relative overflow-hidden min-h-[40px] border-2 ${colors.border}`}
                        style={{
                          background: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (card.color === 'planning') {
                            e.currentTarget.style.background = 'var(--gradient-planning)';
                          } else if (card.color === 'action') {
                            e.currentTarget.style.background = 'var(--gradient-action)';
                          } else if (card.color === 'growth') {
                            e.currentTarget.style.background = 'var(--gradient-growth)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span className="relative z-10">{card.cta}</span>
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
