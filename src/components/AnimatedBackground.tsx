import heroImage from "@/assets/hero-bg-animated.webp";

const AnimatedBackground = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Optimized Background with WebP and Performance Enhancements */}
      <div 
        className="absolute inset-0 bg-cover bg-center will-change-transform animate-pulse-glow"
        style={{ 
          backgroundImage: `url(${heroImage})`,
          transform: 'translateZ(0)' // Force hardware acceleration
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95" />
      
      {/* Optimized Floating Elements - Reduced from 40+ to 8 critical elements */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-primary rounded-full will-change-transform animate-float opacity-80" />
      <div className="absolute top-40 right-20 w-6 h-6 bg-secondary rounded-full will-change-transform animate-spiral opacity-60" style={{ animationDelay: '1s' }} />
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-accent rounded-full will-change-transform animate-zigzag opacity-70" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/3 right-10 w-8 h-8 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full will-change-transform animate-float opacity-50" style={{ animationDelay: '3s' }} />
      
      {/* Performance-optimized gradient orbs */}
      <div className="absolute top-24 right-1/3 w-12 h-12 bg-gradient-to-r from-primary/15 to-transparent rounded-full will-change-transform animate-spiral opacity-30 blur-sm" style={{ animationDelay: '4s' }} />
      <div className="absolute bottom-24 left-1/3 w-16 h-16 bg-gradient-to-l from-secondary/10 to-transparent rounded-full will-change-transform animate-float opacity-25 blur-md" style={{ animationDelay: '5s' }} />
      <div className="absolute top-1/2 left-8 w-10 h-10 bg-gradient-to-b from-accent/20 to-transparent rounded-full will-change-transform animate-zigzag opacity-35 blur-sm" style={{ animationDelay: '6s' }} />
      <div className="absolute bottom-1/2 right-8 w-14 h-14 bg-gradient-to-t from-primary/12 to-transparent rounded-full will-change-transform animate-float opacity-30 blur-md" style={{ animationDelay: '7s' }} />
    </div>
  );
};

export default AnimatedBackground;
