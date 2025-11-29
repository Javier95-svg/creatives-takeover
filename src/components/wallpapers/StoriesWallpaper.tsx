const StoriesWallpaper = () => {
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

      {/* Rotating conic gradients for depth and movement - theme-aware */}
      <div
        className="absolute inset-0 dark:opacity-50 opacity-25 animate-[spin_45s_linear_infinite]"
        style={{
          backgroundImage:
            'conic-gradient(from 0deg at 25% 25%, hsl(var(--blue-primary) / 0.2), hsl(var(--red-primary) / 0.15), hsl(var(--green-primary) / 0.18), transparent 70%), conic-gradient(from 180deg at 75% 75%, hsl(var(--green-primary) / 0.2), hsl(var(--blue-primary) / 0.15), hsl(var(--red-primary) / 0.18), transparent 70%)',
        }}
      />

      {/* Flowing Narrative Ribbons - Horizontal flowing streams */}
      {/* Blue ribbon */}
      <div 
        className="absolute top-1/4 w-full h-32 
          bg-gradient-to-r 
          dark:from-transparent dark:via-[#3b82f6]/20 dark:to-transparent
          from-transparent via-primary/8 to-transparent
          blur-xl
          opacity-60"
        style={{
          animation: 'story-flow 25s ease-in-out infinite',
          animationDelay: '0s',
        }}
      />
      
      {/* Red ribbon */}
      <div 
        className="absolute top-1/2 w-full h-28
          bg-gradient-to-r 
          dark:from-transparent dark:via-[#ef4444]/18 dark:to-transparent
          from-transparent via-[#ef4444]/7 to-transparent
          blur-xl
          opacity-55"
        style={{
          animation: 'story-flow 30s ease-in-out infinite',
          animationDelay: '5s',
        }}
      />
      
      {/* Green ribbon */}
      <div 
        className="absolute top-3/4 w-full h-36
          bg-gradient-to-r 
          dark:from-transparent dark:via-[#10b981]/22 dark:to-transparent
          from-transparent via-[#10b981]/9 to-transparent
          blur-xl
          opacity-60"
        style={{
          animation: 'story-flow 28s ease-in-out infinite',
          animationDelay: '10s',
        }}
      />

      {/* Vertical flowing ribbons */}
      <div 
        className="absolute left-1/4 top-0 h-full w-32
          bg-gradient-to-b 
          dark:from-transparent dark:via-[#3b82f6]/15 dark:to-transparent
          from-transparent via-primary/6 to-transparent
          blur-2xl
          opacity-50"
        style={{
          animation: 'story-flow 32s ease-in-out infinite reverse',
          animationDelay: '8s',
        }}
      />
      
      <div 
        className="absolute right-1/3 top-0 h-full w-28
          bg-gradient-to-b 
          dark:from-transparent dark:via-[#10b981]/18 dark:to-transparent
          from-transparent via-[#10b981]/7 to-transparent
          blur-2xl
          opacity-50"
        style={{
          animation: 'story-flow 35s ease-in-out infinite reverse',
          animationDelay: '15s',
        }}
      />

      {/* Animated Story Arc Paths - SVG curved paths representing narrative arcs */}
      <svg className="absolute inset-0 w-full h-full dark:opacity-30 opacity-15" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          {/* Blue story arc gradient */}
          <linearGradient id="story-arc-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--blue-primary))" stopOpacity="0" />
            <stop offset="30%" stopColor="hsl(var(--blue-primary))" stopOpacity="0.6" />
            <stop offset="70%" stopColor="hsl(var(--blue-primary))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--blue-primary))" stopOpacity="0" />
          </linearGradient>
          
          {/* Red story arc gradient */}
          <linearGradient id="story-arc-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--red-primary))" stopOpacity="0" />
            <stop offset="30%" stopColor="hsl(var(--red-primary))" stopOpacity="0.5" />
            <stop offset="70%" stopColor="hsl(var(--red-primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--red-primary))" stopOpacity="0" />
          </linearGradient>
          
          {/* Green story arc gradient */}
          <linearGradient id="story-arc-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--green-primary))" stopOpacity="0" />
            <stop offset="30%" stopColor="hsl(var(--green-primary))" stopOpacity="0.5" />
            <stop offset="70%" stopColor="hsl(var(--green-primary))" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(var(--green-primary))" stopOpacity="0" />
          </linearGradient>

          {/* Animated gradient for flowing effect */}
          <linearGradient id="arc-flow-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--blue-primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--blue-primary))" stopOpacity="0.8" />
            <stop offset="100%" stopColor="hsl(var(--blue-primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Rising story arc - Blue */}
        <path 
          d="M 0 400 Q 360 200 720 300 T 1440 250" 
          fill="none" 
          stroke="url(#story-arc-blue)" 
          strokeWidth="2.5" 
          strokeLinecap="round"
          strokeDasharray="20 30"
          style={{
            animation: 'narrative-arc 15s ease-in-out infinite',
          }}
        />
        
        {/* Falling story arc - Red */}
        <path 
          d="M 0 300 Q 360 500 720 400 T 1440 500" 
          fill="none" 
          stroke="url(#story-arc-red)" 
          strokeWidth="2" 
          strokeLinecap="round"
          strokeDasharray="15 25"
          style={{
            animation: 'narrative-arc 18s ease-in-out infinite',
            animationDelay: '3s',
          }}
        />
        
        {/* Complex story arc - Green */}
        <path 
          d="M 0 600 Q 240 450 480 500 Q 720 550 960 480 Q 1200 410 1440 450" 
          fill="none" 
          stroke="url(#story-arc-green)" 
          strokeWidth="2.2" 
          strokeLinecap="round"
          strokeDasharray="18 28"
          style={{
            animation: 'narrative-arc 20s ease-in-out infinite',
            animationDelay: '6s',
          }}
        />
        
        {/* Additional flowing arc */}
        <path 
          d="M 0 200 Q 480 350 960 280 T 1440 350" 
          fill="none" 
          stroke="url(#story-arc-blue)" 
          strokeWidth="1.8" 
          strokeLinecap="round"
          strokeDasharray="12 20"
          opacity="0.5"
          style={{
            animation: 'narrative-arc 22s ease-in-out infinite',
            animationDelay: '9s',
          }}
        />
      </svg>

      {/* Typography-Inspired Elements - Floating letter-like shapes */}
      {[
        { top: '18%', left: '15%', size: 16, delay: '0s', color: 'blue', shape: 'rect' },
        { top: '32%', left: '72%', size: 14, delay: '1.5s', color: 'red', shape: 'circle' },
        { top: '48%', left: '25%', size: 18, delay: '3s', color: 'green', shape: 'rect' },
        { top: '62%', left: '68%', size: 15, delay: '4.5s', color: 'blue', shape: 'circle' },
        { top: '75%', left: '35%', size: 17, delay: '6s', color: 'red', shape: 'rect' },
        { top: '28%', left: '45%', size: 13, delay: '7.5s', color: 'green', shape: 'circle' },
        { top: '55%', left: '58%', size: 16, delay: '9s', color: 'blue', shape: 'rect' },
        { top: '40%', left: '82%', size: 14, delay: '10.5s', color: 'red', shape: 'circle' },
      ].map((element, index) => {
        const colorClasses = {
          blue: 'dark:bg-cyan-300/50 bg-primary/40 dark:shadow-[0_0_12px_rgba(59,130,246,0.5)] shadow-[0_0_8px_hsl(var(--primary)/0.4)]',
          red: 'dark:bg-red-300/50 bg-[#ef4444]/40 dark:shadow-[0_0_12px_rgba(239,68,68,0.5)] shadow-[0_0_8px_rgba(239,68,68,0.4)]',
          green: 'dark:bg-emerald-300/50 bg-[#10b981]/40 dark:shadow-[0_0_12px_rgba(16,185,129,0.5)] shadow-[0_0_8px_rgba(16,185,129,0.4)]',
        };
        
        const shapeClass = element.shape === 'circle' ? 'rounded-full' : 'rounded-sm';
        
        return (
          <div
            key={`story-typography-${index}`}
            className={`absolute ${shapeClass} ${colorClasses[element.color as keyof typeof colorClasses]}`}
            style={{
              top: element.top,
              left: element.left,
              width: `${element.size}px`,
              height: `${element.size}px`,
              animation: 'text-drift 12s ease-in-out infinite',
              animationDelay: element.delay,
            }}
          />
        );
      })}

      {/* Connection lines between typography elements suggesting words/sentences */}
      <svg className="absolute inset-0 w-full h-full dark:opacity-20 opacity-10" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="connection-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Subtle connecting lines */}
        <line 
          x1="15%" 
          y1="18%" 
          x2="45%" 
          y2="28%" 
          stroke="url(#connection-line)" 
          strokeWidth="1" 
          strokeDasharray="4 8"
          opacity="0.3"
        />
        <line 
          x1="72%" 
          y1="32%" 
          x2="82%" 
          y2="40%" 
          stroke="url(#connection-line)" 
          strokeWidth="1" 
          strokeDasharray="4 8"
          opacity="0.3"
        />
        <line 
          x1="25%" 
          y1="48%" 
          x2="35%" 
          y2="75%" 
          stroke="url(#connection-line)" 
          strokeWidth="1" 
          strokeDasharray="4 8"
          opacity="0.3"
        />
        <line 
          x1="58%" 
          y1="55%" 
          x2="68%" 
          y2="62%" 
          stroke="url(#connection-line)" 
          strokeWidth="1" 
          strokeDasharray="4 8"
          opacity="0.3"
        />
      </svg>

      {/* Animated Gradient Streams - RGB colored flowing streams */}
      {/* Blue stream */}
      <div 
        className="absolute -top-40 left-1/5 w-[60rem] h-[20rem] 
          bg-gradient-to-br 
          dark:from-[#3b82f6]/25 dark:via-[#2563eb]/15 dark:to-transparent
          from-primary/10 via-primary/6 to-transparent
          blur-[120px] 
          dark:opacity-70 opacity-35"
        style={{
          animation: 'spin 50s linear infinite',
        }}
      />
      
      {/* Red stream */}
      <div 
        className="absolute top-1/3 -right-32 w-[55rem] h-[18rem]
          bg-gradient-to-bl
          dark:from-[#ef4444]/22 dark:via-[#dc2626]/14 dark:to-transparent
          from-[#ef4444]/8 via-[#dc2626]/5 to-transparent
          blur-[110px]
          dark:opacity-65 opacity-30"
        style={{
          animation: 'spin 45s linear infinite reverse',
        }}
      />
      
      {/* Green stream */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[58rem] h-[22rem]
          bg-gradient-to-t
          dark:from-[#10b981]/24 dark:via-[#059669]/16 dark:to-transparent
          from-[#10b981]/9 via-[#059669]/6 to-transparent
          blur-[125px]
          dark:opacity-68 opacity-32"
        style={{
          animation: 'spin 48s linear infinite',
        }}
      />

      {/* Subtle RGB gradient mesh overlay - theme-aware */}
      <div
        className="absolute inset-0 
          dark:opacity-35 opacity-15"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, hsl(var(--blue-primary) / 0.12) 0%, transparent 50%), radial-gradient(circle at 80% 50%, hsl(var(--red-primary) / 0.10) 0%, transparent 50%), radial-gradient(circle at 50% 80%, hsl(var(--green-primary) / 0.12) 0%, transparent 50%)',
        }}
      />

      {/* Readability overlay - ensures content is always readable */}
      <div className="absolute inset-0 
        dark:from-background/75 dark:via-background/45 dark:to-background/80 
        from-background/92 via-background/96 to-background/92 
        bg-gradient-to-b" />
    </div>
  );
};

export default StoriesWallpaper;
