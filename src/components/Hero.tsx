import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard, Users, Zap, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-bg.jpg";
import HeroSnippets from "@/components/HeroSnippets";

const Hero = () => {
  const { isAuthenticated } = useAuth();
  // Subtle particles for brand identity - reduced from 3 to 2
  const creativeParticles = [
    { top: "20%", left: "15%", size: 6, color: "hsl(var(--blue-primary))", delay: "0s" },
    { top: "65%", left: "80%", size: 5, color: "hsl(var(--green-primary))", delay: "2s" },
  ];

  
  return (
    <section
      id="overview"
      className="scroll-mt-24 relative min-h-screen flex items-center justify-center overflow-hidden pt-24 px-4 sm:px-6 bg-gradient-to-br from-background via-background to-muted/30 bg-gradient-rgb-subtle"
    >
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid pattern - reduced opacity further */}
        <div className="absolute inset-0 dark:opacity-[0.02] opacity-[0.015]" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px, 80px 80px",
        }} />
        {/* Subtle particles */}
        {creativeParticles.map((particle, index) => (
          <div
            key={`creative-spark-${index}`}
            className="absolute rounded-full opacity-40"
            style={{
              top: particle.top,
              left: particle.left,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: `radial-gradient(circle, ${particle.color} / 0.6, transparent)`,
              boxShadow: `0 0 20px ${particle.color} / 0.3`,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b dark:from-background/50 dark:via-background/35 dark:to-background/75 from-background/90 via-background/95 to-background/90" />

      <div className="container mx-auto relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-headline-lg sm:text-headline-xl font-bold mb-6 takeover-title creatives-font">
            <span className="gradient-unified">
              Your Digital Partner for Building From Zero
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-body sm:text-body-lg text-foreground/90 mb-8 max-w-2xl mx-auto px-4">
            Turn your creative idea into a thriving project. Get AI-powered planning, community support, and fundraising tools designed to guide pre-seed founders and entrepreneurs throughout their journey.
          </p>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mb-10 sm:mb-12 px-4">
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Users className="w-4 h-4 text-growth" />
              <span>Growing Community</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Zap className="w-4 h-4 text-action" />
              <span>30-Day Launch</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Sparkles className="w-4 h-4 text-planning" />
              <span>AI-Powered Planning</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <DollarSign className="w-4 h-4 text-growth" />
              <span>Fundraising Guidance</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 px-4">
            <Button 
              size="lg" 
              className="bg-gradient-unified hover:opacity-90 text-primary-foreground px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl font-semibold w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-200" 
              asChild
            >
              <Link to="/bizmap-ai">
                <span>Start Here</span>
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="border-2 hover:bg-muted/50 text-foreground px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl font-semibold w-full sm:w-auto transition-all duration-200" 
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