const PromptLibraryWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Creative gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#160b2e] via-[#1f1045] to-[#2d0f4f]" />

      {/* Kaleidoscope swirls */}
      <div
        className="absolute inset-0 opacity-55 animate-[spin_34s_linear_infinite]"
        style={{
          backgroundImage:
            'conic-gradient(from 0deg at 40% 40%, rgba(236,72,153,0.2), rgba(249,115,22,0.15), transparent 70%), conic-gradient(from 180deg at 70% 60%, rgba(129,140,248,0.18), rgba(56,189,248,0.14), transparent 75%)',
          animationDuration: '34s'
        }}
      />

      {/* Ribbon flows */}
      <div className="absolute -top-52 left-1/3 w-[60rem] h-[16rem] bg-gradient-to-r from-[#f97316]/30 via-[#ec4899]/40 to-[#8b5cf6]/35 blur-3xl opacity-75 animate-[spin_28s_linear_infinite]" />
      <div className="absolute top-2/3 -left-1/4 w-[55rem] h-[14rem] bg-gradient-to-r from-[#22d3ee]/25 via-[#38bdf8]/25 to-[#f0abfc]/20 blur-[100px] opacity-80 animate-[spin_30s_linear_infinite_reverse]" />

      {/* Spark trails */}
      {Array.from({ length: 16 }).map((_, index) => (
        <div
          key={`prompt-spark-${index}`}
          className="absolute w-1.5 h-1.5 rounded-full bg-white/75 shadow-[0_0_12px_rgba(255,255,255,0.65)]"
          style={{
            top: `${12 + (index * 5) % 80}%`,
            left: `${8 + (index * 11) % 84}%`,
            animation: 'pulse 3.8s ease-in-out infinite',
            animationDelay: `${index * 0.4}s`
          }}
        />
      ))}

      {/* Floating idea orbs */}
      <div className="absolute top-16 right-1/5 w-40 h-40 rounded-full bg-gradient-to-br from-[#f97316]/25 via-transparent to-transparent blur-2xl animate-[ping_8s_linear_infinite]" />
      <div className="absolute bottom-24 left-1/4 w-48 h-48 rounded-full bg-gradient-to-br from-[#8b5cf6]/20 via-transparent to-transparent blur-2xl animate-[ping_12s_linear_infinite_reverse]" />

      {/* Inspiration mesh */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '150px 150px'
        }}
      />

      {/* Soft overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/82" />
    </div>
  );
};

export default PromptLibraryWallpaper;

