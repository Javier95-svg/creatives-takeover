const MentorMarketplaceWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Professional gradient backdrop - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-br 
        dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#334155] 
        from-background via-muted/20 to-background" />
      
      {/* Subtle secondary gradient layer - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-t 
        dark:from-[#020617] dark:via-transparent dark:to-[#1e293b] 
        from-background/95 via-transparent to-background/90" />

      {/* Professional connection network - subtle SVG lines */}
      <svg className="absolute inset-0 w-full h-full dark:opacity-15 opacity-8" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="mentor-connection" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Connection lines representing mentor-founder connections */}
        <path 
          d="M200 300 Q400 200 600 350 T1000 400" 
          fill="none" 
          stroke="url(#mentor-connection)" 
          strokeWidth="1.5" 
          strokeDasharray="8 12" 
        />
        <path 
          d="M150 600 Q350 500 550 650 T950 700" 
          fill="none" 
          stroke="url(#mentor-connection)" 
          strokeWidth="1.2" 
          strokeDasharray="6 10" 
        />
        <path 
          d="M250 450 Q450 550 650 400 T1050 450" 
          fill="none" 
          stroke="url(#mentor-connection)" 
          strokeWidth="1.3" 
          strokeDasharray="7 11" 
        />
      </svg>

      {/* Subtle networking nodes - minimal and professional */}
      {[
        { top: '25%', left: '20%' },
        { top: '35%', left: '45%' },
        { top: '55%', left: '30%' },
        { top: '45%', left: '65%' },
        { top: '65%', left: '55%' },
        { top: '40%', left: '80%' }
      ].map((node, index) => (
        <div
          key={`mentor-node-${index}`}
          className="absolute rounded-full bg-primary/40 dark:bg-primary/50"
          style={{
            top: node.top,
            left: node.left,
            width: '8px',
            height: '8px',
            animation: 'pulse 3s ease-in-out infinite',
            animationDelay: `${index * 0.6}s`
          }}
        />
      ))}

      {/* Readability overlay - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-b dark:from-background/85 dark:via-background/70 dark:to-background/85 from-background/95 via-background/98 to-background/95" />
    </div>
  );
};

export default MentorMarketplaceWallpaper;

