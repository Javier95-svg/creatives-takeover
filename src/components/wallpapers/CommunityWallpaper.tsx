const CommunityWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Warm gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a0d1a] via-[#381327] to-[#4b1a38]" />

      {/* Connection halos */}
      <div className="absolute -top-36 left-1/5 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-[#fb923c]/35 via-[#f97316]/20 to-transparent blur-3xl animate-[spin_42s_linear_infinite]" />
      <div className="absolute top-1/3 right-[-14rem] w-[38rem] h-[38rem] rounded-full bg-gradient-to-tl from-[#f472b6]/30 via-[#ec4899]/20 to-transparent blur-3xl animate-[spin_36s_linear_infinite_reverse]" />

      {/* Animated connection lines */}
      <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 1440 900">
        <defs>
          <linearGradient id="community-connector" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(249,115,22,0)" />
            <stop offset="50%" stopColor="rgba(249,115,22,0.45)" />
            <stop offset="100%" stopColor="rgba(249,115,22,0)" />
          </linearGradient>
        </defs>
        <path d="M160 200 Q320 130 420 280 T680 460 Q860 540 1040 420 T1320 260" fill="none" stroke="url(#community-connector)" strokeWidth="1.4" strokeDasharray="14 20" />
        <path d="M100 560 Q280 520 420 640 T780 780 Q960 840 1200 700" fill="none" stroke="rgba(236,72,153,0.35)" strokeWidth="1.2" strokeDasharray="10 16" />
        <path d="M220 340 Q360 420 520 360 T820 260 Q1000 200 1180 300" fill="none" stroke="rgba(147,197,253,0.25)" strokeWidth="1.1" strokeDasharray="12 18" />
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
          className="absolute rounded-2xl border border-white/15 bg-white/8 backdrop-blur-sm shadow-[0_0_35px_rgba(236,72,153,0.15)]"
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
          className="absolute rounded-full bg-orange-300 shadow-[0_0_16px_rgba(249,115,22,0.55)]"
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
      <div className="absolute inset-0 bg-gradient-to-b from-background/68 via-background/38 to-background/78" />
    </div>
  );
};

export default CommunityWallpaper;

