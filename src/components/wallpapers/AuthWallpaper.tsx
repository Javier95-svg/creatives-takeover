const AuthWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Modern gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1e] via-[#141b2e] to-[#1a2440]" />

      {/* Rotating gradient orbs */}
      <div className="absolute -top-40 left-1/4 w-[40rem] h-[40rem] rounded-full bg-gradient-to-br from-[#3b82f6]/25 via-[#8b5cf6]/20 to-transparent blur-3xl animate-[spin_45s_linear_infinite] opacity-60" />
      <div className="absolute top-1/2 -right-32 w-[36rem] h-[36rem] rounded-full bg-gradient-to-tl from-[#06b6d4]/30 via-[#3b82f6]/15 to-transparent blur-3xl animate-[spin_38s_linear_infinite_reverse] opacity-55" />
      <div className="absolute bottom-20 left-1/3 w-[32rem] h-[32rem] rounded-full bg-gradient-to-tr from-[#8b5cf6]/20 via-[#ec4899]/15 to-transparent blur-3xl animate-[spin_42s_linear_infinite] opacity-50" />

      {/* Animated mesh pattern */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(59,130,246,0.15) 1px, transparent 1px),
            linear-gradient(0deg, rgba(59,130,246,0.15) 1px, transparent 1px),
            linear-gradient(45deg, rgba(139,92,246,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 100px 100px, 150px 150px',
          animation: 'pulse 8s ease-in-out infinite'
        }}
      />

      {/* Floating geometric shapes */}
      {[
        { top: '15%', left: '20%', size: 60, rotation: '12deg', delay: '0s' },
        { top: '35%', left: '75%', size: 80, rotation: '-8deg', delay: '1.2s' },
        { top: '60%', left: '15%', size: 70, rotation: '15deg', delay: '2.4s' },
        { top: '75%', left: '65%', size: 55, rotation: '-12deg', delay: '3.6s' },
        { top: '25%', left: '50%', size: 65, rotation: '8deg', delay: '4.8s' }
      ].map((shape, index) => (
        <div
          key={`auth-shape-${index}`}
          className="absolute rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/2 to-transparent backdrop-blur-sm shadow-[0_0_40px_rgba(59,130,246,0.1)]"
          style={{
            top: shape.top,
            left: shape.left,
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            transform: `rotate(${shape.rotation})`,
            animation: 'float 12s ease-in-out infinite',
            animationDelay: shape.delay
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-2xl" />
        </div>
      ))}

      {/* Glowing connection nodes */}
      {[
        { top: '20%', left: '25%' },
        { top: '30%', left: '70%' },
        { top: '50%', left: '20%' },
        { top: '65%', left: '60%' },
        { top: '45%', left: '45%' },
        { top: '80%', left: '30%' },
        { top: '25%', left: '55%' },
        { top: '55%', left: '75%' }
      ].map((node, index) => (
        <div
          key={`auth-node-${index}`}
          className="absolute rounded-full bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)]"
          style={{
            top: node.top,
            left: node.left,
            width: '12px',
            height: '12px',
            animation: 'pulse 3s ease-in-out infinite',
            animationDelay: `${index * 0.4}s`
          }}
        />
      ))}

      {/* Animated flowing lines */}
      <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 1440 900">
        <defs>
          <linearGradient id="auth-line-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(59,130,246,0)" />
            <stop offset="50%" stopColor="rgba(59,130,246,0.5)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </linearGradient>
          <linearGradient id="auth-line-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(139,92,246,0)" />
            <stop offset="50%" stopColor="rgba(139,92,246,0.4)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </linearGradient>
        </defs>
        <path 
          d="M0 300 Q360 200 720 350 T1440 400" 
          fill="none" 
          stroke="url(#auth-line-1)" 
          strokeWidth="2" 
          strokeDasharray="20 15"
          style={{
            animation: 'pulse 4s ease-in-out infinite'
          }}
        />
        <path 
          d="M0 600 Q400 500 800 650 T1440 700" 
          fill="none" 
          stroke="url(#auth-line-2)" 
          strokeWidth="1.5" 
          strokeDasharray="15 20"
          style={{
            animation: 'pulse 5s ease-in-out infinite',
            animationDelay: '1s'
          }}
        />
        <path 
          d="M0 150 Q300 250 600 200 T1440 250" 
          fill="none" 
          stroke="rgba(6,182,212,0.3)" 
          strokeWidth="1.8" 
          strokeDasharray="18 22"
          style={{
            animation: 'pulse 4.5s ease-in-out infinite',
            animationDelay: '2s'
          }}
        />
      </svg>

      {/* Sparkle particles */}
      {Array.from({ length: 20 }).map((_, index) => (
        <div
          key={`auth-sparkle-${index}`}
          className="absolute w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.7)]"
          style={{
            top: `${10 + (index * 4.5) % 85}%`,
            left: `${5 + (index * 7) % 90}%`,
            animation: 'pulse 4s ease-in-out infinite',
            animationDelay: `${index * 0.3}s`
          }}
        />
      ))}

      {/* Floating gradient orbs */}
      <div className="absolute top-24 right-1/4 w-32 h-32 rounded-full bg-gradient-to-br from-[#3b82f6]/20 via-transparent to-transparent blur-2xl animate-[ping_10s_linear_infinite] opacity-40" />
      <div className="absolute bottom-32 left-1/4 w-40 h-40 rounded-full bg-gradient-to-br from-[#8b5cf6]/15 via-transparent to-transparent blur-2xl animate-[ping_12s_linear_infinite_reverse] opacity-35" />
      <div className="absolute top-1/2 left-1/2 w-36 h-36 rounded-full bg-gradient-to-br from-[#06b6d4]/18 via-transparent to-transparent blur-2xl animate-[ping_11s_linear_infinite] opacity-30" />

      {/* Shimmer effect */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          background: 'linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
          width: '220%',
          height: '100%',
          top: 0,
          left: '-120%',
          transform: 'translateX(-10%)',
          animation: 'wallpaperShimmer 18s ease-in-out infinite'
        }}
      />

      {/* Readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/50 to-background/75" />
    </div>
  );
};

export default AuthWallpaper;

