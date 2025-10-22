import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Palette, Users as UsersIcon, Briefcase, Lightbulb, ArrowRight } from "lucide-react";

const PickYourPath = () => {
  const navigate = useNavigate();
  const [selectedPath, setSelectedPath] = useState<number | null>(null);

  const paths = [
    {
      icon: Palette,
      title: "I have a creative skill",
      subtitle: "Want to package it",
      description: "You're a designer, photographer, writer, or artist with a skill people need. Let's turn it into a productized service or digital product.",
      example: "Example: Sarah (Designer) → Launched $297 Canva template bundles → $5K first month",
      action: "Package My Skill",
      context: "creative_skill"
    },
    {
      icon: UsersIcon,
      title: "I have an audience",
      subtitle: "Want to monetize it",
      description: "You've built a following on social media or a community. Now it's time to create products or services they'll pay for.",
      example: "Example: Marcus (10K followers) → Launched photography course → $3K in pre-sales",
      action: "Monetize My Audience",
      context: "audience_monetization"
    },
    {
      icon: Briefcase,
      title: "I have a service",
      subtitle: "Want to scale it",
      description: "You're trading time for money with freelancing or 1:1 services. Let's create leveraged income streams that scale beyond your hours.",
      example: "Example: Chen (Wedding Photographer) → Created booking system + templates → 3x revenue",
      action: "Scale My Service",
      context: "service_scaling"
    },
    {
      icon: Lightbulb,
      title: "I have a product idea",
      subtitle: "Want to validate it",
      description: "You have a concept for a creative business or product. Let's validate the market, build an MVP, and get your first customers.",
      example: "Example: Alex (Artist) → Validated print-on-demand idea → First sale in 2 weeks",
      action: "Validate My Idea",
      context: "idea_validation"
    }
  ];

  const handlePathSelect = (index: number, context: string) => {
    setSelectedPath(index);
    // Navigate to Dream2Plan with context
    setTimeout(() => {
      navigate(`/dream2plan?path=${context}`);
    }, 300);
  };

  return (
    <section className="py-24 relative overflow-hidden bg-muted/30">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,hsl(var(--primary)/0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block mb-4">
            <span className="px-4 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full border border-primary/20">
              Pick Your Starting Point
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            What Best Describes You?
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose your path and we'll show you exactly how to get from where you are to your first paying customers
          </p>
        </div>

        {/* Path Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {paths.map((path, index) => {
            const Icon = path.icon;
            const isSelected = selectedPath === index;
            return (
              <Card 
                key={index}
                className={`group cursor-pointer transition-all duration-300 border-2 hover:border-primary/50 hover:shadow-xl ${
                  isSelected ? 'border-primary shadow-xl scale-[1.02]' : ''
                }`}
                onClick={() => handlePathSelect(index, path.context)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1">{path.title}</h3>
                      <p className="text-sm text-primary font-medium">{path.subtitle}</p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                    {path.description}
                  </p>
                  
                  <div className="bg-muted/70 rounded-lg p-3 mb-4 border border-border">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Real Result: </span>
                      {path.example}
                    </p>
                  </div>
                  
                  <Button 
                    className="w-full group/btn"
                    variant={isSelected ? "default" : "outline"}
                  >
                    {path.action}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom Note */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Not sure which path fits you? <button className="text-primary hover:underline font-medium" onClick={() => navigate('/dream2plan')}>Start a conversation with our AI</button> and we'll figure it out together
          </p>
        </div>
      </div>
    </section>
  );
};

export default PickYourPath;
