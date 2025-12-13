const BizMapHeroWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Base gradient - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-br dark:from-[#010409] dark:via-[#03111b] dark:to-[#06213a] from-background via-muted/30 to-background" />

      {/* Animated gradient overlay */}
      <div 
        className="absolute inset-0 opacity-30 dark:opacity-20"
        style={{
          background: `
            linear-gradient(45deg, hsl(var(--primary) / 0.15) 0%, transparent 50%),
            linear-gradient(135deg, hsl(var(--secondary) / 0.15) 0%, transparent 50%),
            linear-gradient(225deg, hsl(var(--accent) / 0.1) 0%, transparent 50%),
            linear-gradient(315deg, hsl(var(--primary) / 0.1) 0%, transparent 50%)
          `,
          backgroundSize: '200% 200%',
          animation: 'gradient-flow 20s ease infinite',
        }}
      />

      {/* Animated mesh grid */}
      <div
        className="absolute inset-0 dark:opacity-[0.12] opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--primary) / 0.2) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--primary) / 0.2) 1px, transparent 1px),
            linear-gradient(45deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 100px 100px, 150px 150px',
          animation: 'mesh-move 30s linear infinite',
        }}
      />

      {/* Rotating gradient orbs */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent blur-3xl animate-[spin_40s_linear_infinite]" />
      <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-accent/15 via-primary/10 to-transparent blur-3xl animate-[spin_35s_linear_infinite_reverse]" />
      <div className="absolute -bottom-40 right-1/4 w-[450px] h-[450px] rounded-full bg-gradient-to-br from-secondary/15 via-accent/10 to-transparent blur-3xl animate-[spin_45s_linear_infinite]" />

      {/* Floating particles */}
      {[
        { top: '15%', left: '20%', delay: '0s', size: '4px' },
        { top: '25%', left: '60%', delay: '1s', size: '6px' },
        { top: '45%', left: '30%', delay: '2s', size: '3px' },
        { top: '60%', left: '70%', delay: '3s', size: '5px' },
        { top: '75%', left: '15%', delay: '4s', size: '4px' },
        { top: '35%', left: '80%', delay: '5s', size: '3px' },
        { top: '55%', left: '50%', delay: '6s', size: '6px' },
        { top: '80%', left: '40%', delay: '7s', size: '4px' },
      ].map((particle, index) => (
        <div
          key={`particle-${index}`}
          className="absolute rounded-full bg-primary/40 dark:bg-primary/30"
          style={{
            top: particle.top,
            left: particle.left,
            width: particle.size,
            height: particle.size,
            animation: 'float-particle 8s ease-in-out infinite',
            animationDelay: particle.delay,
            boxShadow: '0 0 10px hsl(var(--primary) / 0.3)',
          }}
        />
      ))}

      {/* Pulsing glow nodes */}
      {[
        { top: '20%', left: '25%' },
        { top: '40%', left: '65%' },
        { top: '65%', left: '35%' },
        { top: '50%', left: '75%' },
      ].map((node, index) => (
        <div
          key={`glow-node-${index}`}
          className="absolute w-3 h-3 rounded-full bg-primary/50 dark:bg-primary/40"
          style={{
            top: node.top,
            left: node.left,
            animation: 'pulse-glow 3s ease-in-out infinite',
            animationDelay: `${index * 0.75}s`,
            boxShadow: '0 0 20px hsl(var(--primary) / 0.4), 0 0 40px hsl(var(--primary) / 0.2)',
          }}
        />
      ))}

      {/* Scanning lines */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-slide-down" 
          style={{ animationDuration: '12s' }} 
        />
        <div 
          className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-secondary/25 to-transparent animate-slide-right" 
          style={{ animationDuration: '15s', animationDelay: '3s' }} 
        />
      </div>

      {/* Readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-b dark:from-background/60 dark:via-background/40 dark:to-background/70 from-background/85 via-background/90 to-background/85" />
    </div>
  );
};

export default BizMapHeroWallpaper;

