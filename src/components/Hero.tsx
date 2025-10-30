import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-bg-animated.jpg";

const Hero = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <section id="overview" className="scroll-mt-24 relative min-h-screen flex items-center justify-center overflow-hidden pt-16 px-4 sm:px-6">
      {/* Deep Tech Gradient Base */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/40 via-blue-950/30 to-slate-900/50" />
      
      {/* Multi-layer Circuit Grid */}
      <div className="absolute inset-0 opacity-[0.12]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--primary) / 0.4) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--primary) / 0.4) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--secondary) / 0.25) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--secondary) / 0.25) 1px, transparent 1px),
            linear-gradient(45deg, hsl(var(--accent) / 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px, 120px 120px, 30px 30px, 30px 30px, 60px 60px'
        }} />
      </div>

      {/* Rotating Hexagon Arrays */}
      <div className="absolute top-1/4 left-1/6">
        {[...Array(3)].map((_, i) => (
          <div key={`hex-left-${i}`} className="absolute w-24 h-24" style={{ 
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: '1px solid',
            borderColor: `hsl(var(--primary) / ${0.3 - i * 0.1})`,
            transform: `scale(${1 + i * 0.3}) rotate(${i * 15}deg)`,
            animation: `spin ${20 - i * 3}s linear infinite ${i % 2 === 0 ? 'normal' : 'reverse'}`
          }} />
        ))}
      </div>

      <div className="absolute bottom-1/4 right-1/5">
        {[...Array(3)].map((_, i) => (
          <div key={`hex-right-${i}`} className="absolute w-20 h-20" style={{ 
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            border: '1px solid',
            borderColor: `hsl(var(--secondary) / ${0.25 - i * 0.08})`,
            transform: `scale(${1 + i * 0.25}) rotate(${-i * 12}deg)`,
            animation: `spin ${18 - i * 2}s linear infinite ${i % 2 === 0 ? 'reverse' : 'normal'}`
          }} />
        ))}
      </div>

      {/* Morphing Triangle Constellation */}
      <div className="absolute top-1/3 right-1/4 w-32 h-32">
        <div className="absolute w-16 h-16 border-l border-t border-primary/30 animate-pulse" style={{ transformOrigin: 'top left', animation: 'pulse 3s ease-in-out infinite' }} />
        <div className="absolute top-8 left-8 w-12 h-12 border-r border-b border-secondary/25 rotate-45 animate-pulse" style={{ animation: 'pulse 4s ease-in-out infinite', animationDelay: '1s' }} />
        <div className="absolute top-4 left-4 w-20 h-20 border border-accent/20 rotate-12" style={{ animation: 'spin 15s linear infinite reverse' }} />
      </div>

      {/* Scanning Lines */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-slide-down" style={{ animationDuration: '8s' }} />
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-secondary/30 to-transparent animate-slide-down" style={{ animationDuration: '12s', animationDelay: '3s' }} />
        <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-accent/25 to-transparent animate-slide-right" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      {/* Data Stream Particles */}
      <div className="absolute top-1/2 left-10">
        {[...Array(5)].map((_, i) => (
          <div key={`particle-left-${i}`} className="absolute w-1 h-1 bg-primary/50" style={{
            animation: `diagonal-float ${6 + i}s linear infinite`,
            animationDelay: `${i * 0.8}s`,
            left: `${i * 15}px`,
            top: `${i * -20}px`
          }} />
        ))}
      </div>

      <div className="absolute bottom-1/3 right-10">
        {[...Array(5)].map((_, i) => (
          <div key={`particle-right-${i}`} className="absolute w-1 h-1 bg-secondary/45" style={{
            animation: `zigzag ${7 + i}s linear infinite`,
            animationDelay: `${i * 1}s`,
            right: `${i * 20}px`,
            bottom: `${i * -15}px`
          }} />
        ))}
      </div>

      <div className="absolute bottom-32 right-1/3">
        <div className="relative w-24 h-24 rotate-45">
          <div className="absolute inset-0 border-2 border-accent/15" style={{ animation: 'scale-in 3.5s ease-in-out infinite alternate' }} />
          <div className="absolute inset-3 border border-primary/12" style={{ animation: 'scale-in 4.5s ease-in-out infinite alternate', animationDelay: '1s' }} />
        </div>
      </div>

      {/* Tech Grid Nodes */}
      {[
        { top: '20%', left: '15%' },
        { top: '30%', left: '25%' },
        { top: '45%', left: '18%' },
        { top: '60%', right: '20%' },
        { top: '75%', right: '30%' },
        { bottom: '25%', left: '40%' }
      ].map((pos, i) => (
        <div key={`node-${i}`} className="absolute w-1.5 h-1.5 bg-primary/40" style={{
          ...pos,
          animation: `pulse 2s ease-in-out infinite`,
          animationDelay: `${i * 0.5}s`
        }} />
      ))}

      {/* Connection Matrix */}
      <svg className="absolute inset-0 w-full h-full opacity-15" style={{ pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
            <stop offset="50%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.6 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'hsl(var(--secondary))', stopOpacity: 0 }} />
            <stop offset="50%" style={{ stopColor: 'hsl(var(--secondary))', stopOpacity: 0.5 }} />
            <stop offset="100%" style={{ stopColor: 'hsl(var(--secondary))', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <line x1="15%" y1="20%" x2="25%" y2="30%" stroke="url(#lineGrad1)" strokeWidth="1.5" />
        <line x1="25%" y1="30%" x2="18%" y2="45%" stroke="url(#lineGrad1)" strokeWidth="1.5" />
        <line x1="80%" y1="60%" x2="70%" y2="75%" stroke="url(#lineGrad2)" strokeWidth="1.5" />
        <line x1="40%" y1="75%" x2="60%" y2="85%" stroke="url(#lineGrad2)" strokeWidth="1.5" />
      </svg>

      {/* Ambient Tech Glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-radial from-primary/10 via-transparent to-transparent blur-3xl animate-drift" style={{ animationDuration: '20s' }} />
      <div className="absolute bottom-0 left-1/4 w-[450px] h-[450px] bg-gradient-radial from-secondary/8 via-transparent to-transparent blur-3xl animate-drift" style={{ animationDuration: '25s', animationDelay: '5s', animationDirection: 'reverse' }} />
      <div className="absolute top-1/2 right-1/3 w-[350px] h-[350px] bg-gradient-radial from-accent/6 via-transparent to-transparent blur-2xl animate-float" style={{ animationDuration: '18s', animationDelay: '3s' }} />

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
            <Button 
              size="lg" 
              className="glass bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg btn-magnetic btn-start-creating relative overflow-hidden group w-full sm:w-auto" 
              aria-label="Create My Plan" 
              asChild
            >
              <Link to="/bizmap-ai">
                <span className="relative z-10">Create My Plan</span>
                <ArrowRight className="ml-2 w-4 sm:w-5 h-4 sm:h-5 relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              </Link>
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="glass border-2 border-primary/50 hover:bg-primary/10 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg btn-magnetic relative overflow-hidden group w-full sm:w-auto" 
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