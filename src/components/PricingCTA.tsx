import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  MessageCircle, 
  HelpCircle, 
  Cog,
  Users,
  Shield,
  Award
} from "lucide-react";

const PricingCTA = () => {
  const navigationCards = [
    {
      icon: <Cog className="w-8 h-8 text-blue-500" />,
      title: "Explore Our Services",
      description: "Discover all AI-powered features and creative tools included in our plans",
      link: "/services",
      cta: "View Services",
      highlight: false
    },
    {
      icon: <HelpCircle className="w-8 h-8 text-green-500" />,
      title: "Have Questions?",
      description: "Get answers about our AI solopreneur pricing plans and features",
      link: "/faq",
      cta: "View FAQ",
      highlight: false
    },
    {
      icon: <Users className="w-8 h-8 text-purple-500" />,
      title: "Join Our Community",
      description: "Connect with 50,000+ AI solopreneurs and creative professionals",
      link: "/community",
      cta: "Join Community",
      highlight: true
    }
  ];

  const trustIndicators = [
    {
      icon: <Shield className="w-6 h-6 text-primary" />,
      title: "Secure Payments",
      description: "Bank-level encryption and data protection"
    },
    {
      icon: <Award className="w-6 h-6 text-primary" />,
      title: "30-Day Guarantee",
      description: "Full refund if not completely satisfied"
    },
    {
      icon: <MessageCircle className="w-6 h-6 text-primary" />,
      title: "24/7 Support",
      description: "Expert help whenever you need it"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        {/* Main CTA */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 mb-6">
            Ready to Get Started?
          </Badge>
          <h2 className="text-4xl font-bold mb-6 gradient-text">
            Join 50,000+ AI Solopreneurs
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Start your AI-powered creative journey today with our flexible pricing plans. 
            No long-term commitments, cancel anytime.
          </p>

          {/* Trust Indicators */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            {trustIndicators.map((indicator, index) => (
              <div key={index} className="flex items-center justify-center space-x-3">
                {indicator.icon}
                <div className="text-left">
                  <div className="font-semibold">{indicator.title}</div>
                  <div className="text-sm text-muted-foreground">{indicator.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Primary CTA */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12 mb-16">
            <h3 className="text-2xl font-bold mb-4">Start Your Free Trial Today</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Try all features free for 30 days. No credit card required. 
              Join thousands of successful AI solopreneurs.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Contact Sales
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground mt-4">
              ✓ No credit card required  ✓ 30-day free trial  ✓ Cancel anytime
            </p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold mb-8 text-center gradient-text">
            Learn More About Our Platform
          </h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {navigationCards.map((card, index) => (
              <Card 
                key={index} 
                className={`glass border-border hover:shadow-lg transition-all duration-300 hover-lift group ${
                  card.highlight ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                }`}
              >
                <CardContent className="p-6 text-center">
                  <div className="mx-auto p-4 rounded-full bg-muted/30 w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                    {card.icon}
                  </div>
                  <h4 className="text-xl font-semibold mb-3">{card.title}</h4>
                  <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                    {card.description}
                  </p>
                  <Button 
                    variant={card.highlight ? "default" : "outline"} 
                    className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300" 
                    asChild
                  >
                    <Link to={card.link}>
                      {card.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Final Stats */}
        <div className="text-center">
          <h4 className="text-lg font-semibold mb-8">
            Trusted by Creative Professionals Worldwide
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">50k+</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">4.9⭐</div>
              <div className="text-sm text-muted-foreground">User Rating</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingCTA;