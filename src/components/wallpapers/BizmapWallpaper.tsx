const BizmapWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Premium multi-layered gradient backdrop - enhanced for both themes */}
      <div className="absolute inset-0 bg-gradient-to-br 
        dark:from-[#0a0f1e] dark:via-[#0f1525] dark:to-[#1a1f35] 
        from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0]" />
      <div className="absolute inset-0 bg-gradient-to-t 
        dark:from-[#050812] dark:via-transparent dark:to-[#141b2e] 
        from-[#ffffff]/60 via-transparent to-[#f8fafc]/80" />
      
      {/* Dynamic radial gradient bursts - theme-aware */}
      <div className="absolute top-0 left-1/4 w-[60rem] h-[60rem] rounded-full 
        bg-gradient-to-br 
        dark:from-[#3b82f6]/30 dark:via-[#8b5cf6]/20 dark:to-transparent 
        from-[#3b82f6]/18 from-[#8b5cf6]/12 to-transparent 
        blur-[140px] animate-[pulse_20s_ease-in-out_infinite] 
        dark:opacity-70 opacity-55" />
      <div className="absolute bottom-0 right-1/4 w-[55rem] h-[55rem] rounded-full 
        bg-gradient-to-tl 
        dark:from-[#ec4899]/28 dark:via-[#06b6d4]/18 dark:to-transparent 
        from-[#ec4899]/15 from-[#06b6d4]/10 to-transparent 
        blur-[130px] animate-[pulse_18s_ease-in-out_infinite] 
        dark:opacity-65 opacity-50" 
        style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-0 w-[50rem] h-[50rem] rounded-full 
        bg-gradient-to-br 
        dark:from-[#8b5cf6]/25 dark:via-[#3b82f6]/15 dark:to-transparent 
        from-[#8b5cf6]/12 from-[#3b82f6]/8 to-transparent 
        blur-[120px] animate-[pulse_22s_ease-in-out_infinite] 
        dark:opacity-60 opacity-45" 
        style={{ animationDelay: '4s' }} />

      {/* Rotating conic gradient spirals - enhanced visibility */}
      <div
        className="absolute inset-0 dark:opacity-70 opacity-50 animate-[spin_42s_linear_infinite]"
        style={{
          backgroundImage:
            'conic-gradient(from 0deg at 30% 30%, rgba(59,130,246,0.28), rgba(139,92,246,0.22), rgba(236,72,153,0.18), transparent 65%), conic-gradient(from 180deg at 70% 70%, rgba(6,182,212,0.25), rgba(59,130,246,0.20), rgba(139,92,246,0.15), transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 dark:opacity-50 opacity-35 animate-[spin_38s_linear_infinite_reverse]"
        style={{
          backgroundImage:
            'conic-gradient(from 90deg at 50% 50%, rgba(236,72,153,0.20), rgba(6,182,212,0.16), rgba(59,130,246,0.14), transparent 68%)',
          animationDelay: '1s'
        }}
      />

      {/* Large rotating gradient orbs - enhanced for light mode */}
      <div className="absolute -top-40 left-1/6 w-[52rem] h-[52rem] rounded-full 
        bg-gradient-to-br 
        dark:from-[#3b82f6]/32 dark:via-[#8b5cf6]/24 dark:to-[#ec4899]/20 
        from-[#3b82f6]/18 from-[#8b5cf6]/14 to-[#ec4899]/12 
        blur-[120px] animate-[spin_50s_linear_infinite] 
        dark:opacity-72 opacity-55" />
      <div className="absolute top-1/2 -right-32 w-[46rem] h-[46rem] rounded-full 
        bg-gradient-to-tl 
        dark:from-[#ec4899]/35 dark:via-[#3b82f6]/22 dark:to-[#8b5cf6]/16 
        from-[#ec4899]/20 from-[#3b82f6]/16 to-[#8b5cf6]/12 
        blur-[110px] animate-[spin_44s_linear_infinite_reverse] 
        dark:opacity-68 opacity-52" />
      <div className="absolute bottom-20 left-1/5 w-[44rem] h-[44rem] rounded-full 
        bg-gradient-to-tr 
        dark:from-[#8b5cf6]/30 dark:via-[#06b6d4]/22 dark:to-[#3b82f6]/18 
        from-[#8b5cf6]/16 from-[#06b6d4]/12 to-[#3b82f6]/10 
        blur-[115px] animate-[spin_48s_linear_infinite] 
        dark:opacity-65 opacity-50" />
      <div className="absolute top-1/3 right-1/4 w-[40rem] h-[40rem] rounded-full 
        bg-gradient-to-bl 
        dark:from-[#06b6d4]/22 dark:via-[#3b82f6]/16 dark:to-[#8b5cf6]/12 
        from-[#06b6d4]/12 from-[#3b82f6]/8 to-[#8b5cf6]/6 
        blur-[100px] animate-[spin_40s_linear_infinite_reverse] 
        dark:opacity-55 opacity-42" />
      <div className="absolute -bottom-24 right-1/3 w-[42rem] h-[42rem] rounded-full 
        bg-gradient-to-tl 
        dark:from-[#ec4899]/28 dark:via-[#06b6d4]/18 dark:to-[#3b82f6]/14 
        from-[#ec4899]/14 from-[#06b6d4]/10 to-[#3b82f6]/8 
        blur-[105px] animate-[spin_46s_linear_infinite] 
        dark:opacity-60 opacity-48" />

      {/* Enhanced mesh pattern with better visibility */}
      <div
        className="absolute inset-0 dark:opacity-[0.18] opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--primary) / 0.28) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--primary) / 0.28) 1px, transparent 1px),
            linear-gradient(45deg, hsl(var(--primary) / 0.20) 1px, transparent 1px),
            linear-gradient(-45deg, hsl(var(--primary) / 0.18) 1px, transparent 1px)
          `,
          backgroundSize: '140px 140px, 140px 140px, 200px 200px, 220px 220px',
          animation: 'pulse 14s ease-in-out infinite'
        }}
      />

      {/* Floating geometric shapes - enhanced visibility */}
      {[
        { top: '12%', left: '18%', width: '20rem', height: '20rem', rotation: '-8deg', delay: '0s', shape: 'circle' },
        { top: '38%', left: '72%', width: '18rem', height: '18rem', rotation: '7deg', delay: '1.4s', shape: 'square' },
        { top: '58%', left: '25%', width: '17rem', height: '17rem', rotation: '4deg', delay: '2.8s', shape: 'circle' },
        { top: '20%', left: '55%', width: '16rem', height: '16rem', rotation: '-5deg', delay: '4.2s', shape: 'square' },
        { top: '68%', left: '65%', width: '15rem', height: '15rem', rotation: '6deg', delay: '5.6s', shape: 'circle' }
      ].map((item, index) => (
        <div
          key={`bizmap-shape-${index}`}
          className={`absolute rounded-3xl border 
            dark:border-primary/30 border-primary/25 
            bg-gradient-to-br 
            dark:from-white/10 dark:via-white/6 dark:to-transparent 
            from-foreground/8 from-foreground/5 to-transparent 
            backdrop-blur-xl 
            dark:shadow-[0_0_60px_rgba(59,130,246,0.15),0_0_100px_rgba(139,92,246,0.10)] 
            shadow-[0_0_50px_hsl(var(--primary)/0.12)]`}
          style={{
            top: item.top,
            left: item.left,
            width: item.width,
            height: item.height,
            borderRadius: item.shape === 'circle' ? '50%' : '2rem',
            transform: `rotate(${item.rotation})`,
            animation: 'float 14s ease-in-out infinite',
            animationDelay: item.delay
          }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br 
            dark:from-primary/15 dark:via-primary/10 dark:to-transparent 
            from-primary/10 from-primary/6 to-transparent 
            ${item.shape === 'circle' ? 'rounded-full' : 'rounded-3xl'}`} />
          <div className={`absolute inset-0 bg-gradient-to-tr 
            from-transparent dark:via-white/6 via-foreground/6 to-transparent 
            ${item.shape === 'circle' ? 'rounded-full' : 'rounded-3xl'}`} />
          <div className="absolute top-6 left-6 w-12 h-12 rounded-full 
            dark:bg-primary/30 bg-primary/20 blur-md" />
          <div className="absolute bottom-6 right-6 h-5 w-5 rounded-full 
            dark:bg-primary/40 bg-primary/25" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-1 
            dark:bg-gradient-to-r dark:from-primary/25 dark:via-primary/20 dark:to-transparent 
            bg-gradient-to-r from-primary/15 via-primary/12 to-transparent 
            rounded-full blur-sm" />
        </div>
      ))}

      {/* Rotating interconnected rings - enhanced */}
      <div className="absolute -top-20 right-1/3 w-[36rem] h-[36rem] 
        border-2 dark:border-primary/30 border-primary/20 
        rounded-full blur-[3px] animate-[spin_36s_linear_infinite] 
        dark:shadow-[0_0_70px_rgba(59,130,246,0.12)] 
        shadow-[0_0_50px_hsl(var(--primary)/0.10)]" />
      <div className="absolute bottom-[-6rem] left-1/4 w-[34rem] h-[34rem] 
        border-2 dark:border-primary/28 border-primary/18 
        rounded-full blur-[3px] animate-[spin_32s_linear_infinite_reverse] 
        dark:shadow-[0_0_60px_rgba(6,182,212,0.10)] 
        shadow-[0_0_45px_hsl(var(--primary)/0.08)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
        w-[40rem] h-[40rem] 
        border dark:border-primary/25 border-primary/15 
        rounded-full blur-[2px] animate-[spin_40s_linear_infinite] 
        dark:opacity-65 opacity-45" />

      {/* Enhanced glowing connection nodes */}
      {[
        { top: '18%', left: '22%', size: 18 },
        { top: '34%', left: '74%', size: 20 },
        { top: '54%', left: '20%', size: 17 },
        { top: '66%', left: '62%', size: 19 },
        { top: '30%', left: '50%', size: 21 },
        { top: '74%', left: '35%', size: 18 },
        { top: '42%', left: '45%', size: 16 }
      ].map((node, index) => (
        <div key={`bizmap-node-${index}`} style={{ top: node.top, left: node.left }}>
          <div
            className="absolute rounded-full 
              dark:bg-primary/50 bg-primary/30 
              blur-md"
            style={{
              width: `${node.size * 2.5}px`,
              height: `${node.size * 2.5}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'pulse 3.5s ease-in-out infinite',
              animationDelay: `${index * 0.4}s`
            }}
          />
          <div
            className="absolute rounded-full 
              dark:bg-primary/70 bg-primary/45"
            style={{
              width: `${node.size}px`,
              height: `${node.size}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 25px rgba(59,130,246,0.5), 0 0 50px rgba(139,92,246,0.4)'
            }}
          />
        </div>
      ))}

      {/* Flowing energy streams - new element */}
      <div className="absolute top-1/4 w-full h-40 
        bg-gradient-to-r 
        dark:from-transparent dark:via-primary/15 dark:to-transparent
        from-transparent via-primary/10 to-transparent
        blur-2xl opacity-60"
        style={{
          animation: 'pulse 8s ease-in-out infinite',
          animationDelay: '0s'
        }} />
      <div className="absolute top-2/3 w-full h-36 
        bg-gradient-to-r 
        dark:from-transparent dark:via-primary/12 dark:to-transparent
        from-transparent via-primary/8 to-transparent
        blur-2xl opacity-55"
        style={{
          animation: 'pulse 10s ease-in-out infinite',
          animationDelay: '2s'
        }} />

      {/* Soft overlay for text readability - balanced for both themes */}
      <div className="absolute inset-0 
        bg-gradient-to-b 
        dark:from-background/55 dark:via-background/30 dark:to-background/70 
        from-background/80 from-background/85 to-background/82" />
    </div>
  );
};

export default BizmapWallpaper;
