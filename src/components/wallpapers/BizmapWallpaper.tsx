const BizmapWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Deep tactical gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#040815] via-[#050e1f] to-[#09142c]" />

      {/* Circuit grid */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(56,189,248,0.2) 1px, transparent 1px),
            linear-gradient(0deg, rgba(56,189,248,0.2) 1px, transparent 1px),
            linear-gradient(45deg, rgba(147,197,253,0.15) 1px, transparent 1px),
            radial-gradient(circle at 10% 20%, rgba(56,189,248,0.12), transparent 55%),
            radial-gradient(circle at 80% 30%, rgba(125,211,252,0.08), transparent 60%)
          `,
          backgroundSize: '140px 140px, 140px 140px, 220px 220px, 100% 100%, 100% 100%'
        }}
      />

      {/* Rotating strategic arcs */}
      <div className="absolute -top-32 -right-24 w-[42rem] h-[42rem] rounded-full border border-primary/20 blur-[2px] animate-[spin_36s_linear_infinite]" />
      <div className="absolute top-1/3 -left-32 w-[32rem] h-[32rem] rounded-full border border-secondary/15 blur-[2px] animate-[spin_28s_linear_infinite_reverse]" />

      {/* Highlighted routes */}
      <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 1440 900">
        <defs>
          <linearGradient id="bizmap-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(56,189,248,0)" />
            <stop offset="50%" stopColor="rgba(56,189,248,0.45)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </linearGradient>
        </defs>
        <path
          d="M200 120 Q360 220 420 340 T680 520 Q820 600 920 520 T1200 360"
          fill="none"
          stroke="url(#bizmap-line)"
          strokeWidth="1.6"
          strokeDasharray="8 14"
        />
        <path
          d="M160 480 Q320 420 400 520 T640 700 Q760 780 900 720 T1220 540"
          fill="none"
          stroke="rgba(94,234,212,0.35)"
          strokeWidth="1.2"
          strokeDasharray="10 20"
        />
      </svg>

      {/* Pulsing route nodes */}
      {[
        { top: '18%', left: '22%' },
        { top: '34%', left: '48%' },
        { top: '55%', left: '36%' },
        { top: '48%', left: '63%' },
        { top: '32%', left: '72%' },
        { top: '58%', left: '78%' }
      ].map((pos, index) => (
        <div
          key={`bizmap-node-${index}`}
          className="absolute w-3 h-3 rounded-full bg-cyan-300/70 shadow-[0_0_12px_rgba(56,189,248,0.6)]"
          style={{
            ...pos,
            animation: 'pulse 2.8s ease-in-out infinite',
            animationDelay: `${index * 0.6}s`
          }}
        />
      ))}

      {/* Scanning lines */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/35 to-transparent animate-slide-down" style={{ animationDuration: '8s' }} />
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-slide-down" style={{ animationDuration: '12s', animationDelay: '3s' }} />
        <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-primary/25 to-transparent animate-slide-right" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      {/* Soft overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/75" />
    </div>
  );
};

export default BizmapWallpaper;

