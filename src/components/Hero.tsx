import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard, Users, Zap, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import HeroSnippets from "@/components/HeroSnippets";

const Hero = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <section
      id="overview"
      className="scroll-mt-24 relative min-h-screen flex items-center justify-center overflow-hidden pt-24 px-4 sm:px-6 bg-gradient-to-b from-background via-background to-muted/20"
    >
      {/* Subtle background overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background to-background/95" />

      <div className="container mx-auto relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            <span className="gradient-unified">
              Your Digital Partner for Building From Zero
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed px-4">
            Turn your creative idea into a thriving project. Get AI-powered planning, community support, and fundraising tools designed to guide pre-seed founders and entrepreneurs throughout their journey.
          </p>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10 px-4">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Growing</span>
              <span className="font-medium text-foreground">Community</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">30-Day</span>
              <span className="text-muted-foreground">Launch</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">AI-Powered Planning</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Fundraising Guidance</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow duration-200" 
              asChild
            >
              <Link to="/bizmap-ai">
                Start Here
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="border hover:bg-muted text-foreground px-8 py-6 text-lg font-semibold w-full sm:w-auto transition-colors duration-200" 
              asChild
            >
              <Link to="/dashboard">
                <LayoutDashboard className="mr-2 w-5 h-5" />
                Go to Dashboard
              </Link>
            </Button>
          </div>

          {/* Platform Snippets - Horizontal Scrollable */}
          <HeroSnippets />

        </div>
      </div>
    </section>
  );
};

export default Hero;