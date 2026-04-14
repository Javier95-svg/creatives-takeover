const AuthWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">

      {/* Deep base — near-black with a very subtle warm-cool split */}
      <div className="absolute inset-0 dark:bg-[#080c14] bg-[#f0f2f7]" />

      {/* Primary orb — top-left, indigo-violet */}
      <div
        className="absolute -top-[18rem] -left-[14rem] w-[62rem] h-[62rem] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.10) 40%, transparent 70%)',
          filter: 'blur(72px)',
        }}
      />

      {/* Secondary orb — bottom-right, cyan */}
      <div
        className="absolute -bottom-[20rem] -right-[16rem] w-[58rem] h-[58rem] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.13) 0%, rgba(59,130,246,0.08) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Tertiary accent orb — center-right, violet */}
      <div
        className="absolute top-1/2 right-[8%] -translate-y-1/2 w-[36rem] h-[36rem] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Dot grid — fine, barely visible */}
      <div
        className="absolute inset-0 dark:opacity-[0.07] opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          color: 'hsl(220 60% 70%)',
        }}
      />

      {/* Diagonal hairline rule — single, premium feel */}
      <div
        className="absolute inset-0 dark:opacity-[0.06] opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(135deg, transparent calc(50% - 0.5px), rgba(148,163,184,0.5) calc(50%), transparent calc(50% + 0.5px))',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Subtle top highlight — simulates a light source above */}
      <div
        className="absolute top-0 inset-x-0 h-px dark:opacity-30 opacity-20"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(148,163,184,0.8) 30%, rgba(199,210,254,0.9) 50%, rgba(148,163,184,0.8) 70%, transparent 100%)',
        }}
      />

      {/* Soft inner glow ring — upper center, very subtle */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[18rem]"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.10) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Bottom vignette for grounding */}
      <div className="absolute bottom-0 inset-x-0 h-48 dark:bg-gradient-to-t dark:from-[#080c14]/80 dark:to-transparent bg-gradient-to-t from-[#f0f2f7]/70 to-transparent" />

      {/* Final readability scrim — keeps the form card legible */}
      <div className="absolute inset-0 dark:bg-[#080c14]/30 bg-white/20 backdrop-blur-[1px]" />
    </div>
  );
};

export default AuthWallpaper;
