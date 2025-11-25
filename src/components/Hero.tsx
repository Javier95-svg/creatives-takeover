import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard, Users, Zap, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-bg.jpg";

const Hero = () => {
  const { isAuthenticated } = useAuth();
  // Reduced particles by 50% for visual simplification
  const creativeParticles = [
    { top: "18%", left: "16%", size: 8, color: "#fda4af", delay: "0s" },
    { top: "64%", left: "20%", size: 7, color: "#f59e0b", delay: "1.6s" },
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
      className="scroll-mt-24 relative min-h-screen flex items-center justify-center overflow-hidden pt-24 px-4 sm:px-6"
      style={{
        backgroundImage: `
          linear-gradient(135deg, rgba(12, 18, 32, 0.94), rgba(17, 24, 39, 0.9)),
          url(${heroImage})
        `,
        backgroundSize: "cover, cover",
        backgroundPosition: "center, center",
        backgroundBlendMode: "overlay, normal",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-background/10 to-background/20 mix-blend-overlay" />
        {/* Static gradient overlays – no animation on wallpaper */}
        <div
          className="absolute inset-y-0 left-0 w-1/2 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(160deg, rgba(236,72,153,0.2) 0%, rgba(249,115,22,0.08) 60%, transparent 100%)",
          }}
        />
        <div
          className="absolute inset-y-0 right-0 w-1/2 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(210deg, rgba(59,130,246,0.18) 0%, rgba(14,165,233,0.12) 50%, transparent 100%)",
          }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
          <defs>
            <linearGradient id="fusion-lines" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          {/* Static fusion lines – animation removed */}
          <path
            d="M 180 260 Q 520 160 860 300 T 1420 320 Q 1780 280 2080 180"
            fill="none"
            stroke="url(#fusion-lines)"
            strokeWidth="2"
            strokeDasharray="12 18"
          />
          <path
            d="M 200 1120 Q 580 980 960 1080 T 1540 1150 Q 1880 1120 2140 960"
            fill="none"
            stroke="url(#fusion-lines)"
            strokeWidth="1.5"
            strokeDasharray="10 16"
          />
        </svg>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(6, 182, 212, 0.15) 1px, transparent 1px),
            linear-gradient(0deg, rgba(59, 130, 246, 0.12) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px, 80px 80px",
          mixBlendMode: "screen",
        }} />
        {/* Static horizontal accent lines – glitch animation removed */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <div
            className="absolute left-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#06b6d4] to-transparent"
            style={{ top: "32%" }}
          />
          <div
            className="absolute left-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#8b5cf6] to-transparent"
            style={{ top: "68%" }}
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 takeover-title creatives-font leading-tight">
            <span className="animated-gradient">Your Digital Partner for Building From Zero</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed px-4">
            AI-powered planning, community support, and funding resources designed for creative entrepreneurs. Launch faster, build smarter.
          </p>
          
          {/* Trust Indicators - Enhanced with 4 metrics, all visible on mobile */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 sm:mb-10 px-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Growing</span>
              <span className="font-semibold text-foreground">Community</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground">30-Day</span>
              <span className="text-muted-foreground">Launch</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">AI-Powered</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Community Support</span>
            </div>
          </div>

          {/* Social Proof in Hero */}
          <div className="mb-6 sm:mb-8 px-4">
            <p className="text-sm sm:text-base text-muted-foreground">
              Join <span className="font-semibold text-foreground">creative entrepreneurs</span> building profitable businesses
            </p>
          </div>

          {/* CTA Buttons - Enhanced with better copy and trust elements */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4">
            <Button 
              size="lg" 
              className="glass bg-primary hover:bg-primary/90 text-primary-foreground px-8 sm:px-10 py-4 sm:py-5 text-lg sm:text-xl font-semibold btn-magnetic btn-start-creating relative overflow-hidden group w-full sm:w-auto shadow-lg shadow-primary/20" 
              aria-label="Start Your Free Plan" 
              asChild
            >
              <Link to="/bizmap-ai">
                <span className="relative z-10">Start Your Free Plan</span>
                <ArrowRight className="ml-2 w-5 h-5 relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              </Link>
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="glass border-2 border-primary/50 hover:bg-primary/10 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg btn-magnetic relative overflow-hidden group w-full sm:w-auto" 
              aria-label="See How It Works"
              asChild
            >
              <Link to="/bizmap-ai">
                <span>See How It Works</span>
              </Link>
            </Button>
          </div>

          {/* Trust Element near CTA */}
          <div className="mb-12 sm:mb-16 px-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Free to start</span> • No credit card required • Takes 2 minutes
            </p>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16 px-4">
            <div className="glass-card btn-magnetic p-4 sm:p-6">
              <div className="flex justify-center mb-3">
                <Sparkles className="w-6 sm:w-8 h-6 sm:h-8 text-primary" />
              </div>
              <div className="text-base sm:text-lg font-semibold takeover-gradient mb-2">Launch in 30 Days</div>
              <div className="text-muted-foreground text-xs sm:text-sm">Sprint-based roadmap gets you from idea to first customer fast</div>
            </div>
            <div className="glass-card btn-magnetic p-4 sm:p-6">
              <div className="flex justify-center mb-3">
                <ArrowRight className="w-6 sm:w-8 h-6 sm:h-8 text-secondary" />
              </div>
              <div className="text-base sm:text-lg font-semibold animated-gradient mb-2">Creative-First Intelligence</div>
              <div className="text-muted-foreground text-xs sm:text-sm">AI trained on creative business models, not corporate playbooks</div>
            </div>
            <div className="glass-card btn-magnetic p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
              <div className="flex justify-center mb-3">
                <Sparkles className="w-6 sm:w-8 h-6 sm:h-8 text-accent" />
              </div>
              <div className="text-base sm:text-lg font-semibold reverse-gradient mb-2">Accountability Partners</div>
              <div className="text-muted-foreground text-xs sm:text-sm">Match with fellow creatives for daily check-ins and demo days</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;