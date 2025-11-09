import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-bg-animated.jpg";

const Hero = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <section id="overview" className="scroll-mt-24 relative min-h-screen flex items-center justify-center overflow-hidden pt-24 px-4 sm:px-6">
      {/* Digital Canvas - Creative + Tech Fusion Wallpaper */}
      
      {/* Base Layer - Dual Gradient Blend */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0b2e] via-background to-[#0a1929]" />
      
      {/* Creative Side - Warm Gradients (Left) */}
      <div className="absolute inset-0 bg-gradient-radial from-[#ec4899]/20 via-transparent to-transparent blur-3xl" style={{ 
        left: '-10%', 
        width: '60%',
        animation: 'drift 25s ease-in-out infinite alternate'
      }} />
      <div className="absolute inset-0 bg-gradient-radial from-[#f97316]/15 via-transparent to-transparent blur-2xl" style={{ 
        left: '5%',
        top: '20%', 
        width: '50%',
        animation: 'float 20s ease-in-out infinite'
      }} />
      <div className="absolute inset-0 bg-gradient-radial from-[#8b5cf6]/18 via-transparent to-transparent blur-3xl" style={{ 
        left: '-5%',
        bottom: '10%', 
        width: '45%',
        animation: 'drift 30s ease-in-out infinite alternate-reverse'
      }} />
      
      {/* Tech Side - Cool Gradients (Right) */}
      <div className="absolute inset-0 bg-gradient-radial from-[#06b6d4]/20 via-transparent to-transparent blur-3xl" style={{ 
        right: '-10%', 
        width: '60%',
        animation: 'drift 28s ease-in-out infinite alternate-reverse'
      }} />
      <div className="absolute inset-0 bg-gradient-radial from-[#3b82f6]/15 via-transparent to-transparent blur-2xl" style={{ 
        right: '5%',
        top: '30%', 
        width: '50%',
        animation: 'float 22s ease-in-out infinite alternate'
      }} />
      <div className="absolute inset-0 bg-gradient-radial from-[#10b981]/18 via-transparent to-transparent blur-3xl" style={{ 
        right: '-5%',
        bottom: '20%', 
        width: '45%',
        animation: 'drift 26s ease-in-out infinite'
      }} />

      {/* Creative Elements - Paint Splashes */}
      <div className="absolute top-[15%] left-[8%] w-64 h-64 rounded-full bg-gradient-to-br from-[#ec4899]/30 via-[#f97316]/20 to-transparent blur-2xl opacity-60" style={{
        animation: 'morph 35s ease-in-out infinite, float 18s ease-in-out infinite'
      }} />
      <div className="absolute top-[45%] left-[12%] w-48 h-48 rounded-full bg-gradient-to-tr from-[#8b5cf6]/35 via-[#ec4899]/25 to-transparent blur-xl opacity-50" style={{
        animation: 'morph 40s ease-in-out infinite 3s, drift 20s ease-in-out infinite alternate'
      }} />
      <div className="absolute bottom-[20%] left-[18%] w-56 h-56 rounded-full bg-gradient-to-bl from-[#fbbf24]/30 via-[#f97316]/20 to-transparent blur-2xl opacity-55" style={{
        animation: 'morph 38s ease-in-out infinite 6s, float 22s ease-in-out infinite'
      }} />

      {/* Creative Elements - Brush Stroke Trails */}
      <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none">
        <defs>
          <linearGradient id="brushGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="brushGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
            <stop offset="50%" stopColor="#ec4899" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d="M 50 200 Q 150 180 250 220 T 450 200 Q 550 210 600 180"
          fill="none"
          stroke="url(#brushGrad1)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.6"
        >
          <animate attributeName="stroke-dasharray" values="0 1000; 1000 0" dur="40s" repeatCount="indefinite" />
        </path>
        <path
          d="M 100 400 Q 200 380 320 420 T 520 400 Q 600 410 700 380"
          fill="none"
          stroke="url(#brushGrad2)"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.5"
        >
          <animate attributeName="stroke-dasharray" values="0 1200; 1200 0" dur="45s" repeatCount="indefinite" />
        </path>
      </svg>

      {/* Creative Elements - Color Particles (Organic) */}
      {[...Array(15)].map((_, i) => (
        <div
          key={`creative-particle-${i}`}
          className="absolute rounded-full"
          style={{
            width: `${4 + Math.random() * 8}px`,
            height: `${4 + Math.random() * 8}px`,
            left: `${5 + Math.random() * 35}%`,
            top: `${10 + Math.random() * 80}%`,
            background: [
              'linear-gradient(135deg, #ec4899, #f97316)',
              'linear-gradient(135deg, #8b5cf6, #ec4899)',
              'linear-gradient(135deg, #fbbf24, #f97316)',
              'linear-gradient(135deg, #ec4899, #8b5cf6)'
            ][i % 4],
            opacity: 0.4 + Math.random() * 0.3,
            animation: `float ${12 + i * 2}s ease-in-out infinite, pulse ${3 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
            boxShadow: '0 0 20px rgba(236, 72, 153, 0.5)'
          }}
        />
      ))}

      {/* Creative Elements - Artistic Sparkles */}
      {[
        { top: '18%', left: '15%', color: '#fbbf24' },
        { top: '35%', left: '8%', color: '#ec4899' },
        { top: '52%', left: '20%', color: '#f97316' },
        { top: '68%', left: '12%', color: '#ec4899' },
        { top: '25%', left: '25%', color: '#8b5cf6' }
      ].map((pos, i) => (
        <div
          key={`sparkle-${i}`}
          className="absolute w-3 h-3 rounded-full"
          style={{
            ...pos,
            background: `radial-gradient(circle, ${pos.color}, transparent)`,
            boxShadow: `0 0 30px ${pos.color}, 0 0 60px ${pos.color}`,
            animation: `pulse 2.5s ease-in-out infinite`,
            animationDelay: `${i * 0.6}s`,
            opacity: 0.7
          }}
        />
      ))}

      {/* Tech Elements - Digital Grid Matrix */}
      <div className="absolute inset-0 opacity-[0.08]" style={{
        backgroundImage: `
          linear-gradient(90deg, #06b6d4 1px, transparent 1px),
          linear-gradient(0deg, #06b6d4 1px, transparent 1px),
          linear-gradient(90deg, #3b82f6 1px, transparent 1px),
          linear-gradient(0deg, #3b82f6 1px, transparent 1px)
        `,
        backgroundSize: '100px 100px, 100px 100px, 25px 25px, 25px 25px',
        backgroundPosition: 'right'
      }} />

      {/* Creative Side - Irregular Grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none">
        <pattern id="organic-grid" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          <path d="M 0 60 Q 30 55 60 60 T 120 60" stroke="#ec4899" strokeWidth="1" fill="none" />
          <path d="M 60 0 Q 55 30 60 60 T 60 120" stroke="#f97316" strokeWidth="1" fill="none" />
        </pattern>
        <rect x="0" y="0" width="50%" height="100%" fill="url(#organic-grid)" />
      </svg>

      {/* Tech Elements - Geometric Nodes Network */}
      {[
        { top: '15%', right: '12%' },
        { top: '25%', right: '20%' },
        { top: '35%', right: '15%' },
        { top: '48%', right: '25%' },
        { top: '58%', right: '18%' },
        { top: '70%', right: '22%' },
        { top: '22%', right: '30%' },
        { top: '42%', right: '32%' },
        { top: '65%', right: '28%' }
      ].map((pos, i) => (
        <div
          key={`tech-node-${i}`}
          className="absolute w-2 h-2 rounded-full bg-[#06b6d4]"
          style={{
            ...pos,
            boxShadow: '0 0 15px #06b6d4, 0 0 30px #06b6d4',
            animation: `pulse 2.5s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
            opacity: 0.7
          }}
        />
      ))}

      {/* Tech Elements - Connection Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
        <defs>
          <linearGradient id="techLine1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="techLine2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="88%" y1="15%" x2="80%" y2="25%" stroke="url(#techLine1)" strokeWidth="1.5" />
        <line x1="80%" y1="25%" x2="85%" y2="35%" stroke="url(#techLine1)" strokeWidth="1.5" />
        <line x1="85%" y1="35%" x2="75%" y2="48%" stroke="url(#techLine2)" strokeWidth="1.5" />
        <line x1="75%" y1="48%" x2="82%" y2="58%" stroke="url(#techLine1)" strokeWidth="1.5" />
        <line x1="82%" y1="58%" x2="78%" y2="70%" stroke="url(#techLine2)" strokeWidth="1.5" />
      </svg>

      {/* Tech Elements - Holographic Rings */}
      <div className="absolute top-[20%] right-[15%] w-40 h-40 rounded-full border-2 border-[#06b6d4]/30 opacity-60" style={{
        animation: 'spin 25s linear infinite',
        boxShadow: '0 0 40px rgba(6, 182, 212, 0.3), inset 0 0 40px rgba(6, 182, 212, 0.2)'
      }} />
      <div className="absolute top-[20%] right-[15%] w-32 h-32 rounded-full border-2 border-[#3b82f6]/25 opacity-50" style={{
        animation: 'spin 20s linear infinite reverse',
        transform: 'translate(20px, 20px)',
        boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
      }} />
      <div className="absolute bottom-[25%] right-[20%] w-36 h-36 rounded-full border border-[#10b981]/30 opacity-55" style={{
        animation: 'spin 30s linear infinite',
        boxShadow: '0 0 35px rgba(16, 185, 129, 0.3), inset 0 0 35px rgba(16, 185, 129, 0.2)'
      }} />

      {/* Tech Elements - Data Streams */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`data-stream-${i}`}
          className="absolute bottom-0"
          style={{
            right: `${60 + i * 5}%`,
            width: '2px',
            height: '100%'
          }}
        >
          {[...Array(8)].map((_, j) => (
            <div
              key={`stream-particle-${i}-${j}`}
              className="absolute w-1.5 h-1.5 bg-[#06b6d4] opacity-60"
              style={{
                bottom: `${j * 12}%`,
                animation: `slide-up ${8 + i * 0.5}s linear infinite`,
                animationDelay: `${j * 0.8 + i * 0.3}s`
              }}
            />
          ))}
        </div>
      ))}

      {/* Tech Elements - Glitch Lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div 
          className="absolute left-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-[#06b6d4] to-transparent"
          style={{
            top: '30%',
            animation: 'glitch 12s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute left-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent"
          style={{
            top: '65%',
            animation: 'glitch 15s ease-in-out infinite',
            animationDelay: '4s'
          }}
        />
      </div>

      {/* Fusion Zone - Pixelated Paint Drops */}
      <div className="absolute top-[40%] left-[45%] w-24 h-24 opacity-40" style={{
        background: 'linear-gradient(135deg, #ec4899 0%, #06b6d4 100%)',
        clipPath: 'polygon(50% 0%, 80% 20%, 100% 50%, 80% 80%, 50% 100%, 20% 80%, 0% 50%, 20% 20%)',
        filter: 'blur(15px)',
        animation: 'morph 20s ease-in-out infinite, float 15s ease-in-out infinite',
        mixBlendMode: 'screen'
      }} />
      <div className="absolute bottom-[35%] left-[48%] w-20 h-20 opacity-35" style={{
        background: 'linear-gradient(225deg, #8b5cf6 0%, #3b82f6 100%)',
        clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
        filter: 'blur(12px)',
        animation: 'morph 25s ease-in-out infinite 5s, drift 18s ease-in-out infinite',
        mixBlendMode: 'screen'
      }} />

      {/* Fusion Zone - Curved Grid Lines */}
      <svg className="absolute inset-0 w-full h-full opacity-15 pointer-events-none">
        <defs>
          <linearGradient id="fusionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <path
          d="M 400 100 Q 500 200 600 150 T 800 200 Q 900 180 1000 220"
          fill="none"
          stroke="url(#fusionGrad)"
          strokeWidth="2"
          strokeDasharray="8 12"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="20" dur="2s" repeatCount="indefinite" />
        </path>
        <path
          d="M 350 400 Q 450 350 550 400 T 750 380 Q 850 420 950 400"
          fill="none"
          stroke="url(#fusionGrad)"
          strokeWidth="1.5"
          strokeDasharray="10 15"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-25" dur="3s" repeatCount="indefinite" />
        </path>
      </svg>

      {/* Readability Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/70" />

      <div className="container mx-auto relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-slide-up takeover-title creatives-font leading-tight">
            <span className="animated-gradient">Your Digital Partner for Building From Zero</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto leading-relaxed animate-slide-up px-4" style={{ animationDelay: '0.2s' }}>
            Get AI-powered guidance, personalized 30-day launch roadmaps, and join a community turning ideas into reality
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