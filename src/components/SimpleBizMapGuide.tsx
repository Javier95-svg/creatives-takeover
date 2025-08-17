import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Target, BarChart3, Rocket } from "lucide-react";

const SimpleBizMapGuide = () => {
  const steps = [
    {
      icon: MessageSquare,
      title: "Share Your Idea",
      description: "Tell BizMap AI about your business concept"
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
    <section id="how-to-use" className="scroll-mt-24 py-20 px-4 bg-gradient-to-b from-background to-muted/10">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
          How BizMap AI Works
        </h2>
        <p className="text-lg text-muted-foreground mb-12">
          Transform your business idea into an actionable plan in 4 simple steps
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index} className="glass-card hover-scale animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground hover-scale" asChild>
          <a href="/dream2plan">
            Try BizMap AI Now
            <ArrowRight className="ml-2 w-4 h-4" />
          </a>
        </Button>
      </div>
    </section>
  );
};

export default SimpleBizMapGuide;