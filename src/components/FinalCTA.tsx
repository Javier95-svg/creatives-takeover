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
import { usePageAnalytics } from "@/hooks/usePageAnalytics";

const FinalCTA = () => {
  const { trackClick } = usePageAnalytics();
  
  return (
    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Final CTA Cosmic Wallpaper */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-950/30 via-indigo-950/20 to-info/25" />
      
      {/* Starfield Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-1 h-1 bg-white rounded-full animate-pulse" />
        <div className="absolute top-32 right-32 w-0.5 h-0.5 bg-warning rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-40 w-1.5 h-1.5 bg-info rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-60 right-20 w-0.5 h-0.5 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
        <div className="absolute top-60 left-1/3 w-1 h-1 bg-success rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-80 right-1/4 w-0.5 h-0.5 bg-pink-300 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-32 left-1/2 w-1 h-1 bg-info rounded-full animate-pulse" style={{ animationDelay: '2.5s' }} />
        <div className="absolute top-40 right-1/6 w-0.5 h-0.5 bg-warning rounded-full animate-pulse" style={{ animationDelay: '4s' }} />
      </div>
      
      {/* Galaxy Spirals */}
      <div className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full border border-purple-500/10 animate-spin" style={{ animationDuration: '20s' }}>
        <div className="absolute inset-4 rounded-full border border-info/10 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}>
          <div className="absolute inset-4 rounded-full border border-info/10 animate-spin" style={{ animationDuration: '10s' }} />
        </div>
      </div>
      
      <div className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full border border-pink-500/10 animate-spin" style={{ animationDuration: '25s', animationDirection: 'reverse' }}>
        <div className="absolute inset-3 rounded-full border border-purple-500/10 animate-spin" style={{ animationDuration: '12s' }}>
          <div className="absolute inset-3 rounded-full border border-indigo-500/10 animate-spin" style={{ animationDuration: '8s', animationDirection: 'reverse' }} />
        </div>
      </div>
      
      {/* Cosmic Dust Clouds */}
      <div className="absolute top-1/3 right-1/6 w-24 h-8 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent rounded-full blur-xl animate-float" />
      <div className="absolute bottom-1/3 left-1/6 w-32 h-6 bg-gradient-to-r from-transparent via-info/5 to-transparent rounded-full blur-lg animate-float" style={{ animationDelay: '3s' }} />
      
      {/* Shooting Stars */}
      <div className="absolute top-1/4 right-1/3 w-16 h-0.5 bg-gradient-to-r from-white/30 to-transparent animate-pulse transform rotate-45" />
      <div className="absolute bottom-1/2 left-1/4 w-12 h-0.5 bg-gradient-to-r from-warning/30 to-transparent animate-pulse transform rotate-12" style={{ animationDelay: '2s' }} />
      
      {/* Nebula Clouds */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-500/20 via-transparent to-info/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/3 w-2/3 h-2/3 bg-gradient-to-br from-pink-500/10 via-transparent to-info/10 blur-2xl" />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Content */}
          <div className="animate-fade-in">
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 mb-6 animate-pulse">
              <Sparkles className="w-4 h-4 mr-2" />
              Join 15,000+ Creative Entrepreneurs
            </Badge>
            
            <h2 className="text-5xl lg:text-6xl font-bold mb-8 gradient-text leading-tight">
              Stop Planning. 
              <br />
              <span className="text-primary">Start Earning.</span>
            </h2>
            
            <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Your AI co-founder who actually gets creatives. Launch your profitable business in 30 days, not 6 months.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button 
              size="lg" 
              className="text-lg px-12 py-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 bg-primary hover:bg-primary/90" 
              onClick={() => trackClick('Start My 30-Day Launch', 'Final CTA')}
              asChild
            >
              <Link to="/bizmap-ai">
                Start My 30-Day Launch
                <ArrowRight className="ml-3 h-6 w-6" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-12 py-8 border-2 hover:bg-primary/10" 
              onClick={() => trackClick('Join 15K+ Creatives', 'Final CTA')}
              asChild
            >
              <Link to="/mentorship">
                Join 15K+ Creatives
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[hsl(var(--green-primary))]" />
                <span>Free to start</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[hsl(var(--green-primary))]" />
                <span>First dollar guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[hsl(var(--green-primary))]" />
                <span>Built FOR creatives BY creatives</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;