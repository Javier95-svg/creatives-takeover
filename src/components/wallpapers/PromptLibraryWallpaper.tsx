const PromptLibraryWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Creative gradient base - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-br dark:from-[#160b2e] dark:via-[#1f1045] dark:to-[#2d0f4f] from-background via-muted/30 to-background" />

      {/* Kaleidoscope swirls - theme-aware */}
      <div
        className="absolute inset-0 dark:opacity-55 opacity-25 animate-[spin_34s_linear_infinite]"
        style={{
          backgroundImage:
            'conic-gradient(from 0deg at 40% 40%, hsl(var(--primary) / 0.2), hsl(var(--accent) / 0.15), transparent 70%), conic-gradient(from 180deg at 70% 60%, hsl(var(--primary) / 0.18), hsl(var(--primary) / 0.14), transparent 75%)',
          animationDuration: '34s'
        }}
      />

      {/* Ribbon flows - theme-aware */}
      <div className="absolute -top-52 left-1/3 w-[60rem] h-[16rem] bg-gradient-to-r dark:from-[#f97316]/30 dark:via-[#ec4899]/40 dark:to-[#8b5cf6]/35 from-primary/8 via-accent/10 to-primary/9 blur-3xl dark:opacity-75 opacity-35 animate-[spin_28s_linear_infinite]" />
      <div className="absolute top-2/3 -left-1/4 w-[55rem] h-[14rem] bg-gradient-to-r dark:from-[#22d3ee]/25 dark:via-[#38bdf8]/25 dark:to-[#f0abfc]/20 from-primary/6 via-primary/6 to-primary/5 blur-[100px] dark:opacity-80 opacity-30 animate-[spin_30s_linear_infinite_reverse]" />

      {/* Spark trails - theme-aware */}
      {Array.from({ length: 16 }).map((_, index) => (
        <div
          key={`prompt-spark-${index}`}
          className="absolute w-1.5 h-1.5 rounded-full dark:bg-white/75 bg-foreground/50 dark:shadow-[0_0_12px_rgba(255,255,255,0.65)] shadow-[0_0_8px_hsl(var(--foreground)/0.4)]"
          style={{
            top: `${12 + (index * 5) % 80}%`,
            left: `${8 + (index * 11) % 84}%`,
            animation: 'pulse 3.8s ease-in-out infinite',
            animationDelay: `${index * 0.4}s`
          }}
        />
      ))}

      {/* Floating idea orbs - theme-aware */}
      <div className="absolute top-16 right-1/5 w-40 h-40 rounded-full bg-gradient-to-br dark:from-[#f97316]/25 from-accent/6 via-transparent to-transparent blur-2xl animate-[ping_8s_linear_infinite]" />
      <div className="absolute bottom-24 left-1/4 w-48 h-48 rounded-full bg-gradient-to-br dark:from-[#8b5cf6]/20 from-primary/5 via-transparent to-transparent blur-2xl animate-[ping_12s_linear_infinite_reverse]" />

      {/* Inspiration mesh - theme-aware */}
      <div
        className="absolute inset-0 dark:opacity-20 opacity-8"
        style={{
          backgroundImage: 'linear-gradient(90deg, hsl(var(--foreground) / 0.1) 1px, transparent 1px), linear-gradient(0deg, hsl(var(--foreground) / 0.1) 1px, transparent 1px)',
          backgroundSize: '150px 150px'
        }}
      />

      {/* Soft overlay - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-b dark:from-background/70 dark:via-background/40 dark:to-background/82 from-background/90 via-background/95 to-background/90" />
    </div>
  );
};

export default PromptLibraryWallpaper;

