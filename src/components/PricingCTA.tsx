import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, HelpCircle, Users } from "lucide-react";

const PricingCTA = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-muted/20">
      <div className="container mx-auto px-6">
        {/* Main CTA */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl font-bold mb-6 gradient-text">
            Ready to Transform Your Creative Process?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Join thousands of creatives who have revolutionized their workflow with our 
            affordable creative platform pricing. Start your free trial today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="#pricing-plans">
                Start Free Trial Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/community">
                Explore Community
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            No credit card required • Full access during trial • Cancel anytime
          </p>
        </div>

        {/* Secondary CTAs */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="glass border-border hover:shadow-lg transition-all duration-300 hover-lift">
            <CardContent className="p-6 text-center">
              <div className="mx-auto p-4 rounded-full bg-blue-500/10 w-fit mb-4">
                <HelpCircle className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Have Questions?</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Get answers to common questions about our pricing and features.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/faq">
                  View FAQ
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-border hover:shadow-lg transition-all duration-300 hover-lift">
            <CardContent className="p-6 text-center">
              <div className="mx-auto p-4 rounded-full bg-green-500/10 w-fit mb-4">
                <MessageCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Need More Details?</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Explore all features and services we offer to help you decide.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/services">
                  View Services
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-border hover:shadow-lg transition-all duration-300 hover-lift">
            <CardContent className="p-6 text-center">
              <div className="mx-auto p-4 rounded-full bg-purple-500/10 w-fit mb-4">
                <Users className="w-8 h-8 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Join the Community</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Connect with other creatives and discover exclusive content.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/community">
                  Join Now
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Final Value Proposition */}
        <div className="text-center mt-16 p-8 bg-muted/30 rounded-2xl">
          <h3 className="text-2xl font-bold mb-4">Why Choose Our Creative Platform?</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
            <div>
              <div className="text-2xl font-bold text-primary mb-2">50k+</div>
              <div className="text-muted-foreground">Active Creatives</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-muted-foreground">Platform Uptime</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Customer Support</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-2">30-Day</div>
              <div className="text-muted-foreground">Money-Back Guarantee</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingCTA;