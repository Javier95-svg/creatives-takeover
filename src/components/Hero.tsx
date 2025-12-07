import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard, Users, Zap, DollarSign, Play, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import HeroSnippets from "@/components/HeroSnippets";
import { Badge } from "@/components/ui/badge";
import { useConversionTracking } from "@/hooks/useConversionTracking";
import { useEffect, useRef } from "react";

const Hero = () => {
  const { isAuthenticated } = useAuth();
  const { trackTriggerView, trackEngagement, trackSignupStarted } = useConversionTracking();
  const heroRef = useRef<HTMLElement>(null);
  const hasTrackedView = useRef(false);
  // RGB colored particles for brand identity
  const creativeParticles = [
    { top: "18%", left: "16%", size: 8, color: "hsl(var(--blue-primary))", delay: "0s" },
    { top: "64%", left: "20%", size: 7, color: "hsl(var(--red-primary))", delay: "1.6s" },
    { top: "42%", left: "75%", size: 6, color: "hsl(var(--green-primary))", delay: "2.4s" },
  ];
  const techNodes = [
    { top: "18%", right: "16%" },
    { top: "30%", right: "24%" },
    { top: "44%", right: "14%" },
    { top: "58%", right: "26%" },
    { top: "70%", right: "18%" },
  ];

  // Track hero CTA view when component is visible
  useEffect(() => {
    if (hasTrackedView.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            trackTriggerView('hero-primary-cta', {
              ctaType: 'primary',
              authenticated: isAuthenticated,
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, [trackTriggerView, isAuthenticated]);

  // Handle CTA clicks
  const handlePrimaryCTAClick = () => {
    trackEngagement('hero-primary-cta', 85);
  };

  const handleSecondaryCTAClick = () => {
    trackEngagement('hero-secondary-cta', 70);
  };

  const handleTertiaryCTAClick = () => {
    trackSignupStarted('hero-tertiary-cta');
  };
  
  return (
    <section
      ref={heroRef}
      id="overview"
      className="scroll-mt-24 relative min-h-screen flex items-center justify-center overflow-hidden pt-24 px-4 sm:px-6 bg-gradient-to-br from-background via-background to-muted/30 bg-gradient-rgb-subtle"
    >
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle grid pattern - adjusts for theme */}
        <div className="absolute inset-0 dark:opacity-[0.05] opacity-[0.03]" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px, 80px 80px",
        }} />
        {/* RGB gradient accent lines - more visible in dark mode */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none dark:opacity-20 opacity-15">
          <div
            className="absolute left-1/2 w-full h-px"
            style={{ 
              top: "32%",
              background: "linear-gradient(to right, transparent, hsl(var(--blue-primary)), hsl(var(--red-primary)), hsl(var(--green-primary)), transparent)"
            }}
          />
          <div
            className="absolute left-1/2 w-full h-px"
            style={{ 
              top: "68%",
              background: "linear-gradient(to right, transparent, hsl(var(--green-primary)), hsl(var(--red-primary)), hsl(var(--blue-primary)), transparent)"
            }}
          />
        </div>
        {creativeParticles.map((particle, index) => (
          <div
            key={`creative-spark-${index}`}
            className="absolute rounded-full shadow-lg"
            style={{
              top: particle.top,
              left: particle.left,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: `radial-gradient(circle, ${particle.color}, transparent)`,
              boxShadow: `0 0 30px ${particle.color}`,
            }}
          />
        ))}
        <svg className="absolute inset-0 w-full h-full dark:opacity-30 opacity-15 pointer-events-none">
          <defs>
            <linearGradient id="tech-network" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
              <stop offset="45%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Static tech network path – animation removed */}
          <path
            d="M 1760 220 L 1840 360 L 1720 460 L 1860 580 L 1680 660"
            fill="none"
            stroke="url(#tech-network)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {/* Tech nodes made more subtle - reduced opacity - theme-aware */}
        {techNodes.map((node, index) => (
          <div
            key={`tech-node-${index}`}
            className="absolute w-2 h-2 rounded-full dark:bg-[#22d3ee] bg-primary/60 dark:opacity-40 opacity-30"
            style={{
              ...node,
              boxShadow: "0 0 12px hsl(var(--primary) / 0.4)",
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b dark:from-background/50 dark:via-background/35 dark:to-background/75 from-background/90 via-background/95 to-background/90" />

      <div className="container mx-auto relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-headline-lg sm:text-headline-xl font-bold mb-6 takeover-title creatives-font leading-[1.1]">
            <span className="gradient-unified animate-fade-in">
              The Zero to One Platform
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-body sm:text-body-lg text-foreground/85 mb-6 max-w-2xl mx-auto leading-relaxed px-4 animate-fade-in">
            Turn your bold idea into a thriving project. Get AI-powered planning, community support, and fundraising tools designed to guide pre-seed founders throughout their journey.
          </p>
          
          {/* Platform-Specific Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 sm:mb-10 px-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Users className="w-4 h-4 text-growth" />
              <span className="font-semibold text-foreground">1,000+</span>
              <span className="text-muted-foreground">Active Founders</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Zap className="w-4 h-4 text-action" />
              <span className="font-semibold text-foreground">30-Day</span>
              <span className="text-muted-foreground">Launch Plan</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-planning" />
              <span className="font-semibold text-foreground">3 Minutes</span>
              <span className="text-muted-foreground">to Business Plan</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <DollarSign className="w-4 h-4 text-growth" />
              <span className="font-semibold text-foreground">500+</span>
              <span className="text-muted-foreground">Funding Opportunities</span>
            </div>
          </div>

          {/* Enhanced CTA Section */}
          <div className="mb-8 sm:mb-12 px-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {/* Primary CTA - Value-Focused */}
            <div className="mb-4 sm:mb-6">
              <Button 
                size="lg" 
                className="bg-gradient-unified hover:opacity-90 text-primary-foreground px-8 sm:px-12 py-5 sm:py-6 text-lg sm:text-xl font-bold btn-magnetic btn-start-creating relative overflow-hidden group w-full sm:w-auto shadow-xl hover:shadow-2xl transition-all duration-300 mb-2" 
                asChild
              >
                <Link to="/bizmap-ai" onClick={handlePrimaryCTAClick}>
                  <div className="flex flex-col items-center sm:flex-row sm:items-center gap-2">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
                    <span className="relative z-10">Design Your Plan in 3 Minutes</span>
                    <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-unified opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                </Link>
              </Button>
              
              {/* Value Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-primary/20 text-xs px-3 py-1">
                  <CheckCircle className="w-3 h-3 mr-1.5 text-green-500" />
                  Free
                </Badge>
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-primary/20 text-xs px-3 py-1">
                  <CheckCircle className="w-3 h-3 mr-1.5 text-green-500" />
                  No sign-up required
                </Badge>
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-primary/20 text-xs px-3 py-1">
                  <CheckCircle className="w-3 h-3 mr-1.5 text-green-500" />
                  3 minutes
                </Badge>
              </div>
            </div>

            {/* Secondary & Tertiary CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              {/* Secondary CTA - Exploration */}
              <Button 
                variant="outline"
                size="lg" 
                className="border-2 hover:bg-primary/10 text-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300" 
                asChild
              >
                <Link to="/bizmap-ai" className="flex items-center" onClick={handleSecondaryCTAClick}>
                  <Play className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                  Explore Features
                </Link>
              </Button>

              {/* Tertiary CTA - Sign-up (only for unauthenticated) */}
              {!isAuthenticated && (
                <Button 
                  variant="ghost"
                  size="lg" 
                  className="text-muted-foreground hover:text-foreground px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium w-full sm:w-auto transition-all duration-300 underline-offset-4 hover:underline" 
                  asChild
                >
                  <Link to="/signup?source=hero&return=/bizmap-ai" className="flex items-center" onClick={handleTertiaryCTAClick}>
                    Join 1,000+ Founders
                    <ArrowRight className="ml-1.5 w-4 h-4" />
                  </Link>
                </Button>
              )}

              {/* Authenticated: Dashboard CTA */}
              {isAuthenticated && (
                <Button 
                  variant="outline"
                  size="lg" 
                  className="border-2 hover:bg-primary/10 text-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300" 
                  asChild
                >
                  <Link to="/dashboard" className="flex items-center">
                    <LayoutDashboard className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                    View Dashboard
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Platform Snippets - Horizontal Scrollable */}
          <HeroSnippets />

        </div>
      </div>
    </section>
  );
};

export default Hero;