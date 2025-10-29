import { Lightbulb, Users, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ValuePropositionCards = () => {
  const cards = [
    {
      icon: Lightbulb,
      title: "BUILD",
      subtitle: "Your Business Plan",
      description: "Transform your idea into an actionable business plan with market research and revenue strategies",
      cta: "Try BizMap AI",
      link: "/bizmap-ai",
      gradient: "from-primary/20 to-primary/5"
    },
    {
      icon: Users,
      title: "SHARE",
      subtitle: "With Your Community",
      description: "Connect with creative entrepreneurs, get feedback on your plans, and find accountability partners",
      cta: "Join Community",
      link: "/community",
      gradient: "from-secondary/20 to-secondary/5"
    },
    {
      icon: Rocket,
      title: "LAUNCH",
      subtitle: "With Funding Support",
      description: "Access accelerator opportunities, funding resources, and learn from successful founders",
      cta: "Explore Insighta",
      link: "/insighta",
      gradient: "from-accent/20 to-accent/5"
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-background relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(white,transparent_85%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Here's What You Get
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to turn your creative idea into a real business
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
                
                <CardContent className="relative p-6 md:p-8 flex flex-col h-full">
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

export default ValuePropositionCards;
