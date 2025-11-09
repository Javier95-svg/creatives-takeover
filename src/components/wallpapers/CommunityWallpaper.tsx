const CommunityWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Cool gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#061527] via-[#0a1f38] to-[#112e4a]" />

      {/* Connection halos */}
      <div className="absolute -top-36 left-1/5 w-[34rem] h-[34rem] rounded-full bg-gradient-to-br from-[#38bdf8]/30 via-[#0ea5e9]/18 to-transparent blur-3xl animate-[spin_42s_linear_infinite]" />
      <div className="absolute top-1/3 right-[-12rem] w-[36rem] h-[36rem] rounded-full bg-gradient-to-tl from-[#6366f1]/30 via-[#5eead4]/20 to-transparent blur-3xl animate-[spin_34s_linear_infinite_reverse]" />

      {/* Animated connection lines */}
      <svg className="absolute inset-0 w-full h-full opacity-22" viewBox="0 0 1440 900">
        <defs>
          <linearGradient id="community-connector" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(56,189,248,0)" />
            <stop offset="50%" stopColor="rgba(56,189,248,0.45)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </linearGradient>
        </defs>
        <path d="M160 200 Q320 130 420 280 T680 460 Q860 540 1040 420 T1320 260" fill="none" stroke="url(#community-connector)" strokeWidth="1.4" strokeDasharray="14 20" />
        <path d="M100 560 Q280 520 420 640 T780 780 Q960 840 1200 700" fill="none" stroke="rgba(129,161,248,0.35)" strokeWidth="1.2" strokeDasharray="10 16" />
        <path d="M220 340 Q360 420 520 360 T820 260 Q1000 200 1180 300" fill="none" stroke="rgba(56,189,248,0.28)" strokeWidth="1.1" strokeDasharray="12 18" />
      </svg>

      {/* Floating chat bubbles */}
      {[
        { top: '22%', left: '26%', size: 44, rotation: '-4deg' },
        { top: '40%', left: '48%', size: 52, rotation: '3deg' },
        { top: '58%', left: '30%', size: 48, rotation: '2deg' },
        { top: '36%', left: '70%', size: 46, rotation: '-5deg' },
        { top: '65%', left: '64%', size: 50, rotation: '4deg' }
      ].map((bubble, index) => (
        <div
          key={`community-bubble-${index}`}
          className="absolute rounded-2xl border border-white/12 bg-white/8 backdrop-blur-sm shadow-[0_0_35px_rgba(59,130,246,0.12)]"
          style={{
            top: bubble.top,
            left: bubble.left,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            transform: `rotate(${bubble.rotation})`,
            animation: 'float 10s ease-in-out infinite',
            animationDelay: `${index * 0.6}s`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent rounded-2xl" />
        </div>
      ))}

      {/* Glowing nodes */}
      {[
        { top: '18%', left: '22%' },
        { top: '32%', left: '46%' },
        { top: '54%', left: '28%' },
        { top: '46%', left: '68%' },
        { top: '62%', left: '52%' },
        { top: '40%', left: '78%' }
      ].map((node, index) => (
        <div
          key={`community-node-${index}`}
          className="absolute rounded-full bg-cyan-200 shadow-[0_0_16px_rgba(56,189,248,0.55)]"
          style={{
            top: node.top,
            left: node.left,
            width: '10px',
            height: '10px',
            animation: 'pulse 2.8s ease-in-out infinite',
            animationDelay: `${index * 0.5}s`
          }}
        />
      ))}

      {/* Readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/72 via-background/42 to-background/78" />
    </div>
  );
};

export default CommunityWallpaper;

