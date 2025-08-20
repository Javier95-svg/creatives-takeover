import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Target, BarChart3, Rocket } from "lucide-react";

const SimpleBizMapGuide = () => {
  const steps = [
    {
      icon: MessageSquare,
      title: "Share Your Idea",
      description: "Tell Creatives Takeover about your business concept"
    },
    {
      icon: Target,
      title: "Add Context",
      description: "Share your budget, skills, and time availability"
    },
    {
      icon: BarChart3,
      title: "Get Your Plan",
      description: "Receive a comprehensive business plan with viability scoring"
    },
    {
      icon: Rocket,
      title: "Take Action",
      description: "Follow the prioritized steps to launch your business"
    }
  ];

  return (
    <section id="how-to-use" className="scroll-mt-24 py-20 px-4 bg-gradient-to-b from-background to-muted/10 relative overflow-hidden">
      {/* Animated background decorations */}
      <div className="absolute top-1/4 left-10 w-20 h-20 bg-primary/5 rounded-full animate-float blur-xl" />
      <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-secondary/5 rounded-full animate-spiral blur-2xl" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-accent/5 rounded-full animate-zigzag blur-lg" style={{ animationDelay: '2s' }} />
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text animate-slide-up">
            How Creatives Takeover Works
          </h2>
          <p className="text-lg text-muted-foreground mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Transform your business idea into an actionable plan in 4 simple steps
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card 
                key={index} 
                className="glass-card hover-scale animate-fade-in group transition-all duration-500 hover:shadow-xl hover:shadow-primary/10 relative overflow-hidden" 
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Animated background glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <CardContent className="p-6 text-center relative z-10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-all duration-300 animate-pulse-slow">
                    <Icon className="w-6 h-6 text-primary group-hover:animate-bounce" />
                  </div>
                  
                  {/* Step number indicator */}
                  <div className="absolute top-4 right-4 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary animate-fade-in" style={{ animationDelay: `${index * 0.2 + 0.5}s` }}>
                    {index + 1}
                  </div>
                  
                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                  
                  {/* Animated progress bar */}
                  <div className="mt-4 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transform -translate-x-full group-hover:translate-x-0 transition-transform duration-1000 ease-out"
                      style={{ transitionDelay: `${index * 0.1}s` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Animated connecting lines between steps */}
        <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-pulse" />

        <div className="animate-fade-in" style={{ animationDelay: '1s' }}>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground hover-scale shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 animate-glow" 
            asChild
          >
            <a href="/dream2plan" className="relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                Try Creatives Takeover Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
              {/* Animated shine effect */}
              <div className="absolute top-0 -left-full h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shine" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default SimpleBizMapGuide;