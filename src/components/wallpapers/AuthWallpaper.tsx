const AuthWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Premium gradient backdrop with depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#050812] via-[#0f1525] to-[#1a1f35]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-[#141b2e]" />

      {/* Dynamic conic gradient swirls */}
      <div
        className="absolute inset-0 opacity-60 animate-[spin_40s_linear_infinite]"
        style={{
          backgroundImage:
            'conic-gradient(from 0deg at 30% 30%, rgba(59,130,246,0.25), rgba(139,92,246,0.2), rgba(236,72,153,0.15), transparent 65%), conic-gradient(from 180deg at 70% 70%, rgba(6,182,212,0.22), rgba(59,130,246,0.18), rgba(139,92,246,0.12), transparent 70%)',
        }}
      />

      {/* Large rotating gradient orbs with enhanced blur */}
      <div className="absolute -top-48 left-1/5 w-[50rem] h-[50rem] rounded-full bg-gradient-to-br from-[#3b82f6]/30 via-[#8b5cf6]/25 to-[#ec4899]/20 blur-[120px] animate-[spin_50s_linear_infinite] opacity-70" />
      <div className="absolute top-1/2 -right-40 w-[44rem] h-[44rem] rounded-full bg-gradient-to-tl from-[#06b6d4]/35 via-[#3b82f6]/20 to-[#8b5cf6]/15 blur-[100px] animate-[spin_42s_linear_infinite_reverse] opacity-65" />
      <div className="absolute bottom-24 left-1/4 w-[38rem] h-[38rem] rounded-full bg-gradient-to-tr from-[#8b5cf6]/28 via-[#ec4899]/22 to-[#f97316]/18 blur-[110px] animate-[spin_46s_linear_infinite] opacity-60" />
      <div className="absolute top-1/3 right-1/3 w-[36rem] h-[36rem] rounded-full bg-gradient-to-bl from-[#06b6d4]/20 via-[#3b82f6]/15 to-transparent blur-[90px] animate-[spin_38s_linear_infinite_reverse] opacity-50" />

      {/* Sophisticated mesh pattern with multiple layers */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(59,130,246,0.2) 1px, transparent 1px),
            linear-gradient(0deg, rgba(59,130,246,0.2) 1px, transparent 1px),
            linear-gradient(45deg, rgba(139,92,246,0.15) 1px, transparent 1px),
            linear-gradient(-45deg, rgba(6,182,212,0.12) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px, 120px 120px, 180px 180px, 200px 200px',
          animation: 'pulse 10s ease-in-out infinite'
        }}
      />

      {/* Enhanced floating geometric shapes with glow */}
      {[
        { top: '12%', left: '18%', size: 72, rotation: '15deg', delay: '0s', color: 'from-blue-500/20' },
        { top: '32%', left: '78%', size: 88, rotation: '-10deg', delay: '1.4s', color: 'from-purple-500/20' },
        { top: '58%', left: '12%', size: 76, rotation: '18deg', delay: '2.8s', color: 'from-cyan-500/20' },
        { top: '72%', left: '68%', size: 64, rotation: '-14deg', delay: '4.2s', color: 'from-pink-500/20' },
        { top: '22%', left: '52%', size: 70, rotation: '9deg', delay: '5.6s', color: 'from-blue-500/20' },
        { top: '48%', left: '35%', size: 68, rotation: '-7deg', delay: '7s', color: 'from-purple-500/20' }
      ].map((shape, index) => (
        <div
          key={`auth-shape-${index}`}
          className={`absolute rounded-3xl border border-white/15 bg-gradient-to-br ${shape.color} via-white/3 to-transparent backdrop-blur-md shadow-[0_0_50px_rgba(59,130,246,0.15),0_0_100px_rgba(139,92,246,0.1)]`}
          style={{
            top: shape.top,
            left: shape.left,
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            transform: `rotate(${shape.rotation})`,
            animation: 'float 14s ease-in-out infinite',
            animationDelay: shape.delay
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent rounded-3xl" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-3xl" />
        </div>
      ))}

      {/* Enhanced glowing connection nodes with halos */}
      {[
        { top: '18%', left: '22%', size: 14 },
        { top: '28%', left: '72%', size: 16 },
        { top: '48%', left: '18%', size: 13 },
        { top: '62%', left: '58%', size: 15 },
        { top: '42%', left: '42%', size: 17 },
        { top: '78%', left: '28%', size: 14 },
        { top: '24%', left: '52%', size: 15 },
        { top: '54%', left: '76%', size: 16 },
        { top: '36%', left: '38%', size: 13 },
        { top: '68%', left: '48%', size: 14 }
      ].map((node, index) => (
        <div key={`auth-node-${index}`} style={{ top: node.top, left: node.left }}>
          {/* Outer glow */}
          <div
            className="absolute rounded-full bg-blue-400/40 blur-md"
            style={{
              width: `${node.size * 3}px`,
              height: `${node.size * 3}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'pulse 4s ease-in-out infinite',
              animationDelay: `${index * 0.3}s`
            }}
          />
          {/* Inner core */}
          <div
            className="absolute rounded-full bg-gradient-to-br from-blue-300 to-cyan-400 shadow-[0_0_25px_rgba(59,130,246,0.8),0_0_50px_rgba(6,182,212,0.4)]"
            style={{
              width: `${node.size}px`,
              height: `${node.size}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'pulse 3s ease-in-out infinite',
              animationDelay: `${index * 0.3}s`
            }}
          />
        </div>
      ))}

      {/* Enhanced animated flowing lines with gradients */}
      <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 1440 900">
        <defs>
          <linearGradient id="auth-line-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(59,130,246,0)" />
            <stop offset="30%" stopColor="rgba(59,130,246,0.6)" />
            <stop offset="70%" stopColor="rgba(59,130,246,0.6)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </linearGradient>
          <linearGradient id="auth-line-2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(139,92,246,0)" />
            <stop offset="30%" stopColor="rgba(139,92,246,0.5)" />
            <stop offset="70%" stopColor="rgba(139,92,246,0.5)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </linearGradient>
          <linearGradient id="auth-line-3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(6,182,212,0)" />
            <stop offset="30%" stopColor="rgba(6,182,212,0.4)" />
            <stop offset="70%" stopColor="rgba(6,182,212,0.4)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0)" />
          </linearGradient>
        </defs>
        <path 
          d="M0 280 Q380 180 760 320 T1440 380" 
          fill="none" 
          stroke="url(#auth-line-1)" 
          strokeWidth="2.5" 
          strokeDasharray="25 18"
          style={{
            animation: 'pulse 5s ease-in-out infinite',
            filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.4))'
          }}
        />
        <path 
          d="M0 580 Q420 480 840 620 T1440 680" 
          fill="none" 
          stroke="url(#auth-line-2)" 
          strokeWidth="2" 
          strokeDasharray="20 22"
          style={{
            animation: 'pulse 6s ease-in-out infinite',
            animationDelay: '1.2s',
            filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.3))'
          }}
        />
        <path 
          d="M0 130 Q320 230 640 180 T1440 220" 
          fill="none" 
          stroke="url(#auth-line-3)" 
          strokeWidth="2.2" 
          strokeDasharray="22 20"
          style={{
            animation: 'pulse 5.5s ease-in-out infinite',
            animationDelay: '2.4s',
            filter: 'drop-shadow(0 0 7px rgba(6,182,212,0.35))'
          }}
        />
        <path 
          d="M0 750 Q360 680 720 780 T1440 820" 
          fill="none" 
          stroke="rgba(236,72,153,0.3)" 
          strokeWidth="1.8" 
          strokeDasharray="18 24"
          style={{
            animation: 'pulse 5.8s ease-in-out infinite',
            animationDelay: '3.6s',
            filter: 'drop-shadow(0 0 5px rgba(236,72,153,0.25))'
          }}
        />
      </svg>

      {/* Enhanced sparkle particles with trails */}
      {Array.from({ length: 28 }).map((_, index) => (
        <div key={`auth-sparkle-${index}`} style={{ top: `${8 + (index * 3.2) % 88}%`, left: `${4 + (index * 6.5) % 92}%` }}>
          <div
            className="absolute w-2 h-2 rounded-full bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.8),0_0_30px_rgba(59,130,246,0.4)]"
            style={{
              animation: 'pulse 4.5s ease-in-out infinite',
              animationDelay: `${index * 0.25}s`
            }}
          />
          <div
            className="absolute w-1 h-1 rounded-full bg-cyan-300/60 blur-sm"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'pulse 3s ease-in-out infinite',
              animationDelay: `${index * 0.25 + 0.5}s`
            }}
          />
        </div>
      ))}

      {/* Enhanced floating gradient orbs with multiple layers */}
      <div className="absolute top-20 right-1/5 w-40 h-40 rounded-full bg-gradient-to-br from-[#3b82f6]/25 via-[#8b5cf6]/20 to-transparent blur-3xl animate-[ping_12s_linear_infinite] opacity-50" />
      <div className="absolute bottom-28 left-1/5 w-48 h-48 rounded-full bg-gradient-to-br from-[#8b5cf6]/20 via-[#ec4899]/18 to-transparent blur-3xl animate-[ping_14s_linear_infinite_reverse] opacity-45" />
      <div className="absolute top-1/2 left-1/2 w-44 h-44 rounded-full bg-gradient-to-br from-[#06b6d4]/22 via-[#3b82f6]/16 to-transparent blur-3xl animate-[ping_13s_linear_infinite] opacity-40" />
      <div className="absolute top-1/4 right-1/3 w-36 h-36 rounded-full bg-gradient-to-br from-[#ec4899]/18 via-[#f97316]/15 to-transparent blur-2xl animate-[ping_11s_linear_infinite_reverse] opacity-38" />

      {/* Ribbon flow effects */}
      <div className="absolute -top-56 left-1/4 w-[65rem] h-[18rem] bg-gradient-to-r from-[#3b82f6]/25 via-[#8b5cf6]/30 to-[#ec4899]/25 blur-[120px] opacity-70 animate-[spin_32s_linear_infinite]" />
      <div className="absolute top-2/3 -left-1/3 w-[58rem] h-[16rem] bg-gradient-to-r from-[#06b6d4]/20 via-[#3b82f6]/25 to-[#8b5cf6]/22 blur-[110px] opacity-75 animate-[spin_35s_linear_infinite_reverse]" />

      {/* Enhanced shimmer effect */}
      <div 
        className="absolute inset-0 opacity-8"
        style={{
          background: 'linear-gradient(135deg, transparent 35%, rgba(255,255,255,0.15) 50%, transparent 65%)',
          width: '250%',
          height: '120%',
          top: '-10%',
          left: '-125%',
          transform: 'translateX(-10%) rotate(12deg)',
          animation: 'wallpaperShimmer 20s ease-in-out infinite'
        }}
      />

      {/* Scanning light effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"
          style={{
            animation: 'slideDown 12s ease-in-out infinite',
            boxShadow: '0 0 20px rgba(59,130,246,0.3)'
          }}
        />
        <div 
          className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-purple-400/25 to-transparent"
          style={{
            animation: 'slideRight 14s ease-in-out infinite',
            animationDelay: '3s',
            boxShadow: '0 0 20px rgba(139,92,246,0.25)'
          }}
        />
      </div>

      {/* Depth layers with radial gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.08)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(139,92,246,0.06)_0%,transparent_50%)]" />

      {/* Premium readability overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/55 to-background/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20" />
    </div>
  );
};

export default AuthWallpaper;
