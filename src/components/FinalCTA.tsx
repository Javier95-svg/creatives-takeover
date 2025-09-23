import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Sparkles, 
  Clock,
  CheckCircle,
  Zap
} from "lucide-react";

const FinalCTA = () => {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-background via-primary/5 to-background relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-20 left-1/4 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-spiral" />
      <div className="absolute bottom-20 right-1/4 w-32 h-32 bg-secondary/10 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
      <div className="absolute top-1/2 left-1/6 w-20 h-20 bg-accent/10 rounded-full blur-xl animate-zigzag" style={{ animationDelay: '2s' }} />
      
      {/* Floating Particles */}
      <div className="absolute top-32 left-10 w-2 h-2 bg-primary rounded-full animate-float opacity-60" />
      <div className="absolute top-48 right-20 w-3 h-3 bg-secondary rounded-full animate-spiral opacity-40" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-48 left-20 w-2 h-2 bg-accent rounded-full animate-zigzag opacity-50" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-32 right-10 w-4 h-4 bg-primary/60 rounded-full animate-diagonal-float opacity-70" style={{ animationDelay: '3s' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Content */}
          <div className="animate-fade-in">
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 mb-6 animate-pulse">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Your Success Story Today
            </Badge>
            
            <h2 className="text-5xl lg:text-6xl font-bold mb-8 gradient-text leading-tight">
              Ready to Build Your 
              <br />
              <span className="text-primary">Dream Business?</span>
            </h2>
            
            <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Stop spending months on research and planning. Get your AI-powered business 
              strategy in minutes and start building something amazing today.
            </p>
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
              <Clock className="w-5 h-5 text-primary" />
              <span className="font-medium">5-minute setup</span>
            </div>
            <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-medium">Instant AI analysis</span>
            </div>
            <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
              <CheckCircle className="w-5 h-5 text-primary" />
              <span className="font-medium">30-day guarantee</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button size="lg" className="text-lg px-12 py-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 bg-primary hover:bg-primary/90" asChild>
              <Link to="/dream2plan">
                Start Your Business Plan
                <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-12 py-8 border-2 hover:bg-primary/10" asChild>
              <Link to="/community">
                Join the Community
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="text-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <p className="text-sm text-muted-foreground mb-4">
              Join 15,000+ entrepreneurs who chose our platform
            </p>
            <div className="flex items-center justify-center gap-8 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>24/7 AI support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;