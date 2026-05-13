import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, HelpCircle, Search, MessageCircle } from "lucide-react";

const FAQHero = () => {
  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      {/* Animated Background with Multiple Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 animate-fade-in" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95" />
      
      {/* Enhanced Animated Floating Elements with Diverse Movement Patterns */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-primary rounded-full animate-float opacity-80 hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-40 right-20 w-6 h-6 bg-secondary rounded-full animate-spiral opacity-60" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-accent rounded-full animate-zigzag opacity-70" style={{ animationDelay: '2s' }} />
      <div className="absolute top-60 left-1/3 w-2 h-2 bg-primary/50 rounded-full animate-diagonal-float" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-secondary/40 rounded-full animate-figure-eight" style={{ animationDelay: '4s' }} />
      <div className="absolute top-1/3 right-10 w-8 h-8 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full animate-orbit opacity-50" style={{ animationDelay: '5s' }} />
      <div className="absolute bottom-1/3 left-10 w-6 h-6 bg-gradient-to-r from-accent/40 to-primary/40 rounded-full animate-float-reverse opacity-40" style={{ animationDelay: '6s' }} />
      
      {/* Additional Dynamic Floating Elements with Varied Animations */}
      <div className="absolute top-32 left-1/4 w-3 h-3 bg-primary/60 rounded-full animate-drift opacity-80" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-80 right-1/4 w-7 h-7 bg-secondary/30 rounded-full animate-spiral opacity-60" style={{ animationDelay: '1.5s' }} />
      <div className="absolute bottom-32 left-1/2 w-4 h-4 bg-accent/50 rounded-full animate-orbit opacity-70" style={{ animationDelay: '2.5s' }} />
      <div className="absolute top-96 left-16 w-5 h-5 bg-primary/40 rounded-full animate-figure-eight opacity-50" style={{ animationDelay: '3.5s' }} />
      <div className="absolute bottom-96 right-16 w-2 h-2 bg-secondary/60 rounded-full animate-zigzag opacity-80" style={{ animationDelay: '4.5s' }} />
      <div className="absolute top-44 left-3/4 w-6 h-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-diagonal-float opacity-40" style={{ animationDelay: '5.5s' }} />
      <div className="absolute bottom-44 right-3/4 w-3 h-3 bg-gradient-to-tl from-secondary/40 to-primary/40 rounded-full animate-float-reverse opacity-60" style={{ animationDelay: '6.5s' }} />
      
      {/* Moving Gradient Orbs with Complex Paths */}
      <div className="absolute top-24 right-1/3 w-12 h-12 bg-gradient-to-r from-primary/15 to-transparent rounded-full animate-orbit opacity-30 blur-sm" style={{ animationDelay: '7s' }} />
      <div className="absolute bottom-24 left-1/3 w-16 h-16 bg-gradient-to-l from-secondary/10 to-transparent rounded-full animate-spiral opacity-25 blur-md" style={{ animationDelay: '8s' }} />
      <div className="absolute top-1/2 left-8 w-10 h-10 bg-gradient-to-b from-accent/20 to-transparent rounded-full animate-figure-eight opacity-35 blur-sm" style={{ animationDelay: '9s' }} />
      <div className="absolute top-1/2 right-8 w-14 h-14 bg-gradient-to-t from-primary/12 to-transparent rounded-full animate-diagonal-float opacity-30 blur-md" style={{ animationDelay: '10s' }} />
      
      {/* Additional Tiny Floating Particles */}
      <div className="absolute top-16 left-1/2 w-1 h-1 bg-primary/70 rounded-full animate-drift opacity-90" style={{ animationDelay: '11s' }} />
      <div className="absolute bottom-16 right-1/2 w-1 h-1 bg-secondary/80 rounded-full animate-zigzag opacity-85" style={{ animationDelay: '12s' }} />
      <div className="absolute top-72 left-12 w-2 h-2 bg-accent/60 rounded-full animate-orbit opacity-75" style={{ animationDelay: '13s' }} />
      <div className="absolute bottom-72 right-12 w-2 h-2 bg-primary/50 rounded-full animate-spiral opacity-70" style={{ animationDelay: '14s' }} />
      
      <div className="container mx-auto px-6 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Support Badge */}
          <div className="flex items-center justify-center mb-8 animate-fade-in">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
              <MessageCircle className="w-4 h-4 mr-2" />
              24/7 Community Support Available
            </Badge>
          </div>

          {/* Main Heading */}
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 gradient-text leading-tight">
              Frequently Asked
              <br />
              <span className="text-primary">Questions</span>
            </h1>
          </div>

          {/* Value Proposition */}
          <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Get instant answers to common questions about our creative subscription service, 
              community features, pricing plans, and platform capabilities.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">50+</div>
              <div className="text-muted-foreground">Common Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">&lt; 1min</div>
              <div className="text-muted-foreground">Average Answer Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Community Help</div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
              <Link to="#search-faq">
                Search FAQ
                <Search className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6" asChild>
              <Link to="/mentorship">
                Ask Community
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-center">
              <HelpCircle className="w-4 h-4 mr-2 text-primary" />
              Instant answers
            </div>
            <div className="flex items-center justify-center">
              <Search className="w-4 h-4 mr-2 text-primary" />
              Searchable content
            </div>
            <div className="flex items-center justify-center">
              <MessageCircle className="w-4 h-4 mr-2 text-primary" />
              Expert support
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQHero;