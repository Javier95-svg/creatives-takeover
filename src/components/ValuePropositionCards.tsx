import React from "react";
import { Lightbulb, Users, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ValuePropositionCards = () => {
  const cards = [
    {
      icon: Lightbulb,
      title: "BUILD",
      subtitle: "BizMap AI",
      description: "Transform scattered ideas into a strategic roadmap. Get AI-powered market research, competitor analysis, and actionable steps to launch your creative business in 30 days.",
      cta: "Try BizMap AI",
      link: "/bizmap-ai",
      gradient: "from-primary/20 to-primary/5"
    },
    {
      icon: Users,
      title: "SHARE",
      subtitle: "Community",
      description: "Join creative entrepreneurs who get it. Share your journey, celebrate wins, get honest feedback, and find accountability partners who'll keep you moving forward.",
      cta: "Join Community",
      link: "/community",
      gradient: "from-secondary/20 to-secondary/5"
    },
    {
      icon: Rocket,
      title: "LAUNCH",
      subtitle: "Insighta",
      description: "Access exclusive funding opportunities and accelerator programs. Learn from founders who've secured investment and get the resources to scale your creative business.",
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
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]">
            Here's What You Get
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto">
            Creatives Takeover is an all-in-one platform for entrepreneurs and founders. Use AI tools to plan your business, connect with like-minded individuals, and find funding opportunities. Everything is designed to support you throughout your journey to build a profitable and lasting venture.
          </p>
        </div>

        {/* Three Cards */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card 
                key={index} 
                className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30"
              >
                {/* Gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-50 group-hover:opacity-70 transition-opacity`} />
                
                <CardContent className="relative p-6 md:p-8 flex flex-col h-full items-center text-center">
                  {/* Icon */}
                  <div className="mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-3">
                    <div className="text-sm font-bold text-primary mb-1">
                      {card.title}
                    </div>
                    <h3 className="text-xl font-semibold">
                      {card.subtitle}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground mb-6 flex-grow">
                    {card.description}
                  </p>

                  {/* CTA Button */}
                  <Link to={card.link} className="w-full">
                    <Button 
                      variant="outline" 
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      {card.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default React.memo(ValuePropositionCards);
