import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-bg-animated.jpg";

const Hero = () => {
  return (
    <section id="overview" className="scroll-mt-24 relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Creative Wallpaper Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-blue-900/10 to-purple-900/20" />
      
      {/* Geometric Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 60% 80%, rgba(119, 198, 255, 0.3) 0%, transparent 50%)
          `
        }} />
      </div>
      
      {/* Dynamic Floating Creative Elements */}
      <div className="absolute top-20 left-10 w-6 h-6 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full animate-float opacity-60" />
      <div className="absolute top-40 right-20 w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full animate-spiral opacity-40" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 left-20 w-4 h-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-zigzag opacity-50" style={{ animationDelay: '2s' }} />
      <div className="absolute top-60 left-1/3 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-diagonal-float opacity-70" style={{ animationDelay: '3s' }} />
      <div className="absolute bottom-60 right-1/3 w-7 h-7 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full animate-figure-eight opacity-30" style={{ animationDelay: '4s' }} />
      
      {/* Creative Brush Strokes */}
      <div className="absolute top-32 right-1/4 w-32 h-2 bg-gradient-to-r from-transparent via-primary/20 to-transparent rounded-full rotate-12 animate-pulse" />
      <div className="absolute bottom-32 left-1/4 w-24 h-1 bg-gradient-to-r from-transparent via-secondary/30 to-transparent rounded-full -rotate-12 animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Glowing Orbs */}
      <div className="absolute top-1/4 right-1/6 w-20 h-20 bg-gradient-to-r from-primary/10 to-transparent rounded-full blur-xl animate-orbit opacity-40" style={{ animationDelay: '5s' }} />
      <div className="absolute bottom-1/4 left-1/6 w-16 h-16 bg-gradient-to-l from-secondary/15 to-transparent rounded-full blur-lg animate-spiral opacity-30" style={{ animationDelay: '6s' }} />

      <div className="container mx-auto px-6 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-slide-up takeover-title creatives-font leading-tight">
            <span className="takeover-gradient">Turn Your Creativity Into</span>
            <br />
            <span className="animated-gradient">Profitable Businesses</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <strong className="text-foreground">Join the movement of creators who refuse to settle.</strong> We're the dreamers, makers, and rebels transforming industries. Your creative vision deserves a profitable business. <em className="text-primary font-medium">It's time to take over.</em>
          </p>

          {/* CTA Buttons */}
          <div className="flex justify-center mb-16 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Button size="lg" className="glass bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg btn-magnetic btn-start-creating relative overflow-hidden group" aria-label="Get AI business planning support" asChild>
              <Link to="/dream2plan">
                <span className="relative z-10">Get AI Business Plan</span>
                <ArrowRight className="ml-2 w-5 h-5 relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
              </Link>
            </Button>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <div className="glass-card btn-magnetic">
              <div className="flex justify-center mb-3">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="text-lg font-semibold takeover-gradient mb-2">AI-Powered Planning</div>
              <div className="text-muted-foreground text-sm">Smart business planning support tailored for creative entrepreneurs</div>
            </div>
            <div className="glass-card btn-magnetic">
              <div className="flex justify-center mb-3">
                <ArrowRight className="w-8 h-8 text-secondary" />
              </div>
              <div className="text-lg font-semibold animated-gradient mb-2">No-Code Automation</div>
              <div className="text-muted-foreground text-sm">Leverage automated tools for faster business execution and growth</div>
            </div>
            <div className="glass-card btn-magnetic">
              <div className="flex justify-center mb-3">
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
              <div className="text-lg font-semibold reverse-gradient mb-2">Creative Community</div>
              <div className="text-muted-foreground text-sm">Connect with innovators and creators building amazing businesses</div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;