const PricingWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Clean trust gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#031012] via-[#061b1d] to-[#0b2a2e]" />

      {/* Subtle grids */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(94,234,212,0.25) 1px, transparent 1px),
            linear-gradient(0deg, rgba(94,234,212,0.25) 1px, transparent 1px)
          `,
          backgroundSize: '140px 140px'
        }}
      />

      {/* Floating pricing cards */}
      {[
        { top: '16%', left: '22%', width: '18rem', height: '11rem', rotation: '-6deg' },
        { top: '38%', left: '65%', width: '16rem', height: '10rem', rotation: '5deg' },
        { top: '58%', left: '30%', width: '15rem', height: '9rem', rotation: '2deg' }
      ].map((card, index) => (
        <div
          key={`pricing-card-${index}`}
          className="absolute rounded-2xl border border-emerald-300/20 bg-white/5 backdrop-blur-md shadow-[0_0_40px_rgba(16,185,129,0.08)]"
          style={{
            top: card.top,
            left: card.left,
            width: card.width,
            height: card.height,
            transform: `rotate(${card.rotation})`,
            animation: 'float 10s ease-in-out infinite',
            animationDelay: `${index * 0.8}s`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-transparent rounded-2xl" />
          <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-emerald-400/20" />
          <div className="absolute bottom-4 right-4 h-3 w-3 rounded-full bg-emerald-300/30" />
        </div>
      ))}

      {/* Rotating currency outlines */}
      <div className="absolute -top-20 right-1/3 w-[28rem] h-[28rem] border border-emerald-200/20 rounded-full blur-[1px] animate-[spin_32s_linear_infinite]" />
      <div className="absolute bottom-[-10rem] left-1/4 w-[26rem] h-[26rem] border border-cyan-200/15 rounded-full blur-[1px] animate-[spin_28s_linear_infinite_reverse]" />

      {/* Soft overlay for text */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/85" />
    </div>
  );
};

export default PricingWallpaper;

