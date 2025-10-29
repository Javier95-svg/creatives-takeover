import { Shield, CreditCard, RotateCcw, DollarSign, Star, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCountUp } from "@/hooks/useCountUp";

const TrustIndicators = () => {
  const RatingCounter = () => {
    const { count: rating, ref } = useCountUp(49, 2000, 0);
    return <span ref={ref as any}>{(rating / 10).toFixed(1)}</span>;
  };

  const ReviewCounter = () => {
    const { count: reviews, ref } = useCountUp(503, 2000, 0);
    return <span ref={ref as any}>{reviews}+</span>;
  };

  const indicators = [
    {
      icon: Shield,
      title: "Secure Payment",
      description: "256-bit SSL encryption",
      tooltip: "Bank-level security powered by Stripe",
      pulse: false
    },
    {
      icon: CreditCard,
      title: "No Credit Card",
      description: "Free tier available",
      tooltip: "Start building without any payment info",
      pulse: false
    },
    {
      icon: RotateCcw,
      title: "Cancel Anytime",
      description: "No long-term contracts",
      tooltip: "Full control with zero commitment",
      pulse: false
    },
    {
      icon: DollarSign,
      title: "Money-Back",
      description: "30-day guarantee",
      tooltip: "Risk-free trial for all paid plans",
      pulse: true
    },
    {
      icon: Star,
      title: <><RatingCounter />/5 Rating</>,
      description: <span>From <ReviewCounter /> reviews</span>,
      tooltip: "Based on verified customer reviews",
      pulse: true
    }
  ];

  return (
    <section className="py-12 relative z-10">
      <div className="container mx-auto px-4">
        <TooltipProvider>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
            {indicators.map((indicator, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Card 
                    className={`bg-background/60 backdrop-blur-sm border-border/50 p-6 text-center hover:bg-background/80 transition-all duration-300 opacity-0 animate-fade-in hover-scale cursor-pointer ${
                      indicator.pulse ? 'hover:shadow-lg hover:shadow-primary/20' : ''
                    }`}
                    style={{ 
                      animationDelay: `${index * 150}ms`,
                      animationFillMode: 'forwards'
                    }}
                  >
                    <indicator.icon className={`h-8 w-8 mx-auto mb-3 text-primary ${
                      indicator.pulse ? 'animate-pulse' : ''
                    }`} />
                    <h3 className="font-semibold text-sm text-foreground mb-1">
                      {indicator.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {indicator.description}
                    </p>
                  </Card>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{indicator.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>
    </section>
  );
};

export default TrustIndicators;
