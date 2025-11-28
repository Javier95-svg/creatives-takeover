import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard, Users, Zap, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-bg.jpg";
import HeroSnippets from "@/components/HeroSnippets";

type UserType = "founder" | "creator";

const Hero = () => {
  const { isAuthenticated } = useAuth();
  const [userType, setUserType] = useState<UserType>("founder");
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

  // Dynamic content based on user type
  const content = {
    founder: {
      headline: "Build Your Startup the Right Way",
      subheadline: "AI-powered planning, founder community, and fundraising guidance",
      cta: "Start 30-Day Launch Plan",
      ctaLink: "/bizmap-ai",
      socialProof: "Join 10K+ members"
    },
    creator: {
      headline: "Collaborate. Create. Get Discovered",
      subheadline: "Join 10K+ creators sharing work, getting feedback, finding collaborators",
      cta: "Join Community",
      ctaLink: "/community",
      socialProof: "50K+ community posts"
    }
  };

  const currentContent = content[userType];
  
  return (
    <section
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
          {/* User Type Selector */}
          <div className="mb-8 sm:mb-10 px-4">
            <div className="inline-flex flex-col sm:flex-row rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm p-1 gap-1 shadow-lg w-full sm:w-auto">
              <button
                onClick={() => setUserType("founder")}
                className={`px-6 sm:px-8 py-3 sm:py-4 rounded-md font-semibold text-sm sm:text-base transition-all duration-300 ${
                  userType === "founder"
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                aria-label="I'm a Founder"
              >
                I'm a Founder
              </button>
              <button
                onClick={() => setUserType("creator")}
                className={`px-6 sm:px-8 py-3 sm:py-4 rounded-md font-semibold text-sm sm:text-base transition-all duration-300 ${
                  userType === "creator"
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                aria-label="I'm a Creator"
              >
                I'm a Creator
              </button>
            </div>
          </div>

          {/* Dynamic Headline */}
          <h1 
            key={`headline-${userType}`}
            className="text-headline-lg sm:text-headline-xl font-bold mb-6 takeover-title creatives-font leading-[1.1]"
          >
            <span className="gradient-unified animate-fade-in transition-opacity duration-500">
              {currentContent.headline}
            </span>
          </h1>

          {/* Dynamic Subheadline */}
          <p 
            key={`subheadline-${userType}`}
            className="text-body sm:text-body-lg text-foreground/85 mb-6 max-w-2xl mx-auto leading-relaxed px-4 animate-fade-in transition-opacity duration-500"
          >
            {currentContent.subheadline}
          </p>
          
          {/* Trust Indicators - Enhanced with 4 metrics, all visible on mobile */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 sm:mb-10 px-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Users className="w-4 h-4 text-growth" />
              <span className="text-muted-foreground">Growing</span>
              <span className="font-semibold text-foreground">Community</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Zap className="w-4 h-4 text-action" />
              <span className="font-semibold text-foreground">30-Day</span>
              <span className="text-muted-foreground">Launch</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-planning" />
              <span className="text-muted-foreground">AI-Powered Business Planning</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <DollarSign className="w-4 h-4 text-growth" />
              <span className="text-muted-foreground">Fundraising Guidance</span>
            </div>
          </div>

          {/* Dynamic CTA Button */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8 px-4">
            <Button 
              key={`cta-${userType}`}
              size="lg" 
              className="bg-gradient-unified hover:opacity-90 text-primary-foreground px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl font-semibold btn-magnetic btn-start-creating relative overflow-hidden group w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in" 
              aria-label={currentContent.cta}
              asChild
            >
              <Link to={currentContent.ctaLink}>
                <span className="relative z-10">{currentContent.cta}</span>
                <ArrowRight className="ml-2 w-5 h-5 relative z-10" />
                <div className="absolute inset-0 bg-gradient-unified opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
              </Link>
            </Button>
          </div>

          {/* Dynamic Social Proof */}
          <div 
            key={`social-proof-${userType}`}
            className="mb-8 sm:mb-12 px-4 animate-fade-in transition-opacity duration-500"
          >
            <p className="text-sm sm:text-base text-muted-foreground">
              {currentContent.socialProof}
            </p>
          </div>

          {/* Platform Snippets - Horizontal Scrollable */}
          <HeroSnippets />

        </div>
      </div>
    </section>
  );
};

export default Hero;