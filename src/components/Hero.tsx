import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard, Users, Zap, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-bg.jpg";

const Hero = () => {
  const { isAuthenticated } = useAuth();
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
        <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none">
          <defs>
            <linearGradient id="tech-network" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
              <stop offset="45%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
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
        {/* Tech nodes made more subtle - reduced opacity */}
        {techNodes.map((node, index) => (
          <div
            key={`tech-node-${index}`}
            className="absolute w-2 h-2 rounded-full bg-[#22d3ee] opacity-40"
            style={{
              ...node,
              boxShadow: "0 0 12px rgba(34, 211, 238, 0.4)",
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/35 to-background/75" />

      <div className="container mx-auto relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-headline-lg sm:text-headline-xl font-bold mb-6 takeover-title creatives-font leading-[1.1]">
            <span className="gradient-rgb">Your Digital Partner for Building From Zero</span>
          </h1>

          {/* Subheadline */}
          <p className="text-body sm:text-body-lg text-foreground/85 mb-6 max-w-2xl mx-auto leading-relaxed px-4">
            AI-powered planning, community support, and fundraising tools designed for rookie founders. Launch faster, build smarter.
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

          {/* Social Proof in Hero */}
          <div className="mb-6 sm:mb-8 px-4">
            <p className="text-sm sm:text-base text-muted-foreground">
              Join creative entrepreneurs building our future
            </p>
          </div>

          {/* CTA Buttons - Enhanced with better copy and trust elements */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4">
            <Button 
              size="lg" 
              className="bg-gradient-rgb hover:opacity-90 text-primary-foreground px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl font-semibold btn-magnetic btn-start-creating relative overflow-hidden group w-full sm:w-auto shadow-lg hover:shadow-xl rgb-glow-subtle hover:rgb-glow transition-all duration-300" 
              aria-label="Start Here" 
              asChild
            >
              <Link to="/bizmap-ai">
                <span className="relative z-10">Start Here</span>
                <ArrowRight className="ml-2 w-5 h-5 relative z-10" />
                <div className="absolute inset-0 bg-gradient-rgb opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
              </Link>
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="border-2 border-primary/50 hover:bg-primary/10 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg btn-magnetic relative overflow-hidden group w-full sm:w-auto" 
              aria-label="Go to Dashboard"
              asChild
            >
              <Link to="/dashboard">
                <LayoutDashboard className="mr-2 w-4 sm:w-5 h-4 sm:h-5" />
                <span>Go to Dashboard</span>
              </Link>
            </Button>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16 px-4">
            <div className="glass-blue btn-magnetic p-4 sm:p-6 bg-card border-2 border-planning/30 hover:border-planning/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue/20">
              <div className="flex justify-center mb-3">
                <Sparkles className="w-6 sm:w-8 h-6 sm:h-8 text-planning" />
              </div>
              <div className="text-base sm:text-lg font-semibold text-foreground mb-2">Launch in 30 Days</div>
              <div className="text-muted-foreground text-xs sm:text-sm">Sprint-based roadmap gets you from idea to first customer fast</div>
            </div>
            <div className="glass-red btn-magnetic p-4 sm:p-6 bg-card border-2 border-action/30 hover:border-action/60 transition-all duration-300 hover:shadow-lg hover:shadow-red/20">
              <div className="flex justify-center mb-3">
                <ArrowRight className="w-6 sm:w-8 h-6 sm:h-8 text-action" />
              </div>
              <div className="text-base sm:text-lg font-semibold text-foreground mb-2">Creative-First Intelligence</div>
              <div className="text-muted-foreground text-xs sm:text-sm">AI trained on creative business models, not corporate playbooks</div>
            </div>
            <div className="glass-green btn-magnetic p-4 sm:p-6 sm:col-span-2 lg:col-span-1 bg-card border-2 border-growth/30 hover:border-growth/60 transition-all duration-300 hover:shadow-lg hover:shadow-green/20">
              <div className="flex justify-center mb-3">
                <Sparkles className="w-6 sm:w-8 h-6 sm:h-8 text-growth" />
              </div>
              <div className="text-base sm:text-lg font-semibold text-foreground mb-2">Accountability Partners</div>
              <div className="text-muted-foreground text-xs sm:text-sm">Match with fellow creatives for daily check-ins and demo days</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;