import { Lightbulb, Users, Rocket, Sparkles, LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ValuePropositionCards = () => {
  // All cards in a single row
  const allCards = [
    {
      icon: Lightbulb,
      title: "PLAN",
      subtitle: "BizMap AI",
      description: "Transform scattered ideas into a strategic roadmap. Get AI-powered market research, competitor analysis, and actionable steps to launch your creative business in 30 days.",
      cta: "Start Planning",
      link: "/bizmap-ai",
      gradient: "from-primary/20 to-primary/5",
      metric: "30-day launch"
    },
    {
      icon: Users,
      title: "SHARE",
      subtitle: "Community",
      description: "Join creative entrepreneurs who get it. Share your journey, celebrate wins, get honest feedback, and find accountability partners who'll keep you moving forward.",
      cta: "Join Community",
      link: "/community",
      gradient: "from-secondary/20 to-secondary/5",
      metric: "Active community"
    },
    {
      icon: LayoutDashboard,
      title: "EXECUTE",
      subtitle: "Dashboard",
      description: "Your command center for tracking progress, managing tasks, and monitoring your business progress. Track daily check-ins, maintain momentum streaks, and manage priorities, all in one place.",
      cta: "View Dashboard",
      link: "/dashboard",
      gradient: "from-green-500/20 to-green-500/5",
      metric: "Track progress"
    },
    {
      icon: Sparkles,
      title: "EXPLORE",
      subtitle: "Prompt Library",
      description: "Discover tested prompt-chains from uprising industries. Jumpstart your business planning with proven frameworks across AI, e-commerce, SaaS, and more, ready to be used at BizMap AI.",
      cta: "Learn Prompts",
      link: "/prompt-library",
      gradient: "from-purple-500/20 to-purple-500/5"
    },
    {
      icon: Rocket,
      title: "FUNDRAISE",
      subtitle: "Insighta",
      description: "Access a complete fundraising toolkit designed for entrepreneurs and founders. Discover curated accelerator programs, assess your investment readiness, and find practical resources that help you craft a winning strategy.",
      cta: "Explore Insighta",
      link: "/insighta",
      gradient: "from-accent/20 to-accent/5"
    }
  ];

  return (
    <section className="py-20 lg:py-32 bg-background relative overflow-hidden">
      {/* Animated Blue Neon Wallpaper */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-background to-cyan-950/30" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px),
            linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      {/* Animated Glow Orbs */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Neon Light Streaks */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent animate-pulse" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-pulse" style={{ animationDelay: '1.5s' }} />
      
      {/* Floating Light Lines */}
      <div className="absolute top-1/4 left-1/5 w-32 h-1 bg-blue-500/40 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
      <div className="absolute bottom-1/3 right-1/5 w-24 h-1 bg-cyan-500/40 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.5)]" style={{ animationDelay: '1s' }} />
      
      {/* Scattered Plus Signs (representing solutions/additions) */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-32 left-32 text-blue-400 text-4xl font-bold">+</div>
        <div className="absolute top-48 right-40 text-cyan-400 text-3xl font-bold">+</div>
        <div className="absolute bottom-40 left-48 text-blue-500 text-5xl font-bold">+</div>
        <div className="absolute bottom-56 right-32 text-cyan-500 text-2xl font-bold">+</div>
        <div className="absolute top-1/2 left-1/3 text-blue-400 text-6xl font-bold">+</div>
        <div className="absolute top-1/3 right-1/4 text-cyan-400 text-3xl font-bold">+</div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in px-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 pb-2 bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            Here's What You Get
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Transform your idea into an investable, revenue-driving business. The perfect ecosystem for early-stage founders and entrepreneurs serious about building a lasting venture.
          </p>
        </div>

        {/* All Cards - Single Row */}
        <div className="flex flex-row gap-4 md:gap-6 max-w-7xl mx-auto overflow-x-auto pb-4">
          {allCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card 
                key={index} 
                className="relative overflow-hidden group hover:shadow-xl hover:shadow-primary/20 transition-all duration-500 border-2 hover:border-primary/50 animate-fade-in hover:-translate-y-2 cursor-pointer flex-shrink-0 min-w-[200px] md:min-w-[220px] flex-1"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: 'both'
                }}
              >
                {/* Animated gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 group-hover:opacity-80 transition-opacity duration-500`} />
                
                {/* Shimmer effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>
                
                <Link to={card.link} className="block h-full">
                  <CardContent className="relative p-5 md:p-6 flex flex-col h-full items-center">
                    {/* Icon with enhanced animations */}
                    <div className="mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-125 group-hover:rotate-6 transition-all duration-500 group-hover:bg-primary/20 group-hover:shadow-lg group-hover:shadow-primary/50">
                        <Icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    </div>

                    {/* Title with fade-in animation */}
                    <div className="mb-2 transform group-hover:scale-105 transition-transform duration-300 text-center">
                      <div className="text-xs font-bold text-primary mb-1 group-hover:text-primary/90 transition-colors">
                        {card.title}
                      </div>
                      <h3 className="text-base font-semibold group-hover:text-foreground transition-colors mb-1">
                        {card.subtitle}
                      </h3>
                      {card.metric && (
                        <p className="text-xs font-semibold text-primary/80">{card.metric}</p>
                      )}
                    </div>

                    {/* Description with subtle animation - left aligned */}
                    <p className="text-xs text-muted-foreground mb-4 flex-grow group-hover:text-foreground/80 transition-colors duration-300 leading-relaxed text-left w-full">
                      {card.description}
                    </p>

                    {/* CTA Button with enhanced animations */}
                    <div className="w-full">
                      <Button 
                        variant="outline" 
                        className="w-full text-xs group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105 group-hover:shadow-lg transition-all duration-300 relative overflow-hidden min-h-[40px]"
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
