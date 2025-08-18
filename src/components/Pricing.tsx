import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Free",
      title: "Explore how AI can help with everyday creative tasks",
      price: "$0",
      period: "/ month",
      buttonText: "Get Free",
      buttonVariant: "outline" as const,
      paymentLink: "https://pay.openai.com/c/pay/cs_live_free_example",
      features: [
        "Access to basic AI tools",
        "Real-time design assistance",
        "Limited access to templates and resources",
        "Community forum access",
        "Basic project management tools"
      ]
    },
    {
      name: "Plus",
      title: "Level up productivity and creativity with expanded access",
      price: "$20",
      period: "/ month",
      buttonText: "Get Plus",
      buttonVariant: "default" as const,
      paymentLink: "https://pay.openai.com/c/pay/cs_live_plus_example",
      includesText: "Everything in Free and:",
      features: [
        "Extended access to premium AI models",
        "Extended limits on creative generations",
        "Advanced design tools and templates",
        "Priority customer support",
        "Collaboration features and project sharing",
        "Advanced analytics and insights",
        "Export in high quality formats"
      ]
    },
    {
      name: "Pro",
      title: "Get the best of our platform with the highest level of access",
      price: "$200",
      period: "/ month",
      buttonText: "Get Pro",
      buttonVariant: "default" as const,
      paymentLink: "https://pay.openai.com/c/pay/cs_live_pro_example",
      includesText: "Everything in Plus and:",
      features: [
        "Unlimited access to all AI models and tools",
        "Access to cutting-edge beta features",
        "Unlimited high-quality exports and downloads",
        "White-label and custom branding options",
        "Dedicated account manager and support",
        "Advanced team collaboration features",
        "API access for custom integrations"
      ]
    }
  ];

  const handleGetStarted = (paymentLink: string) => {
    window.open(paymentLink, '_blank');
  };

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-normal mb-6 text-foreground">
            Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See pricing for our individual, team, and enterprise plans.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className="bg-card border border-border rounded-lg p-8 hover:shadow-lg transition-shadow"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-semibold mb-4 text-foreground">{plan.name}</h3>
                <p className="text-muted-foreground mb-6 text-sm leading-relaxed">{plan.title}</p>
                
                <div className="mb-6">
                  <span className="text-4xl font-normal text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>

                <Button 
                  variant={plan.buttonVariant}
                  className="w-full mb-8"
                  onClick={() => handleGetStarted(plan.paymentLink)}
                >
                  {plan.buttonText} →
                </Button>
              </div>

              <div className="space-y-4">
                {plan.includesText && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-4 h-4 border border-muted-foreground rounded-sm flex items-center justify-center">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium text-foreground">{plan.includesText}</span>
                  </div>
                )}
                
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;