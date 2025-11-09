const CommunityWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Warm gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a1f] via-[#2a112c] to-[#3b1738]" />

      {/* Overlapping connection circles */}
      <div
        className="absolute -top-32 -left-16 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-[#fb923c]/35 via-[#f97316]/20 to-transparent blur-3xl animate-[spin_40s_linear_infinite]"
        style={{ animationDuration: '40s' }}
      />
      <div
        className="absolute top-1/3 right-[-12rem] w-[36rem] h-[36rem] rounded-full bg-gradient-to-tl from-[#f472b6]/30 via-[#ec4899]/20 to-transparent blur-3xl animate-[spin_34s_linear_infinite_reverse]"
        style={{ animationDuration: '34s' }}
      />
      <div
        className="absolute bottom-[-12rem] left-1/4 w-[28rem] h-[28rem] rounded-full bg-gradient-to-tr from-[#a855f7]/30 via-[#6366f1]/20 to-transparent blur-3xl animate-[spin_42s_linear_infinite]"
        style={{ animationDuration: '42s' }}
      />

      {/* Interconnecting lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 1440 900">
        <defs>
          <linearGradient id="community-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(249,115,22,0)" />
            <stop offset="50%" stopColor="rgba(249,115,22,0.5)" />
            <stop offset="100%" stopColor="rgba(249,115,22,0)" />
          </linearGradient>
        </defs>
        <path
          d="M120 160 Q360 80 520 240 T880 440 Q1120 520 1340 420"
          fill="none"
          stroke="url(#community-line)"
          strokeWidth="1.6"
          strokeDasharray="12 18"
        />
        <path
          d="M80 540 Q320 520 480 640 T820 780 Q1000 840 1240 720"
          fill="none"
          stroke="rgba(236,72,153,0.35)"
          strokeWidth="1.2"
          strokeDasharray="10 16"
        />
      </svg>

      {/* Floating social nodes */}
      {[
        { top: '18%', left: '22%', color: 'bg-orange-300' },
        { top: '32%', left: '48%', color: 'bg-pink-300' },
        { top: '54%', left: '28%', color: 'bg-fuchsia-300' },
        { top: '44%', left: '68%', color: 'bg-indigo-300' },
        { top: '66%', left: '52%', color: 'bg-purple-300' },
        { top: '38%', left: '78%', color: 'bg-rose-300' }
      ].map((node, index) => (
        <div
          key={`community-node-${index}`}
          className={`absolute ${node.color} rounded-full shadow-[0_0_12px_rgba(255,255,255,0.35)]`}
          style={{
            top: node.top,
            left: node.left,
            width: '12px',
            height: '12px',
            animation: 'pulse 3s ease-in-out infinite',
            animationDelay: `${index * 0.7}s`
          }}
        />
      ))}

      {/* Gentle overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/65 via-background/35 to-background/75" />
    </div>
  );
};

export default CommunityWallpaper;

