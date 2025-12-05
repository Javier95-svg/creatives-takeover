const StoriesContentWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Base gradient backdrop - theme-aware, more subtle than hero */}
      <div className="absolute inset-0 bg-gradient-to-b 
        dark:from-[#0f1525] dark:via-[#141b2e] dark:to-[#0a0f1e] 
        from-background via-muted/20 to-background" />
      
      {/* Secondary gradient layer for depth - theme-aware */}
      <div className="absolute inset-0 bg-gradient-to-t 
        dark:from-[#0a0f1e] dark:via-transparent dark:to-[#141b2e] 
        from-background/85 via-transparent to-background/70" />

      {/* Subtle rotating conic gradients - slower and more subtle than hero */}
      <div
        className="absolute inset-0 dark:opacity-30 opacity-15 animate-[spin_60s_linear_infinite]"
        style={{
          backgroundImage:
            'conic-gradient(from 0deg at 20% 30%, hsl(var(--blue-primary) / 0.12), hsl(var(--red-primary) / 0.08), hsl(var(--green-primary) / 0.10), transparent 75%), conic-gradient(from 180deg at 80% 70%, hsl(var(--green-primary) / 0.12), hsl(var(--blue-primary) / 0.08), hsl(var(--red-primary) / 0.10), transparent 75%)',
        }}
      />

      {/* Grid-based pattern - distinct from hero's flowing ribbons */}
      <svg className="absolute inset-0 w-full h-full dark:opacity-20 opacity-10" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <pattern id="content-grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="40" cy="40" r="1" fill="hsl(var(--primary))" opacity="0.3">
              <animate attributeName="opacity" values="0.1;0.4;0.1" dur="4s" repeatCount="indefinite" />
            </circle>
          </pattern>
          <linearGradient id="grid-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Subtle grid lines */}
        {Array.from({ length: 20 }).map((_, i) => (
          <line
            key={`grid-h-${i}`}
            x1="0"
            y1={i * 45}
            x2="1440"
            y2={i * 45}
            stroke="url(#grid-line)"
            strokeWidth="0.5"
            opacity="0.2"
          >
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${3 + i * 0.2}s`} repeatCount="indefinite" />
          </line>
        ))}
        {Array.from({ length: 25 }).map((_, i) => (
          <line
            key={`grid-v-${i}`}
            x1={i * 57.6}
            y1="0"
            x2={i * 57.6}
            y2="900"
            stroke="url(#grid-line)"
            strokeWidth="0.5"
            opacity="0.2"
          >
            <animate attributeName="opacity" values="0.1;0.3;0.1" dur={`${4 + i * 0.15}s`} repeatCount="indefinite" />
          </line>
        ))}
      </svg>

      {/* Floating geometric particles - distinct from hero's typography elements */}
      {[
        { top: '10%', left: '8%', size: 3, delay: '0s', color: 'blue', shape: 'circle' },
        { top: '15%', left: '45%', size: 4, delay: '1s', color: 'red', shape: 'square' },
        { top: '25%', left: '78%', size: 2.5, delay: '2s', color: 'green', shape: 'circle' },
        { top: '35%', left: '15%', size: 3.5, delay: '3s', color: 'blue', shape: 'square' },
        { top: '45%', left: '65%', size: 2, delay: '4s', color: 'red', shape: 'circle' },
        { top: '55%', left: '25%', size: 4, delay: '5s', color: 'green', shape: 'square' },
        { top: '65%', left: '85%', size: 3, delay: '6s', color: 'blue', shape: 'circle' },
        { top: '75%', left: '35%', size: 2.5, delay: '7s', color: 'red', shape: 'square' },
        { top: '85%', left: '55%', size: 3.5, delay: '8s', color: 'green', shape: 'circle' },
        { top: '20%', left: '92%', size: 2, delay: '9s', color: 'blue', shape: 'square' },
        { top: '30%', left: '5%', size: 4, delay: '10s', color: 'red', shape: 'circle' },
        { top: '50%', left: '95%', size: 3, delay: '11s', color: 'green', shape: 'square' },
        { top: '70%', left: '12%', size: 2.5, delay: '12s', color: 'blue', shape: 'circle' },
        { top: '80%', left: '72%', size: 3.5, delay: '13s', color: 'red', shape: 'square' },
        { top: '90%', left: '42%', size: 2, delay: '14s', color: 'green', shape: 'circle' },
      ].map((element, index) => {
        const colorClasses = {
          blue: 'dark:bg-cyan-400/30 bg-primary/25 dark:shadow-[0_0_8px_rgba(59,130,246,0.3)] shadow-[0_0_6px_hsl(var(--primary)/0.25)]',
          red: 'dark:bg-red-400/30 bg-[#ef4444]/25 dark:shadow-[0_0_8px_rgba(239,68,68,0.3)] shadow-[0_0_6px_rgba(239,68,68,0.25)]',
          green: 'dark:bg-emerald-400/30 bg-[#10b981]/25 dark:shadow-[0_0_8px_rgba(16,185,129,0.3)] shadow-[0_0_6px_rgba(16,185,129,0.25)]',
        };
        
        const shapeClass = element.shape === 'circle' ? 'rounded-full' : 'rounded-sm rotate-45';
        
        return (
          <div
            key={`content-particle-${index}`}
            className={`absolute ${shapeClass} ${colorClasses[element.color as keyof typeof colorClasses]}`}
            style={{
              top: element.top,
              left: element.left,
              width: `${element.size}px`,
              height: `${element.size}px`,
              animation: 'content-float 20s ease-in-out infinite',
              animationDelay: element.delay,
            }}
          />
        );
      })}

      {/* Subtle wave patterns - different from hero's arcs */}
      <svg className="absolute inset-0 w-full h-full dark:opacity-15 opacity-8" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="wave-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--blue-primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--blue-primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--blue-primary))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wave-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--red-primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--red-primary))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--red-primary))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="wave-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--green-primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--green-primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--green-primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Gentle wave patterns */}
        <path 
          d="M 0 300 Q 360 250 720 300 T 1440 300" 
          fill="none" 
          stroke="url(#wave-blue)" 
          strokeWidth="1.5" 
          strokeLinecap="round"
          opacity="0.4"
          style={{
            animation: 'content-wave 25s ease-in-out infinite',
          }}
        />
        
        <path 
          d="M 0 600 Q 360 550 720 600 T 1440 600" 
          fill="none" 
          stroke="url(#wave-red)" 
          strokeWidth="1.5" 
          strokeLinecap="round"
          opacity="0.35"
          style={{
            animation: 'content-wave 28s ease-in-out infinite',
            animationDelay: '5s',
          }}
        />
        
        <path 
          d="M 0 450 Q 360 400 720 450 T 1440 450" 
          fill="none" 
          stroke="url(#wave-green)" 
          strokeWidth="1.5" 
          strokeLinecap="round"
          opacity="0.4"
          style={{
            animation: 'content-wave 30s ease-in-out infinite',
            animationDelay: '10s',
          }}
        />
      </svg>

      {/* Subtle gradient orbs - smaller and more dispersed than hero */}
      <div 
        className="absolute top-1/4 left-1/6 w-[35rem] h-[35rem] rounded-full 
          bg-gradient-to-br 
          dark:from-[#3b82f6]/15 dark:via-[#2563eb]/8 dark:to-transparent
          from-primary/5 via-primary/3 to-transparent
          blur-[100px] 
          dark:opacity-50 opacity-25"
        style={{
          animation: 'spin 55s linear infinite',
        }}
      />
      
      <div 
        className="absolute top-2/3 right-1/5 w-[32rem] h-[32rem] rounded-full
          bg-gradient-to-bl
          dark:from-[#ef4444]/12 dark:via-[#dc2626]/7 dark:to-transparent
          from-[#ef4444]/4 via-[#dc2626]/2 to-transparent
          blur-[90px]
          dark:opacity-45 opacity-20"
        style={{
          animation: 'spin 50s linear infinite reverse',
        }}
      />
      
      <div 
        className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] rounded-full
          bg-gradient-to-t
          dark:from-[#10b981]/14 dark:via-[#059669]/8 dark:to-transparent
          from-[#10b981]/5 via-[#059669]/3 to-transparent
          blur-[85px]
          dark:opacity-48 opacity-22"
        style={{
          animation: 'spin 52s linear infinite',
        }}
      />

      {/* Subtle RGB gradient mesh overlay - theme-aware, more subtle */}
      <div
        className="absolute inset-0 
          dark:opacity-25 opacity-12"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 25%, hsl(var(--blue-primary) / 0.08) 0%, transparent 50%), radial-gradient(circle at 85% 60%, hsl(var(--red-primary) / 0.06) 0%, transparent 50%), radial-gradient(circle at 50% 85%, hsl(var(--green-primary) / 0.08) 0%, transparent 50%)',
        }}
      />

      {/* Stronger readability overlay - ensures story cards are always readable */}
      <div className="absolute inset-0 
        dark:from-background/85 dark:via-background/70 dark:to-background/85 
        from-background/95 via-background/98 to-background/95 
        bg-gradient-to-b" />
    </div>
  );
};

export default StoriesContentWallpaper;

