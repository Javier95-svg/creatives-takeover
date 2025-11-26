const BizmapWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Blueprint gradient - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-br dark:from-[#010409] dark:via-[#03111b] dark:to-[#06213a] from-background via-muted/30 to-background" />

      {/* Circuit mesh - theme-aware */}
      <div
        className="absolute inset-0 dark:opacity-[0.14] opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--primary) / 0.18) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--primary) / 0.18) 1px, transparent 1px),
            linear-gradient(45deg, hsl(var(--primary) / 0.12) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px, 120px 120px, 200px 200px'
        }}
      />

      {/* Rotating arcs - theme-aware */}
      <div className="absolute -top-36 -right-20 w-[40rem] h-[40rem] rounded-full border border-cyan-500/20 dark:border-cyan-500/20 border-primary/10 blur-[1px] animate-[spin_38s_linear_infinite]" />
      <div className="absolute top-1/3 -left-28 w-[34rem] h-[34rem] rounded-full border border-sky-400/20 dark:border-sky-400/20 border-primary/8 blur-[1px] animate-[spin_30s_linear_infinite_reverse]" />

      {/* Route overlays - theme-aware */}
      <div
        className="absolute inset-0 dark:opacity-25 opacity-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(120deg, transparent 0, transparent 12px, hsl(var(--primary) / 0.1) 12px, hsl(var(--primary) / 0.1) 16px)',
          backgroundSize: '220px 220px',
          transform: 'rotate(2deg)'
        }}
      />

      {/* Sliding blueprint plates - theme-aware */}
      <div
        className="absolute inset-0 dark:opacity-20 opacity-8 animate-[spin_24s_linear_infinite]"
        style={{
          backgroundImage:
            'linear-gradient(90deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--primary) / 0.18) 50%, hsl(var(--primary) / 0.08) 100%)',
          maskImage:
            'radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 70%)'
        }}
      />

      {/* Pulsing nodes - theme-aware */}
      {[
        { top: '20%', left: '24%' },
        { top: '38%', left: '44%' },
        { top: '52%', left: '32%' },
        { top: '47%', left: '60%' },
        { top: '28%', left: '72%' },
        { top: '63%', left: '76%' }
      ].map((pos, index) => (
        <div
          key={`bizmap-node-${index}`}
          className="absolute w-2.5 h-2.5 rounded-full dark:bg-cyan-300/80 bg-primary/60 dark:shadow-[0_0_15px_rgba(56,189,248,0.55)] shadow-[0_0_10px_hsl(var(--primary)/0.3)]"
          style={{
            ...pos,
            animation: 'pulse 2.6s ease-in-out infinite',
            animationDelay: `${index * 0.5}s`
          }}
        />
      ))}

      {/* Scanning lines - theme-aware */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent dark:via-cyan-300/40 via-primary/20 to-transparent animate-slide-down" style={{ animationDuration: '9s' }} />
        <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent dark:via-cyan-400/35 via-primary/18 to-transparent animate-slide-right" style={{ animationDuration: '11s', animationDelay: '2s' }} />
      </div>

      {/* Readability overlay - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-b dark:from-background/70 dark:via-background/45 dark:to-background/80 from-background/90 via-background/95 to-background/90" />
    </div>
  );
};

export default BizmapWallpaper;

