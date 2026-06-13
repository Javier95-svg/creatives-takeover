import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Home, DollarSign, HelpCircle, ArrowRight } from "lucide-react";
import { RevealGroup, ScrollReveal } from "@/components/animations/ScrollReveal";

const ServicesNavigation = () => {
  const navigationCards = [
    {
      icon: <Home className="w-8 h-8 text-info" />,
      title: "Back to Home",
      description: "Explore our platform overview and company information",
      link: "/",
      cta: "Go Home"
    },
    {
      icon: <DollarSign className="w-8 h-8 text-success" />,
      title: "View Pricing",
      description: "Compare subscription plans and find the perfect fit for your needs",
      link: "/pricing",
      cta: "See Pricing",
      highlight: true
    },
    {
      icon: <HelpCircle className="w-8 h-8 text-purple-500" />,
      title: "Need Help?",
      description: "Get answers to common questions about our creative subscription",
      link: "/faq",
      cta: "View FAQ"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 gradient-text">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore more about our creative subscription service or get the answers you need.
          </p>
        </ScrollReveal>

        <RevealGroup className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto" variant="card">
          {navigationCards.map((card, index) => (
            <Card 
              key={index} 
              className={`glass border-border hover:shadow-lg transition-all duration-300 hover-lift ${
                card.highlight ? 'ring-2 ring-primary/20 bg-primary/5' : ''
              }`}
            >
              <CardContent className="p-6 text-center">
                <div className="mx-auto p-4 rounded-full bg-muted/30 w-fit mb-4">
                  {card.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{card.title}</h3>
                <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                  {card.description}
                </p>
                <Button 
                  variant={card.highlight ? "default" : "outline"} 
                  className="w-full group" 
                  asChild
                >
                  <Link to={card.link}>
                    {card.cta}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </RevealGroup>

        {/* Final CTA */}
        <ScrollReveal className="text-center mt-16">
          <p className="text-muted-foreground mb-6">
            Still have questions about our creative subscription service?
          </p>
          <Button variant="outline" size="lg" asChild>
            <Link to="/faq">
              Get All Your Answers
            </Link>
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default ServicesNavigation;
