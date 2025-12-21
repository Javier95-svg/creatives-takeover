const BizmapWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Base gradient backdrop - enhanced for both themes */}
      <div className="absolute inset-0 bg-gradient-to-br 
        dark:from-[#0a0f1e] dark:via-[#0f1525] dark:to-[#1a1f35] 
        from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]" />
      <div className="absolute inset-0 bg-gradient-to-t 
        dark:from-[#050812] dark:via-transparent dark:to-[#141b2e] 
        from-[#ffffff]/60 via-transparent to-[#f8fafc]/80" />
      
      {/* Bold abstract color blocks - overlapping swatches */}
      <div className="absolute top-0 left-0 w-[45%] h-[50%] 
        bg-gradient-to-br 
        dark:from-[#3b82f6]/45 dark:via-[#2563eb]/35 dark:to-transparent 
        from-[#3b82f6]/25 from-[#2563eb]/18 to-transparent 
        blur-[120px] 
        dark:opacity-80 opacity-60"
        style={{
          clipPath: 'polygon(0% 0%, 100% 0%, 80% 100%, 0% 70%)',
          animation: 'pulse 16s ease-in-out infinite',
          animationDelay: '0s'
        }} />
      
      <div className="absolute top-0 right-0 w-[50%] h-[45%] 
        bg-gradient-to-bl 
        dark:from-[#8b5cf6]/50 dark:via-[#a855f7]/40 dark:to-transparent 
        from-[#8b5cf6]/28 from-[#a855f7]/22 to-transparent 
        blur-[130px] 
        dark:opacity-85 opacity-65"
        style={{
          clipPath: 'polygon(20% 0%, 100% 0%, 100% 100%, 0% 60%)',
          animation: 'pulse 18s ease-in-out infinite',
          animationDelay: '3s'
        }} />
      
      <div className="absolute bottom-0 left-[30%] w-[40%] h-[55%] 
        bg-gradient-to-tr 
        dark:from-[#ec4899]/48 dark:via-[#f472b6]/38 dark:to-transparent 
        from-[#ec4899]/30 from-[#f472b6]/24 to-transparent 
        blur-[125px] 
        dark:opacity-82 opacity-62"
        style={{
          clipPath: 'polygon(30% 0%, 100% 30%, 70% 100%, 0% 100%)',
          animation: 'pulse 20s ease-in-out infinite',
          animationDelay: '6s'
        }} />

      {/* Organic flowing forms - abstract blobs */}
      <div className="absolute top-[15%] right-[20%] w-[35rem] h-[35rem] 
        blur-[100px] 
        dark:opacity-75 opacity-55"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.40) 0%, rgba(34,211,238,0.30) 40%, transparent 70%)',
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          animation: 'morph 25s ease-in-out infinite',
          animationDelay: '0s'
        }} />
      <div className="absolute top-[15%] right-[20%] w-[35rem] h-[35rem] 
        blur-[100px] 
        dark:hidden opacity-55"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.22) 0%, rgba(34,211,238,0.16) 40%, transparent 70%)',
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          animation: 'morph 25s ease-in-out infinite',
          animationDelay: '0s'
        }} />
      
      <div className="absolute bottom-[20%] left-[15%] w-[32rem] h-[32rem] 
        blur-[95px] 
        dark:opacity-78 opacity-58"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.42) 0%, rgba(168,85,247,0.32) 40%, transparent 70%)',
          borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%',
          animation: 'morph 28s ease-in-out infinite',
          animationDelay: '4s'
        }} />
      <div className="absolute bottom-[20%] left-[15%] w-[32rem] h-[32rem] 
        blur-[95px] 
        dark:hidden opacity-58"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.24) 0%, rgba(168,85,247,0.18) 40%, transparent 70%)',
          borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%',
          animation: 'morph 28s ease-in-out infinite',
          animationDelay: '4s'
        }} />
      
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] 
        blur-[110px] 
        dark:opacity-72 opacity-52"
        style={{
          background: 'radial-gradient(circle, rgba(236,72,153,0.38) 0%, rgba(244,114,182,0.28) 40%, transparent 70%)',
          borderRadius: '40% 60% 60% 40% / 60% 30% 70% 40%',
          animation: 'morph 30s ease-in-out infinite',
          animationDelay: '8s'
        }} />
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] 
        blur-[110px] 
        dark:hidden opacity-52"
        style={{
          background: 'radial-gradient(circle, rgba(236,72,153,0.20) 0%, rgba(244,114,182,0.14) 40%, transparent 70%)',
          borderRadius: '40% 60% 60% 40% / 60% 30% 70% 40%',
          animation: 'morph 30s ease-in-out infinite',
          animationDelay: '8s'
        }} />

      {/* Artistic brush-stroke effects - paint-like splashes */}
      <div className="absolute top-[25%] left-[10%] w-[28rem] h-[20rem] 
        bg-gradient-to-br 
        dark:from-[#3b82f6]/35 dark:via-[#8b5cf6]/25 dark:to-transparent 
        from-[#3b82f6]/20 from-[#8b5cf6]/14 to-transparent 
        blur-[80px] 
        dark:opacity-70 opacity-50"
        style={{
          clipPath: 'polygon(0% 20%, 60% 0%, 100% 40%, 40% 100%, 0% 80%)',
          transform: 'rotate(-15deg)',
          animation: 'float 22s ease-in-out infinite',
          animationDelay: '1s'
        }} />
      
      <div className="absolute bottom-[15%] right-[12%] w-[26rem] h-[22rem] 
        bg-gradient-to-tl 
        dark:from-[#ec4899]/38 dark:via-[#f472b6]/28 dark:to-transparent 
        from-[#ec4899]/22 from-[#f472b6]/16 to-transparent 
        blur-[85px] 
        dark:opacity-75 opacity-55"
        style={{
          clipPath: 'polygon(30% 0%, 100% 30%, 70% 100%, 0% 70%)',
          transform: 'rotate(20deg)',
          animation: 'float 24s ease-in-out infinite',
          animationDelay: '5s'
        }} />
      
      <div className="absolute top-[60%] right-[25%] w-[24rem] h-[18rem] 
        bg-gradient-to-bl 
        dark:from-[#06b6d4]/36 dark:via-[#22d3ee]/26 dark:to-transparent 
        from-[#06b6d4]/20 from-[#22d3ee]/14 to-transparent 
        blur-[75px] 
        dark:opacity-68 opacity-48"
        style={{
          clipPath: 'polygon(20% 0%, 80% 0%, 100% 60%, 60% 100%, 0% 80%)',
          transform: 'rotate(-10deg)',
          animation: 'float 26s ease-in-out infinite',
          animationDelay: '9s'
        }} />

      {/* Color splashes - paint drop effects */}
      <div className="absolute top-[10%] left-[60%] w-[18rem] h-[18rem] rounded-full 
        blur-[90px] 
        dark:opacity-80 opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(168,85,247,0.35) 50%, transparent 70%)',
          animation: 'pulse 12s ease-in-out infinite',
          animationDelay: '2s'
        }} />
      <div className="absolute top-[10%] left-[60%] w-[18rem] h-[18rem] rounded-full 
        blur-[90px] 
        dark:hidden opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.26) 0%, rgba(168,85,247,0.20) 50%, transparent 70%)',
          animation: 'pulse 12s ease-in-out infinite',
          animationDelay: '2s'
        }} />
      
      <div className="absolute bottom-[25%] left-[45%] w-[20rem] h-[20rem] rounded-full 
        blur-[95px] 
        dark:opacity-85 opacity-65"
        style={{
          background: 'radial-gradient(circle, rgba(236,72,153,0.48) 0%, rgba(244,114,182,0.38) 50%, transparent 70%)',
          animation: 'pulse 14s ease-in-out infinite',
          animationDelay: '6s'
        }} />
      <div className="absolute bottom-[25%] left-[45%] w-[20rem] h-[20rem] rounded-full 
        blur-[95px] 
        dark:hidden opacity-65"
        style={{
          background: 'radial-gradient(circle, rgba(236,72,153,0.28) 0%, rgba(244,114,182,0.22) 50%, transparent 70%)',
          animation: 'pulse 14s ease-in-out infinite',
          animationDelay: '6s'
        }} />
      
      <div className="absolute top-[40%] right-[15%] w-[16rem] h-[16rem] rounded-full 
        blur-[85px] 
        dark:opacity-78 opacity-58"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.42) 0%, rgba(37,99,235,0.32) 50%, transparent 70%)',
          animation: 'pulse 16s ease-in-out infinite',
          animationDelay: '10s'
        }} />
      <div className="absolute top-[40%] right-[15%] w-[16rem] h-[16rem] rounded-full 
        blur-[85px] 
        dark:hidden opacity-58"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.24) 0%, rgba(37,99,235,0.18) 50%, transparent 70%)',
          animation: 'pulse 16s ease-in-out infinite',
          animationDelay: '10s'
        }} />

      {/* Dynamic conic gradient swirls - artistic overlay */}
      <div
        className="absolute inset-0 dark:opacity-75 opacity-55 animate-[spin_45s_linear_infinite]"
        style={{
          backgroundImage:
            'conic-gradient(from 0deg at 25% 25%, rgba(59,130,246,0.35), rgba(139,92,246,0.28), rgba(236,72,153,0.22), transparent 60%), conic-gradient(from 180deg at 75% 75%, rgba(6,182,212,0.32), rgba(59,130,246,0.26), rgba(139,92,246,0.20), transparent 65%)',
        }}
      />
      <div
        className="absolute inset-0 dark:opacity-60 opacity-40 animate-[spin_40s_linear_infinite_reverse]"
        style={{
          backgroundImage:
            'conic-gradient(from 90deg at 50% 50%, rgba(236,72,153,0.28), rgba(6,182,212,0.22), rgba(59,130,246,0.18), transparent 62%)',
          animationDelay: '2s'
        }}
      />

      {/* Layered transparent shapes - depth creation */}
      {[
        { top: '20%', left: '30%', width: '22rem', height: '22rem', rotation: '-12deg', delay: '0s', opacity: 'dark:opacity-65 opacity-45' },
        { top: '50%', left: '65%', width: '20rem', height: '20rem', rotation: '15deg', delay: '3s', opacity: 'dark:opacity-70 opacity-50' },
        { top: '70%', left: '25%', width: '18rem', height: '18rem', rotation: '-8deg', delay: '6s', opacity: 'dark:opacity-68 opacity-48' },
        { top: '35%', left: '50%', width: '19rem', height: '19rem', rotation: '10deg', delay: '9s', opacity: 'dark:opacity-72 opacity-52' }
      ].map((item, index) => (
        <div
          key={`bizmap-layer-${index}`}
          className={`absolute ${item.opacity} backdrop-blur-2xl`}
          style={{
            top: item.top,
            left: item.left,
            width: item.width,
            height: item.height,
            borderRadius: '40% 60% 60% 40% / 60% 30% 70% 40%',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.10), rgba(236,72,153,0.08))',
            transform: `rotate(${item.rotation})`,
            animation: 'morph 20s ease-in-out infinite',
            animationDelay: item.delay,
            border: '1px solid rgba(59,130,246,0.2)'
          }}
        />
      ))}

      {/* Artistic mesh pattern - varying densities */}
      <div
        className="absolute inset-0 dark:opacity-[0.22] opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, rgba(59,130,246,0.35) 1px, transparent 1px),
            linear-gradient(0deg, rgba(59,130,246,0.35) 1px, transparent 1px),
            linear-gradient(45deg, rgba(139,92,246,0.25) 1px, transparent 1px),
            linear-gradient(-45deg, rgba(236,72,153,0.22) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px, 120px 120px, 180px 180px, 200px 200px',
          animation: 'pulse 16s ease-in-out infinite'
        }}
      />

      {/* Flowing energy streams - organic movement */}
      <div className="absolute top-1/4 w-full h-48 
        bg-gradient-to-r 
        dark:from-transparent dark:via-[#3b82f6]/20 dark:via-[#8b5cf6]/18 dark:to-transparent
        from-transparent via-[#3b82f6]/12 via-[#8b5cf6]/10 to-transparent
        blur-3xl opacity-70"
        style={{
          clipPath: 'polygon(0% 30%, 20% 0%, 80% 0%, 100% 30%, 100% 70%, 80% 100%, 20% 100%, 0% 70%)',
          animation: 'pulse 10s ease-in-out infinite',
          animationDelay: '0s'
        }} />
      <div className="absolute top-2/3 w-full h-40 
        bg-gradient-to-r 
        dark:from-transparent dark:via-[#ec4899]/18 dark:via-[#f472b6]/16 dark:to-transparent
        from-transparent via-[#ec4899]/10 via-[#f472b6]/8 to-transparent
        blur-3xl opacity-65"
        style={{
          clipPath: 'polygon(0% 40%, 15% 0%, 85% 0%, 100% 40%, 100% 60%, 85% 100%, 15% 100%, 0% 60%)',
          animation: 'pulse 12s ease-in-out infinite',
          animationDelay: '4s'
        }} />

      {/* Glowing accent nodes - artistic highlights */}
      {[
        { top: '15%', left: '25%', size: 20 },
        { top: '30%', left: '70%', size: 22 },
        { top: '55%', left: '20%', size: 18 },
        { top: '68%', left: '65%', size: 21 },
        { top: '40%', left: '50%', size: 24 },
        { top: '75%', left: '35%', size: 19 },
        { top: '25%', left: '55%', size: 17 }
      ].map((node, index) => (
        <div key={`bizmap-accent-${index}`} style={{ top: node.top, left: node.left }}>
          <div
            className="absolute rounded-full 
              dark:bg-[#3b82f6]/60 dark:bg-[#8b5cf6]/55 bg-[#3b82f6]/35 bg-[#8b5cf6]/30
              blur-lg"
            style={{
              width: `${node.size * 3}px`,
              height: `${node.size * 3}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'pulse 4s ease-in-out infinite',
              animationDelay: `${index * 0.5}s`
            }}
          />
          <div
            className="absolute rounded-full 
              dark:bg-[#ec4899]/80 dark:bg-[#f472b6]/70 bg-[#ec4899]/50 bg-[#f472b6]/45"
            style={{
              width: `${node.size}px`,
              height: `${node.size}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 30px rgba(59,130,246,0.6), 0 0 60px rgba(139,92,246,0.5), 0 0 90px rgba(236,72,153,0.4)'
            }}
          />
        </div>
      ))}

      {/* Soft overlay for text readability - balanced */}
      <div className="absolute inset-0 
        bg-gradient-to-b 
        dark:from-background/50 dark:via-background/25 dark:to-background/65 
        from-background/75 from-background/80 to-background/78" />
    </div>
  );
};

export default BizmapWallpaper;
