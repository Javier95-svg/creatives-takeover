const BizmapWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Base gradient backdrop - matches FAQ section */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      
      {/* Modern Geometric Animated Background - matches FAQ section */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Subtle Mesh Grid */}
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 2px 2px, hsl(var(--primary) / 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px'
          }} />
        </div>

        {/* Animated Gradient Orbs */}
        <div className="absolute top-20 left-[15%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/20 via-accent/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-20 right-[10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-secondary/15 via-primary/8 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-accent/12 to-transparent blur-2xl" style={{ animation: 'spin 20s linear infinite' }} />

        {/* Floating Geometric Shapes */}
        <div className="absolute top-[15%] left-[8%]">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 border-2 border-primary/20 rounded-lg" style={{ 
              animation: 'spin 15s linear infinite',
              transformOrigin: 'center'
            }} />
            <div className="absolute inset-4 border-2 border-accent/15 rounded-lg" style={{ 
              animation: 'spin 12s linear infinite reverse',
              transformOrigin: 'center'
            }} />
            <div className="absolute inset-8 border-2 border-secondary/12 rounded-lg" style={{ 
              animation: 'spin 18s linear infinite',
              transformOrigin: 'center'
            }} />
          </div>
        </div>

        <div className="absolute top-[60%] right-[12%]">
          <div className="relative w-28 h-28">
            <div className="absolute inset-0 rounded-full border-2 border-primary/15" style={{ 
              animation: 'scale-in 6s ease-in-out infinite alternate'
            }} />
            <div className="absolute inset-3 rounded-full border-2 border-accent/12" style={{ 
              animation: 'scale-in 8s ease-in-out infinite alternate',
              animationDelay: '1s'
            }} />
            <div className="absolute inset-6 rounded-full border-2 border-secondary/10" style={{ 
              animation: 'scale-in 7s ease-in-out infinite alternate',
              animationDelay: '2s'
            }} />
          </div>
        </div>

        <div className="absolute bottom-[25%] left-[18%]">
          <div className="relative w-24 h-24" style={{ animation: 'float 12s ease-in-out infinite' }}>
            <div className="absolute inset-0" style={{
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.08))',
              animation: 'spin 20s linear infinite'
            }} />
          </div>
        </div>

        {/* Animated Connection Lines Network */}
        <svg className="absolute inset-0 w-full h-full opacity-20" style={{ pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="bizmapGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.6 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="bizmapGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0 }} />
              <stop offset="50%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.5 }} />
              <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          
          {/* Animated paths */}
          <path d="M 10% 20% Q 30% 40%, 50% 35%" stroke="url(#bizmapGrad1)" strokeWidth="2" fill="none">
            <animate attributeName="d" 
              values="M 10% 20% Q 30% 40%, 50% 35%; M 10% 25% Q 35% 38%, 50% 40%; M 10% 20% Q 30% 40%, 50% 35%"
              dur="15s" repeatCount="indefinite" />
          </path>
          <path d="M 90% 30% Q 70% 50%, 50% 45%" stroke="url(#bizmapGrad2)" strokeWidth="2" fill="none">
            <animate attributeName="d" 
              values="M 90% 30% Q 70% 50%, 50% 45%; M 90% 35% Q 65% 48%, 50% 50%; M 90% 30% Q 70% 50%, 50% 45%"
              dur="18s" repeatCount="indefinite" />
          </path>
          <path d="M 20% 80% Q 40% 60%, 60% 65%" stroke="url(#bizmapGrad1)" strokeWidth="2" fill="none">
            <animate attributeName="d" 
              values="M 20% 80% Q 40% 60%, 60% 65%; M 20% 75% Q 45% 58%, 60% 70%; M 20% 80% Q 40% 60%, 60% 65%"
              dur="20s" repeatCount="indefinite" />
          </path>
          <path d="M 80% 70% Q 60% 60%, 50% 55%" stroke="url(#bizmapGrad2)" strokeWidth="2" fill="none">
            <animate attributeName="d" 
              values="M 80% 70% Q 60% 60%, 50% 55%; M 80% 75% Q 55% 58%, 50% 60%; M 80% 70% Q 60% 60%, 50% 55%"
              dur="16s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>
    </div>
  );
};

export default BizmapWallpaper;
