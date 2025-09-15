import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, TrendingUp, Users, DollarSign } from "lucide-react";
import { useTypingAnimation } from "@/hooks/useTypingAnimation";

const InteractiveDemo = () => {
  const [businessIdea, setBusinessIdea] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const demoResults = [
    {
      title: "Market Analysis",
      icon: TrendingUp,
      content: "Your eco-friendly subscription box targets the $4.2B sustainable products market, growing 25% annually.",
      delay: 0
    },
    {
      title: "Target Audience", 
      icon: Users,
      content: "Primary customers: Millennials aged 25-40, income $50K+, environmentally conscious, urban dwellers.",
      delay: 1500
    },
    {
      title: "Revenue Potential",
      icon: DollarSign,
      content: "Projected monthly revenue: $15K-45K within 12 months. Break-even: Month 8. Customer LTV: $240.",
      delay: 3000
    }
  ];

  const { displayedText, isTyping } = useTypingAnimation({
    text: currentStep < demoResults.length ? demoResults[currentStep].content : "",
    speed: 30,
    startDelay: demoResults[currentStep]?.delay || 0,
    onComplete: () => {
      if (currentStep < demoResults.length - 1) {
        setTimeout(() => setCurrentStep(prev => prev + 1), 1000);
      }
    }
  });

  const handleTryDemo = () => {
    if (!businessIdea.trim()) return;
    setShowDemo(true);
    setCurrentStep(0);
  };

  const resetDemo = () => {
    setShowDemo(false);
    setBusinessIdea("");
    setCurrentStep(0);
  };

  return (
    <section className="py-16 bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-4 h-4 mr-2" />
            Try Before You Sign Up
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 takeover-gradient">
            See Your Business Idea Come to Life
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Enter any business idea and watch our AI instantly analyze market potential, 
            target audience, and revenue projections in real-time.
          </p>
        </div>

        {!showDemo ? (
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-4 mb-6">
              <Input
                placeholder="e.g., Eco-friendly subscription box for busy professionals"
                value={businessIdea}
                onChange={(e) => setBusinessIdea(e.target.value)}
                className="flex-1 h-12 text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleTryDemo()}
              />
              <Button 
                size="lg" 
                onClick={handleTryDemo}
                disabled={!businessIdea.trim()}
                className="h-12 px-8 bg-primary hover:bg-primary/90"
              >
                Try Demo <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Or try one of these examples:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "AI-powered fitness app",
                  "Sustainable fashion marketplace", 
                  "Local food delivery service"
                ].map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    onClick={() => setBusinessIdea(example)}
                    className="text-xs"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold mb-2">
                Analysis Results for: "<span className="text-primary">{businessIdea}</span>"
              </h3>
              <p className="text-muted-foreground">Watch as our AI analyzes your idea in real-time</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {demoResults.map((result, index) => {
                const Icon = result.icon;
                const isActive = index <= currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <Card 
                    key={result.title}
                    className={`relative transition-all duration-500 ${
                      isActive 
                        ? 'ring-2 ring-primary/20 shadow-lg' 
                        : 'opacity-50'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted 
                            ? 'bg-primary text-primary-foreground' 
                            : isActive 
                            ? 'bg-primary/20 text-primary animate-pulse' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <CardTitle className="text-lg">{result.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {index === currentStep ? (
                        <p className="text-sm text-muted-foreground leading-relaxed min-h-[60px]">
                          {displayedText}
                          {isTyping && <span className="animate-pulse">|</span>}
                        </p>
                      ) : index < currentStep ? (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {result.content}
                        </p>
                      ) : (
                        <div className="h-[60px] flex items-center justify-center">
                          <div className="text-xs text-muted-foreground/50">Analyzing...</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {currentStep >= demoResults.length - 1 && !isTyping && (
              <div className="text-center animate-fade-in">
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold mb-2 text-primary">
                    🎉 Complete Analysis Ready!
                  </h4>
                  <p className="text-muted-foreground mb-4">
                    This is just a preview. Get the full comprehensive business plan with market research, 
                    financial projections, and step-by-step execution strategy.
                  </p>
                </div>
                
                <div className="flex justify-center gap-4">
                  <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                    <a href="/dream2plan">
                      Get My Full Business Plan <ArrowRight className="ml-2 w-5 h-5" />
                    </a>
                  </Button>
                  <Button variant="outline" onClick={resetDemo}>
                    Try Another Idea
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default InteractiveDemo;