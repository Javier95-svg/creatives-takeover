const BizmapWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Blueprint gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#010409] via-[#03111b] to-[#06213a]" />

      {/* Circuit mesh */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(56,189,248,0.18) 1px, transparent 1px),
            linear-gradient(0deg, rgba(56,189,248,0.18) 1px, transparent 1px),
            linear-gradient(45deg, rgba(56,189,248,0.12) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px, 120px 120px, 200px 200px'
        }}
      />

      {/* Rotating arcs */}
      <div className="absolute -top-36 -right-20 w-[40rem] h-[40rem] rounded-full border border-cyan-500/20 blur-[1px] animate-[spin_38s_linear_infinite]" />
      <div className="absolute top-1/3 -left-28 w-[34rem] h-[34rem] rounded-full border border-sky-400/20 blur-[1px] animate-[spin_30s_linear_infinite_reverse]" />

      {/* Route overlays */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'repeating-linear-gradient(120deg, transparent 0, transparent 12px, rgba(56,189,248,0.1) 12px, rgba(56,189,248,0.1) 16px)',
          backgroundSize: '220px 220px',
          transform: 'rotate(2deg)'
        }}
      />

      {/* Sliding blueprint plates */}
      <div
        className="absolute inset-0 opacity-20 animate-[spin_24s_linear_infinite]"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(13,148,136,0.08) 0%, rgba(13,148,136,0.18) 50%, rgba(13,148,136,0.08) 100%)',
          maskImage:
            'radial-gradient(circle at 50% 50%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 70%)'
        }}
      />

      {/* Pulsing nodes */}
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
          className="absolute w-2.5 h-2.5 rounded-full bg-cyan-300/80 shadow-[0_0_15px_rgba(56,189,248,0.55)]"
          style={{
            ...pos,
            animation: 'pulse 2.6s ease-in-out infinite',
            animationDelay: `${index * 0.5}s`
          }}
        />
      ))}

      {/* Scanning lines */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent animate-slide-down" style={{ animationDuration: '9s' }} />
        <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-cyan-400/35 to-transparent animate-slide-right" style={{ animationDuration: '11s', animationDelay: '2s' }} />
      </div>

      {/* Readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/45 to-background/80" />
    </div>
  );
};

export default BizmapWallpaper;

