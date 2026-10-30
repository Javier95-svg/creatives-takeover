import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Users, Award } from "lucide-react";

const ServicesHero = () => {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Animated Background with Multiple Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 animate-fade-in" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95" />
      
      {/* Floating dots, drawn still: 22 of them used to move on endless paths
      
          behind the frosted navbar, which kept a slower phone redrawing every
      
          frame. */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-primary rounded-full opacity-80" />
      <div className="absolute top-40 right-20 w-6 h-6 bg-secondary rounded-full opacity-60" />
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-accent rounded-full opacity-70" />
      <div className="absolute top-60 left-1/3 w-2 h-2 bg-primary/50 rounded-full" />
      <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-secondary/40 rounded-full" />
      <div className="absolute top-1/3 right-10 w-8 h-8 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full opacity-50" />
      <div className="absolute bottom-1/3 left-10 w-6 h-6 bg-gradient-to-r from-accent/40 to-primary/40 rounded-full opacity-40" />
      
      {/* Additional Dynamic Floating Elements with Varied Animations */}
      <div className="absolute top-32 left-1/4 w-3 h-3 bg-primary/60 rounded-full opacity-80" />
      <div className="absolute top-80 right-1/4 w-7 h-7 bg-secondary/30 rounded-full opacity-60" />
      <div className="absolute bottom-32 left-1/2 w-4 h-4 bg-accent/50 rounded-full opacity-70" />
      <div className="absolute top-96 left-16 w-5 h-5 bg-primary/40 rounded-full opacity-50" />
      <div className="absolute bottom-96 right-16 w-2 h-2 bg-secondary/60 rounded-full opacity-80" />
      <div className="absolute top-44 left-3/4 w-6 h-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full opacity-40" />
      <div className="absolute bottom-44 right-3/4 w-3 h-3 bg-gradient-to-tl from-secondary/40 to-primary/40 rounded-full opacity-60" />
      
      {/* Moving Gradient Orbs with Complex Paths */}
      <div className="absolute top-24 right-1/3 w-12 h-12 bg-gradient-to-r from-primary/15 to-transparent rounded-full opacity-30 blur-sm" />
      <div className="absolute bottom-24 left-1/3 w-16 h-16 bg-gradient-to-l from-secondary/10 to-transparent rounded-full opacity-25 blur-md" />
      <div className="absolute top-1/2 left-8 w-10 h-10 bg-gradient-to-b from-accent/20 to-transparent rounded-full opacity-35 blur-sm" />
      <div className="absolute top-1/2 right-8 w-14 h-14 bg-gradient-to-t from-primary/12 to-transparent rounded-full opacity-30 blur-md" />
      
      {/* Additional Tiny Floating Particles */}
      <div className="absolute top-16 left-1/2 w-1 h-1 bg-primary/70 rounded-full opacity-90" />
      <div className="absolute bottom-16 right-1/2 w-1 h-1 bg-secondary/80 rounded-full opacity-85" />
      <div className="absolute top-72 left-12 w-2 h-2 bg-accent/60 rounded-full opacity-75" />
      <div className="absolute bottom-72 right-12 w-2 h-2 bg-primary/50 rounded-full opacity-70" />
      
      <div className="container mx-auto px-6 relative z-20">
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
                Get Started
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