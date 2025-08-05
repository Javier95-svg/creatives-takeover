import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Users, Award } from "lucide-react";

const ServicesHero = () => {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Social Proof Badge */}
          <div className="flex items-center justify-center mb-8 animate-fade-in">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
              <Users className="w-4 h-4 mr-2" />
              Trusted by 50,000+ creatives worldwide
            </Badge>
          </div>

          {/* Main Heading */}
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 gradient-text leading-tight">
              Creative Subscription
              <br />
              <span className="text-primary">That Actually Works</span>
            </h1>
          </div>

          {/* Value Proposition */}
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Stop juggling multiple tools and subscriptions. Get unlimited design access, 
              AI-powered creativity tools, and premium features in one comprehensive 
              <strong className="text-foreground"> creative subscription service</strong>.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
              <Link to="/pricing">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="#features">
                View Features
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-center">
              <Sparkles className="w-4 h-4 mr-2 text-primary" />
              No setup required
            </div>
            <div className="flex items-center justify-center">
              <Award className="w-4 h-4 mr-2 text-primary" />
              Cancel anytime
            </div>
            <div className="flex items-center justify-center">
              <Users className="w-4 h-4 mr-2 text-primary" />
              30-day money-back guarantee
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesHero;