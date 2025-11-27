const PricingWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Premium multi-layered gradient backdrop - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-br dark:from-[#0a0f1e] dark:via-[#0f1525] dark:to-[#1a1f35] from-background via-muted/20 to-background" />
      <div className="absolute inset-0 bg-gradient-to-t dark:from-[#050812] dark:via-transparent dark:to-[#141b2e] from-background/80 via-transparent to-background/60" />
      
      {/* Dynamic conic gradient swirls - theme-aware */}
      <div
        className="absolute inset-0 dark:opacity-65 opacity-35 animate-[spin_38s_linear_infinite]"
        style={{
          backgroundImage:
            'conic-gradient(from 0deg at 35% 35%, rgba(59,130,246,0.22), rgba(139,92,246,0.18), rgba(16,185,129,0.15), transparent 68%), conic-gradient(from 180deg at 65% 65%, rgba(6,182,212,0.20), rgba(59,130,246,0.16), rgba(139,92,246,0.12), transparent 72%)',
        }}
      />

      {/* Large rotating gradient orbs - premium pricing theme */}
      <div className="absolute -top-40 left-1/6 w-[48rem] h-[48rem] rounded-full bg-gradient-to-br dark:from-[#3b82f6]/28 dark:via-[#8b5cf6]/22 dark:to-[#10b981]/18 from-primary/9 via-primary/7 to-primary/5 blur-[115px] animate-[spin_48s_linear_infinite] dark:opacity-68 opacity-38" />
      <div className="absolute top-1/2 -right-32 w-[42rem] h-[42rem] rounded-full bg-gradient-to-tl dark:from-[#10b981]/32 dark:via-[#3b82f6]/20 dark:to-[#8b5cf6]/14 from-primary/8 via-primary/6 to-primary/4 blur-[105px] animate-[spin_40s_linear_infinite_reverse] dark:opacity-62 opacity-32" />
      <div className="absolute bottom-20 left-1/5 w-[40rem] h-[40rem] rounded-full bg-gradient-to-tr dark:from-[#8b5cf6]/26 dark:via-[#06b6d4]/20 dark:to-[#10b981]/16 from-primary/7 via-primary/6 to-primary/4 blur-[110px] animate-[spin_44s_linear_infinite] dark:opacity-58 opacity-28" />
      <div className="absolute top-1/3 right-1/4 w-[36rem] h-[36rem] rounded-full bg-gradient-to-bl dark:from-[#06b6d4]/18 dark:via-[#3b82f6]/14 dark:to-[#8b5cf6]/10 from-primary/5 via-primary/4 to-transparent blur-[95px] animate-[spin_36s_linear_infinite_reverse] dark:opacity-48 opacity-22" />
      <div className="absolute -bottom-24 right-1/3 w-[38rem] h-[38rem] rounded-full bg-gradient-to-tl dark:from-[#10b981]/24 dark:via-[#06b6d4]/16 dark:to-[#3b82f6]/12 from-primary/6 via-primary/5 to-primary/3 blur-[100px] animate-[spin_42s_linear_infinite] dark:opacity-54 opacity-26" />

      {/* Sophisticated mesh pattern with multiple layers - theme-aware */}
      <div
        className="absolute inset-0 dark:opacity-[0.14] opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--primary) / 0.22) 1px, transparent 1px),
            linear-gradient(0deg, hsl(var(--primary) / 0.22) 1px, transparent 1px),
            linear-gradient(45deg, hsl(var(--primary) / 0.16) 1px, transparent 1px),
            linear-gradient(-45deg, hsl(var(--primary) / 0.14) 1px, transparent 1px)
          `,
          backgroundSize: '130px 130px, 130px 130px, 190px 190px, 210px 210px',
          animation: 'pulse 12s ease-in-out infinite'
        }}
      />

      {/* Enhanced floating premium cards - theme-aware */}
      {[
        { top: '14%', left: '20%', width: '19rem', height: '12rem', rotation: '-7deg', delay: '0s' },
        { top: '36%', left: '68%', width: '17rem', height: '11rem', rotation: '6deg', delay: '1.2s' },
        { top: '56%', left: '28%', width: '16rem', height: '10rem', rotation: '3deg', delay: '2.4s' },
        { top: '22%', left: '52%', width: '15rem', height: '9rem', rotation: '-4deg', delay: '3.6s' }
      ].map((card, index) => (
        <div
          key={`pricing-card-${index}`}
          className="absolute rounded-3xl border dark:border-emerald-300/25 border-primary/18 bg-gradient-to-br dark:from-white/8 dark:via-white/5 dark:to-transparent from-foreground/5 via-foreground/3 to-transparent backdrop-blur-lg dark:shadow-[0_0_50px_rgba(16,185,129,0.12),0_0_80px_rgba(59,130,246,0.08)] shadow-[0_0_40px_hsl(var(--primary)/0.08)]"
          style={{
            top: card.top,
            left: card.left,
            width: card.width,
            height: card.height,
            transform: `rotate(${card.rotation})`,
            animation: 'float 12s ease-in-out infinite',
            animationDelay: card.delay
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br dark:from-emerald-400/12 dark:via-blue-400/8 from-primary/6 via-primary/4 to-transparent rounded-3xl" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent dark:via-white/5 via-foreground/5 to-transparent rounded-3xl" />
          <div className="absolute top-5 left-5 w-10 h-10 rounded-full dark:bg-emerald-400/25 bg-primary/12 blur-sm" />
          <div className="absolute bottom-5 right-5 h-4 w-4 rounded-full dark:bg-emerald-300/35 bg-primary/18" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-1 dark:bg-gradient-to-r dark:from-emerald-400/20 dark:via-blue-400/20 dark:to-transparent bg-gradient-to-r from-primary/10 via-primary/8 to-transparent rounded-full blur-sm" />
        </div>
      ))}

      {/* Rotating premium currency rings - theme-aware */}
      <div className="absolute -top-24 right-1/3 w-[32rem] h-[32rem] border-2 dark:border-emerald-200/25 border-primary/12 rounded-full blur-[2px] animate-[spin_34s_linear_infinite] dark:shadow-[0_0_60px_rgba(16,185,129,0.1)]" />
      <div className="absolute bottom-[-8rem] left-1/4 w-[30rem] h-[30rem] border-2 dark:border-cyan-200/22 border-primary/10 rounded-full blur-[2px] animate-[spin_30s_linear_infinite_reverse] dark:shadow-[0_0_50px_rgba(6,182,212,0.08)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] border dark:border-purple-300/18 border-primary/8 rounded-full blur-[1px] animate-[spin_38s_linear_infinite] dark:opacity-60 opacity-30" />

      {/* Glowing connection nodes - theme-aware */}
      {[
        { top: '20%', left: '24%', size: 16 },
        { top: '32%', left: '70%', size: 18 },
        { top: '52%', left: '22%', size: 15 },
        { top: '64%', left: '60%', size: 17 },
        { top: '28%', left: '48%', size: 19 },
        { top: '72%', left: '32%', size: 16 }
      ].map((node, index) => (
        <div key={`pricing-node-${index}`} style={{ top: node.top, left: node.left }}>
          <div
            className="absolute rounded-full dark:bg-emerald-400/40 bg-primary/20 blur-sm"
            style={{
              width: `${node.size * 2}px`,
              height: `${node.size * 2}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'pulse 3s ease-in-out infinite',
              animationDelay: `${index * 0.5}s`
            }}
          />
          <div
            className="absolute rounded-full dark:bg-emerald-300/60 bg-primary/30"
            style={{
              width: `${node.size}px`,
              height: `${node.size}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 20px rgba(59,130,246,0.4), 0 0 40px rgba(16,185,129,0.3)'
            }}
          />
        </div>
      ))}

      {/* Soft overlay for text readability - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-b dark:from-background/75 dark:via-background/45 dark:to-background/88 from-background/92 via-background/96 to-background/92" />
    </div>
  );
};

export default PricingWallpaper;

