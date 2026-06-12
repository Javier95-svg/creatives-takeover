const ProfileWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Base gradient backdrop - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-br 
        dark:from-[#0a0f1e] dark:via-[#0f1525] dark:to-[#141b2e] 
        from-background via-muted/30 to-background" />
      
      {/* Secondary gradient layer for depth - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-t 
        dark:from-[#050812] dark:via-transparent dark:to-[#1a1f35] 
        from-background/80 via-transparent to-background/60" />

      {/* RGB-themed gradient orbs - consistent across all profiles */}
      {/* Blue orb - top left */}
      <div className="absolute -top-32 left-1/4 w-[40rem] h-[40rem] rounded-full 
        bg-gradient-to-br 
        dark:from-[#3b82f6]/25 dark:via-[#2563eb]/15 dark:to-transparent 
        from-primary/8 via-primary/5 to-transparent 
        blur-[100px] animate-[spin_45s_linear_infinite] 
        dark:opacity-60 opacity-30" />
      
      {/* Red orb - top right */}
      <div className="absolute -top-24 right-1/4 w-[36rem] h-[36rem] rounded-full 
        bg-gradient-to-bl 
        dark:from-[#ef4444]/20 dark:via-[#dc2626]/12 dark:to-transparent 
        from-[#ef4444]/6 via-[#dc2626]/4 to-transparent 
        blur-[90px] animate-[spin_38s_linear_infinite_reverse] 
        dark:opacity-55 opacity-25" />
      
      {/* Green orb - bottom center */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[44rem] h-[44rem] rounded-full 
        bg-gradient-to-t 
        dark:from-[#10b981]/22 dark:via-[#059669]/14 dark:to-transparent 
        from-[#10b981]/7 via-[#059669]/5 to-transparent 
        blur-[110px] animate-[spin_42s_linear_infinite] 
        dark:opacity-58 opacity-28" />

      {/* Subtle RGB gradient mesh overlay - theme-aware */}
      <div
        className="absolute inset-0 
        dark:opacity-40 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(239,68,68,0.12) 0%, transparent 50%), radial-gradient(circle at 50% 80%, rgba(16,185,129,0.14) 0%, transparent 50%)',
        }}
      />

      {/* Animated connection lines - subtle network pattern */}
      <svg className="absolute inset-0 w-full h-full dark:opacity-15 opacity-8" viewBox="0 0 1440 900">
        <defs>
          <linearGradient id="profile-connector-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(59,130,246,0)" />
            <stop offset="50%" stopColor="rgba(59,130,246,0.3)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </linearGradient>
          <linearGradient id="profile-connector-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(239,68,68,0)" />
            <stop offset="50%" stopColor="rgba(239,68,68,0.25)" />
            <stop offset="100%" stopColor="rgba(239,68,68,0)" />
          </linearGradient>
          <linearGradient id="profile-connector-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(16,185,129,0)" />
            <stop offset="50%" stopColor="rgba(16,185,129,0.28)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </linearGradient>
        </defs>
        {/* Blue connection path */}
        <path 
          d="M200 150 Q400 200 600 180 T1000 220" 
          fill="none" 
          stroke="url(#profile-connector-blue)" 
          strokeWidth="1.2" 
          strokeDasharray="12 18" 
          opacity="0.6"
        />
        {/* Red connection path */}
        <path 
          d="M150 400 Q350 450 550 430 T950 470" 
          fill="none" 
          stroke="url(#profile-connector-red)" 
          strokeWidth="1.1" 
          strokeDasharray="10 16" 
          opacity="0.5"
        />
        {/* Green connection path */}
        <path 
          d="M250 650 Q450 700 650 680 T1050 720" 
          fill="none" 
          stroke="url(#profile-connector-green)" 
          strokeWidth="1.2" 
          strokeDasharray="14 20" 
          opacity="0.55"
        />
      </svg>

      {/* Subtle floating particles - minimal and elegant */}
      {[
        { top: '15%', left: '20%', size: 3, delay: '0s', color: 'blue' },
        { top: '25%', left: '75%', size: 4, delay: '1.5s', color: 'red' },
        { top: '45%', left: '15%', size: 3, delay: '3s', color: 'green' },
        { top: '55%', left: '80%', size: 4, delay: '4.5s', color: 'blue' },
        { top: '70%', left: '30%', size: 3, delay: '6s', color: 'red' },
        { top: '80%', left: '65%', size: 4, delay: '7.5s', color: 'green' },
      ].map((particle, index) => {
        const colorClasses = {
          blue: 'dark:bg-cyan-300/40 bg-primary/30 dark:shadow-[0_0_8px_rgba(59,130,246,0.4)] shadow-[0_0_6px_hsl(var(--primary)/0.3)]',
          red: 'dark:bg-red-300/40 bg-[#ef4444]/30 dark:shadow-glow-danger shadow-[0_0_6px_rgba(239,68,68,0.3)]',
          green: 'dark:bg-emerald-300/40 bg-[#10b981]/30 dark:shadow-glow-success shadow-[0_0_6px_rgba(16,185,129,0.3)]',
        };
        
        return (
          <div
            key={`profile-particle-${index}`}
            className={`absolute rounded-full ${colorClasses[particle.color as keyof typeof colorClasses]}`}
            style={{
              top: particle.top,
              left: particle.left,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animation: 'float 8s ease-in-out infinite',
              animationDelay: particle.delay,
            }}
          />
        );
      })}

      {/* Glowing connection nodes - subtle network visualization */}
      {[
        { top: '20%', left: '25%', color: 'blue' },
        { top: '35%', left: '70%', color: 'red' },
        { top: '50%', left: '20%', color: 'green' },
        { top: '65%', left: '75%', color: 'blue' },
        { top: '75%', left: '45%', color: 'red' },
      ].map((node, index) => {
        const colorClasses = {
          blue: 'dark:bg-cyan-200 bg-primary/60 dark:shadow-glow-info shadow-[0_0_8px_hsl(var(--primary)/0.4)]',
          red: 'dark:bg-red-200 bg-[#ef4444]/60 dark:shadow-[0_0_12px_rgba(239,68,68,0.5)] shadow-glow-danger',
          green: 'dark:bg-emerald-200 bg-[#10b981]/60 dark:shadow-[0_0_12px_rgba(16,185,129,0.5)] shadow-glow-success',
        };
        
        return (
          <div
            key={`profile-node-${index}`}
            className={`absolute rounded-full ${colorClasses[node.color as keyof typeof colorClasses]}`}
            style={{
              top: node.top,
              left: node.left,
              width: '8px',
              height: '8px',
              animation: 'pulse 3s ease-in-out infinite',
              animationDelay: `${index * 0.6}s`
            }}
          />
        );
      })}

      {/* Readability overlay - ensures content is always readable */}
      <div className="absolute inset-0 
        dark:from-background/75 dark:via-background/50 dark:to-background/80 
        from-background/92 via-background/96 to-background/94 
        bg-gradient-to-b" />
    </div>
  );
};

export default ProfileWallpaper;

