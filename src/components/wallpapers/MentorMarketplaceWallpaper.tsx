const MentorMarketplaceWallpaper = () => {
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

      {/* Rotating mentorship connection rings - represents knowledge sharing */}
      <div
        className="absolute inset-0 dark:opacity-40 opacity-20 animate-[spin_50s_linear_infinite]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 40%, hsl(var(--blue-primary) / 0.15) 0%, transparent 40%), radial-gradient(circle at 70% 60%, hsl(var(--green-primary) / 0.12) 0%, transparent 45%), radial-gradient(circle at 50% 80%, hsl(var(--blue-primary) / 0.1) 0%, transparent 35%)',
        }}
      />

      {/* Flowing guidance streams - representing knowledge flow from mentors to founders */}
      {/* Primary guidance stream - Blue */}
      <div 
        className="absolute top-1/5 left-0 w-full h-40
          bg-gradient-to-r 
          dark:from-transparent dark:via-[#3b82f6]/25 dark:to-transparent
          from-transparent via-primary/10 to-transparent
          blur-2xl
          opacity-60"
        style={{
          animation: 'mentor-guidance-flow 30s ease-in-out infinite',
          animationDelay: '0s',
        }}
      />
      
      {/* Secondary guidance stream - Green (growth) */}
      <div 
        className="absolute top-2/3 left-0 w-full h-36
          bg-gradient-to-r 
          dark:from-transparent dark:via-[#10b981]/20 dark:to-transparent
          from-transparent via-[#10b981]/8 to-transparent
          blur-2xl
          opacity-55"
        style={{
          animation: 'mentor-guidance-flow 35s ease-in-out infinite',
          animationDelay: '8s',
        }}
      />

      {/* Vertical guidance pillars */}
      <div 
        className="absolute left-1/4 top-0 h-full w-40
          bg-gradient-to-b 
          dark:from-transparent dark:via-[#3b82f6]/18 dark:to-transparent
          from-transparent via-primary/7 to-transparent
          blur-3xl
          opacity-50"
        style={{
          animation: 'mentor-guidance-pillar 40s ease-in-out infinite reverse',
          animationDelay: '12s',
        }}
      />
      
      <div 
        className="absolute right-1/3 top-0 h-full w-32
          bg-gradient-to-b 
          dark:from-transparent dark:via-[#10b981]/16 dark:to-transparent
          from-transparent via-[#10b981]/6 to-transparent
          blur-3xl
          opacity-45"
        style={{
          animation: 'mentor-guidance-pillar 38s ease-in-out infinite reverse',
          animationDelay: '18s',
        }}
      />

      {/* Animated Connection Network - SVG paths representing mentor-founder connections */}
      <svg className="absolute inset-0 w-full h-full dark:opacity-30 opacity-15" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          {/* Mentor-Founder connection gradient */}
          <linearGradient id="mentor-connection-primary" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--blue-primary))" stopOpacity="0" />
            <stop offset="30%" stopColor="hsl(var(--blue-primary))" stopOpacity="0.6" />
            <stop offset="70%" stopColor="hsl(var(--blue-primary))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--blue-primary))" stopOpacity="0" />
          </linearGradient>
          
          {/* Growth path gradient */}
          <linearGradient id="growth-path" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--green-primary))" stopOpacity="0" />
            <stop offset="30%" stopColor="hsl(var(--green-primary))" stopOpacity="0.5" />
            <stop offset="70%" stopColor="hsl(var(--green-primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--green-primary))" stopOpacity="0" />
          </linearGradient>

          {/* Animated gradient for flowing effect */}
          <linearGradient id="connection-flow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--blue-primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--blue-primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--blue-primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Primary mentor-founder connection path */}
        <path 
          d="M 200 200 Q 400 150 600 250 Q 800 350 1000 300 T 1300 350" 
          fill="none" 
          stroke="url(#mentor-connection-primary)" 
          strokeWidth="2.5" 
          strokeLinecap="round"
          strokeDasharray="25 35"
          style={{
            animation: 'mentor-connection-pulse 20s ease-in-out infinite',
          }}
        />
        
        {/* Growth progression path - from idea to funding */}
        <path 
          d="M 0 600 Q 300 450 600 500 Q 900 550 1200 480 Q 1440 420 1440 400" 
          fill="none" 
          stroke="url(#growth-path)" 
          strokeWidth="2.2" 
          strokeLinecap="round"
          strokeDasharray="20 30"
          style={{
            animation: 'mentor-connection-pulse 24s ease-in-out infinite',
            animationDelay: '4s',
          }}
        />
        
        {/* Secondary connection path */}
        <path 
          d="M 150 450 Q 350 350 550 400 Q 750 450 950 380 Q 1150 310 1350 360" 
          fill="none" 
          stroke="url(#mentor-connection-primary)" 
          strokeWidth="1.8" 
          strokeLinecap="round"
          strokeDasharray="15 25"
          opacity="0.6"
          style={{
            animation: 'mentor-connection-pulse 22s ease-in-out infinite',
            animationDelay: '8s',
          }}
        />
        
        {/* Knowledge flow path */}
        <path 
          d="M 0 350 Q 480 250 960 300 Q 1200 320 1440 280" 
          fill="none" 
          stroke="url(#connection-flow)" 
          strokeWidth="2" 
          strokeLinecap="round"
          strokeDasharray="18 28"
          opacity="0.7"
          style={{
            animation: 'mentor-connection-pulse 26s ease-in-out infinite',
            animationDelay: '12s',
          }}
        />
      </svg>

      {/* Floating Mentor & Founder Nodes - representing active connections */}
      {[
        // Mentor nodes (larger, on top)
        { top: '22%', left: '18%', size: 14, delay: '0s', type: 'mentor', color: 'blue' },
        { top: '35%', left: '52%', size: 16, delay: '1.2s', type: 'mentor', color: 'blue' },
        { top: '28%', left: '78%', size: 13, delay: '2.4s', type: 'mentor', color: 'blue' },
        // Founder nodes (smaller, below)
        { top: '58%', left: '28%', size: 10, delay: '3.6s', type: 'founder', color: 'green' },
        { top: '65%', left: '48%', size: 11, delay: '4.8s', type: 'founder', color: 'green' },
        { top: '72%', left: '68%', size: 10, delay: '6s', type: 'founder', color: 'green' },
        { top: '62%', left: '82%', size: 12, delay: '7.2s', type: 'founder', color: 'green' },
        // Additional connection nodes
        { top: '45%', left: '35%', size: 9, delay: '8.4s', type: 'connection', color: 'blue' },
        { top: '50%', left: '65%', size: 8, delay: '9.6s', type: 'connection', color: 'blue' },
      ].map((node, index) => {
        const colorClasses = {
          mentor: {
            blue: 'dark:bg-cyan-300/60 bg-primary/50 dark:shadow-[0_0_20px_rgba(59,130,246,0.6)] shadow-[0_0_12px_hsl(var(--primary)/0.5)]',
          },
          founder: {
            green: 'dark:bg-emerald-300/50 bg-[#10b981]/40 dark:shadow-[0_0_16px_rgba(16,185,129,0.5)] shadow-[0_0_10px_rgba(16,185,129,0.4)]',
          },
          connection: {
            blue: 'dark:bg-blue-400/40 bg-primary/30 dark:shadow-[0_0_12px_rgba(59,130,246,0.4)] shadow-[0_0_8px_hsl(var(--primary)/0.3)]',
          },
        };
        
        const nodeColor = node.type === 'mentor' 
          ? colorClasses.mentor[node.color as keyof typeof colorClasses.mentor]
          : node.type === 'founder'
          ? colorClasses.founder[node.color as keyof typeof colorClasses.founder]
          : colorClasses.connection[node.color as keyof typeof colorClasses.connection];
        
        return (
          <div
            key={`mentor-node-${index}`}
            className={`absolute rounded-full ${nodeColor}`}
            style={{
              top: node.top,
              left: node.left,
              width: `${node.size}px`,
              height: `${node.size}px`,
              animation: 'mentor-node-pulse 4s ease-in-out infinite',
              animationDelay: node.delay,
            }}
          />
        );
      })}

      {/* Connection lines between mentor and founder nodes */}
      <svg className="absolute inset-0 w-full h-full dark:opacity-20 opacity-10" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="node-connection" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--blue-primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--blue-primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--blue-primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Mentor to founder connections */}
        <line 
          x1="18%" 
          y1="22%" 
          x2="28%" 
          y2="58%" 
          stroke="url(#node-connection)" 
          strokeWidth="1.5" 
          strokeDasharray="6 10"
          opacity="0.4"
          style={{
            animation: 'connection-fade 8s ease-in-out infinite',
          }}
        />
        <line 
          x1="52%" 
          y1="35%" 
          x2="48%" 
          y2="65%" 
          stroke="url(#node-connection)" 
          strokeWidth="1.5" 
          strokeDasharray="6 10"
          opacity="0.4"
          style={{
            animation: 'connection-fade 8s ease-in-out infinite',
            animationDelay: '2s',
          }}
        />
        <line 
          x1="78%" 
          y1="28%" 
          x2="82%" 
          y2="62%" 
          stroke="url(#node-connection)" 
          strokeWidth="1.5" 
          strokeDasharray="6 10"
          opacity="0.4"
          style={{
            animation: 'connection-fade 8s ease-in-out infinite',
            animationDelay: '4s',
          }}
        />
        <line 
          x1="52%" 
          y1="35%" 
          x2="68%" 
          y2="72%" 
          stroke="url(#node-connection)" 
          strokeWidth="1.2" 
          strokeDasharray="5 8"
          opacity="0.35"
          style={{
            animation: 'connection-fade 10s ease-in-out infinite',
            animationDelay: '6s',
          }}
        />
      </svg>

      {/* Animated Growth Orbs - representing progress from idea to funding */}
      {/* Idea stage orb */}
      <div className="absolute -top-32 left-1/5 w-[35rem] h-[35rem] rounded-full 
        bg-gradient-to-br 
        dark:from-[#3b82f6]/20 dark:via-[#2563eb]/12 dark:to-transparent 
        from-primary/8 via-primary/5 to-transparent 
        blur-[100px] 
        dark:opacity-60 opacity-30"
        style={{
          animation: 'mentor-growth-orb 45s ease-in-out infinite',
        }}
      />
      
      {/* Growth stage orb */}
      <div className="absolute top-1/2 -right-32 w-[32rem] h-[32rem] rounded-full 
        bg-gradient-to-bl 
        dark:from-[#10b981]/22 dark:via-[#059669]/14 dark:to-transparent 
        from-[#10b981]/9 via-[#059669]/6 to-transparent 
        blur-[90px] 
        dark:opacity-65 opacity-28"
        style={{
          animation: 'mentor-growth-orb 42s ease-in-out infinite reverse',
          animationDelay: '10s',
        }}
      />
      
      {/* Funding stage orb */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[38rem] h-[38rem] rounded-full 
        bg-gradient-to-t 
        dark:from-[#3b82f6]/25 dark:via-[#10b981]/18 dark:to-transparent 
        from-primary/10 via-[#10b981]/8 to-transparent 
        blur-[110px] 
        dark:opacity-70 opacity-32"
        style={{
          animation: 'mentor-growth-orb 48s ease-in-out infinite',
          animationDelay: '20s',
        }}
      />

      {/* Subtle RGB gradient mesh overlay - theme-aware */}
      <div
        className="absolute inset-0 
          dark:opacity-30 opacity-12"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 35%, hsl(var(--blue-primary) / 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 55%, hsl(var(--green-primary) / 0.08) 0%, transparent 50%), radial-gradient(circle at 50% 75%, hsl(var(--blue-primary) / 0.1) 0%, transparent 50%)',
        }}
      />

      {/* Readability overlay - ensures content is always readable */}
      <div className="absolute inset-0 
        dark:from-background/80 dark:via-background/55 dark:to-background/75 
        from-background/94 via-background/97 to-background/94 
        bg-gradient-to-b" />
    </div>
  );
};

export default MentorMarketplaceWallpaper;