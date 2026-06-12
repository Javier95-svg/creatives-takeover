const BizmapWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Stock-inspired animated wallpaper - matches Insighta tab */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient base - theme-aware */}
        <div className="absolute inset-0 
          bg-gradient-to-br 
          dark:from-[#030914] dark:via-[#071322] dark:to-[#0b1f33] 
          from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]" />

        {/* Market grid - theme-aware */}
        <div
          className="absolute inset-0 
            dark:opacity-[0.18] opacity-[0.12]"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(59,130,246,0.25) 1px, transparent 1px),
              linear-gradient(0deg, rgba(59,130,246,0.25) 1px, transparent 1px)
            `,
            backgroundSize: '120px 120px'
          }}
        />

        {/* Animated line charts - theme-aware */}
        <svg className="absolute inset-0 w-full h-full 
          dark:opacity-35 opacity-25" 
          viewBox="0 0 1440 900">
          <defs>
            <linearGradient id="bizmap-line-1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(59,130,246,0)" />
              <stop offset="50%" stopColor="rgba(59,130,246,0.6)" />
              <stop offset="100%" stopColor="rgba(59,130,246,0)" />
            </linearGradient>
            <linearGradient id="bizmap-line-2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(16,185,129,0)" />
              <stop offset="50%" stopColor="rgba(16,185,129,0.6)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0)" />
            </linearGradient>
          </defs>
          {/* Primary trend line */}
          <path
            d="M120 540 Q240 420 360 460 T600 400 Q780 360 900 460 T1200 380"
            fill="none"
            stroke="url(#bizmap-line-1)"
            strokeWidth="2"
            strokeDasharray="10 20"
          />
          {/* Secondary trend line */}
          <path
            d="M160 640 Q320 620 460 520 T720 560 Q900 600 1080 540 T1300 600"
            fill="none"
            stroke="url(#bizmap-line-2)"
            strokeWidth="1.6"
            strokeDasharray="14 24"
          />
        </svg>

        {/* Rotating data discs - theme-aware */}
        <div className="absolute -top-32 right-1/4 w-[32rem] h-[32rem] rounded-full 
          border 
          dark:border-sky-400/20 border-sky-400/15 
          blur-[1px] 
          animate-[spin_36s_linear_infinite]" />
        <div className="absolute top-1/3 -left-28 w-[28rem] h-[28rem] rounded-full 
          border 
          dark:border-emerald-300/20 border-emerald-300/15 
          blur-[1px] 
          animate-[spin_28s_linear_infinite_reverse]" />

        {/* Pulsing data nodes - theme-aware */}
        {[
          { top: '24%', left: '28%' },
          { top: '40%', left: '50%' },
          { top: '58%', left: '34%' },
          { top: '48%', left: '66%' },
          { top: '32%', left: '74%' },
          { top: '62%', left: '78%' }
        ].map((pos, index) => (
          <div
            key={`bizmap-node-${index}`}
            className="absolute w-2.5 h-2.5 rounded-full 
              dark:bg-cyan-300/80 dark:shadow-[0_0_14px_rgba(56,189,248,0.6)]
              bg-cyan-500/60 shadow-glow-info"
            style={{
              ...pos,
              animation: 'pulse 2.8s ease-in-out infinite',
              animationDelay: `${index * 0.5}s`
            }}
          />
        ))}

        {/* Readability overlay - theme-aware */}
        <div className="absolute inset-0 
          bg-gradient-to-b 
          dark:from-background/72 dark:via-background/45 dark:to-background/78 
          from-background/80 from-background/85 to-background/82" />
      </div>
    </div>
  );
};

export default BizmapWallpaper;
