import { Shield, CreditCard, RotateCcw, DollarSign, Star } from "lucide-react";
import { Card } from "@/components/ui/card";

const TrustIndicators = () => {
  const indicators = [
    {
      icon: Shield,
      title: "Secure Payment",
      description: "256-bit SSL encryption"
    },
    {
      icon: CreditCard,
      title: "No Credit Card",
      description: "Free tier available"
    },
    {
      icon: RotateCcw,
      title: "Cancel Anytime",
      description: "No long-term contracts"
    },
    {
      icon: DollarSign,
      title: "Money-Back",
      description: "30-day guarantee"
    },
    {
      icon: Star,
      title: "4.9/5 Rating",
      description: "From 500+ reviews"
    }
  ];

  return (
    <section className="py-12 relative z-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
          {indicators.map((indicator, index) => (
            <Card 
              key={index}
              className="bg-background/60 backdrop-blur-sm border-border/50 p-6 text-center hover:bg-background/80 transition-all duration-300"
            >
              <indicator.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold text-sm text-foreground mb-1">
                {indicator.title}
              </h3>
              <p className="text-xs text-muted-foreground">
                {indicator.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustIndicators;
