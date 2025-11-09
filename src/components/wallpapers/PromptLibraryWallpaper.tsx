const PromptLibraryWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Vibrant base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0a1f] via-[#140f2b] to-[#1f0f36]" />

      {/* Animated ribbon flows */}
      <div
        className="absolute inset-0 opacity-60 animate-[spin_36s_linear_infinite]"
        style={{
          backgroundImage:
            'conic-gradient(from 120deg at 30% 40%, rgba(244,114,182,0.18), rgba(249,168,212,0.07), transparent 65%), conic-gradient(from 300deg at 70% 60%, rgba(56,189,248,0.16), rgba(125,211,252,0.06), transparent 70%)',
          animationDuration: '36s'
        }}
      />

      {/* Neon ribbons */}
      <div className="absolute -top-64 left-1/4 w-[65rem] h-[18rem] bg-gradient-to-r from-[#f97316]/30 via-[#ec4899]/40 to-[#8b5cf6]/30 blur-3xl opacity-70 animate-[spin_28s_linear_infinite]" />
      <div className="absolute top-2/3 -left-1/3 w-[60rem] h-[16rem] bg-gradient-to-r from-[#38bdf8]/25 via-[#22d3ee]/25 to-[#f0abfc]/25 blur-[120px] opacity-80 animate-[spin_32s_linear_infinite_reverse]" />

      {/* Floating sparks */}
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={`prompt-spark-${index}`}
          className="absolute w-1.5 h-1.5 rounded-full bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.6)]"
          style={{
            top: `${10 + Math.sin(index) * 20 + index * 6}%`,
            left: `${5 + (index * 8) % 90}%`,
            animation: 'float 6s ease-in-out infinite',
            animationDelay: `${index * 0.7}s`
          }}
        />
      ))}

      {/* Inspiration grid */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,255,255,0.12) 1px, transparent 1px)
          `,
          backgroundSize: '160px 160px'
        }}
      />

      {/* Soft overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/45 to-background/85" />
    </div>
  );
};

export default PromptLibraryWallpaper;

