import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-bg-animated.jpg";

const Hero = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <section id="overview" className="scroll-mt-24 relative min-h-screen flex items-center justify-center overflow-hidden pt-20 px-4 sm:px-6">
      {/* Deep Tech Gradient Base */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/40 via-blue-950/30 to-slate-900/50" />
      
      {/* Circuit Board Pattern */}
      <div className="absolute inset-0 opacity-[0.08]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--primary) / 0.3) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--secondary) / 0.2) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--secondary) / 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
          backgroundPosition: '0 0, 0 0, 0 0, 0 0'
        }} />
      </div>

      {/* Atomic Orbital Rings */}
      <div className="absolute top-1/2 left-1/4 w-64 h-64 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 rounded-full border border-primary/20 animate-spin" style={{ animationDuration: '20s' }} />
        <div className="absolute inset-4 rounded-full border border-secondary/15 animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
        <div className="absolute inset-8 rounded-full border border-accent/10 animate-spin" style={{ animationDuration: '25s' }} />
        <div className="absolute top-1/2 left-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 bg-primary/60 rounded-full animate-pulse" />
      </div>

      <div className="absolute top-1/3 right-1/5 w-48 h-48 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 rounded-full border border-secondary/15 animate-spin" style={{ animationDuration: '18s' }} />
        <div className="absolute inset-3 rounded-full border border-primary/12 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }} />
        <div className="absolute top-1/2 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2 bg-secondary/50 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Orbiting Particles */}
      <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-primary/70 rounded-full animate-orbit" style={{ animationDuration: '20s' }} />
      <div className="absolute top-1/2 left-1/4 w-1.5 h-1.5 bg-secondary/60 rounded-full animate-orbit" style={{ animationDuration: '15s', animationDelay: '3s' }} />
      <div className="absolute top-1/3 right-1/5 w-1.5 h-1.5 bg-accent/60 rounded-full animate-orbit" style={{ animationDuration: '18s', animationDelay: '2s' }} />

      {/* Connecting Node Network */}
      <div className="absolute top-1/4 left-1/6 w-1.5 h-1.5 bg-primary/40 rounded-full" />
      <div className="absolute top-1/3 left-1/5 w-1.5 h-1.5 bg-primary/40 rounded-full" />
      <div className="absolute top-2/5 left-1/4 w-1.5 h-1.5 bg-primary/40 rounded-full" />
      <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-secondary/35 rounded-full" />
      <div className="absolute bottom-1/4 right-1/5 w-1.5 h-1.5 bg-secondary/35 rounded-full" />
      
      {/* Tech Connection Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" style={{ pointerEvents: 'none' }}>
        <line x1="16.67%" y1="25%" x2="20%" y2="33.33%" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.4" />
        <line x1="20%" y1="33.33%" x2="25%" y2="40%" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.4" />
        <line x1="75%" y1="66.67%" x2="80%" y2="75%" stroke="hsl(var(--secondary))" strokeWidth="1" opacity="0.3" />
      </svg>

      {/* Robotic Geometric Accents */}
      <div className="absolute top-20 right-1/4 w-16 h-16 border border-primary/10 rotate-45 animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-32 left-1/5 w-12 h-12 border border-secondary/8 rotate-12 animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      
      {/* Glowing Tech Aura */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-gradient-radial from-primary/15 via-primary/5 to-transparent blur-3xl animate-drift" style={{ animationDuration: '15s' }} />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-radial from-secondary/12 via-secondary/4 to-transparent blur-3xl animate-drift" style={{ animationDuration: '18s', animationDelay: '5s', animationDirection: 'reverse' }} />

      <div className="container mx-auto relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-slide-up takeover-title creatives-font leading-tight">
            <span className="animated-gradient">The Digital Partner for Building From Zero</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed animate-slide-up px-4" style={{ animationDelay: '0.2s' }}>
            From scattered ideas to a structured plan, validated offer, and profitable launch in 30 days
          </p>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8 sm:mb-10 text-xs sm:text-sm text-muted-foreground px-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Launch before perfection</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>No investors needed</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-12 sm:mb-16 animate-slide-up px-4" style={{ animationDelay: '0.4s' }}>
            <Button size="lg" className="glass bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg btn-magnetic btn-start-creating relative overflow-hidden group w-full sm:w-auto" aria-label="Create My Plan" asChild>
              <Link to="/dream2plan">
                <span className="relative z-10">Create My Plan</span>
                <ArrowRight className="ml-2 w-4 sm:w-5 h-4 sm:h-5 relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              </Link>
            </Button>
            
            <Button size="lg" variant="outline" className="glass border-2 border-primary/50 hover:bg-primary/10 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg btn-magnetic relative overflow-hidden group w-full sm:w-auto" aria-label="Go to Dashboard" asChild>
              <Link to="/dashboard">
                <LayoutDashboard className="mr-2 w-4 sm:w-5 h-4 sm:h-5" />
                <span>Go to Dashboard</span>
              </Link>
            </Button>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16 animate-slide-up px-4" style={{ animationDelay: '0.6s' }}>
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