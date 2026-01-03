/**
 * AnimatedBackground Component
 * Creates a layered, ambient background animation for the Hero section
 * Features: pulsing grid, drifting gradient orbs, animated scanlines
 */

export const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Layer 1: Subtle grid that pulses */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full animate-grid-pulse">
          <defs>
            <pattern
              id="hero-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-primary"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
      </div>

      {/* Layer 2: Gradient orbs that drift */}
      <div className="absolute inset-0">
        {/* Blue orb - Slow drift */}
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-drift-slow"
          style={{
            background: 'radial-gradient(circle, hsl(217 70% 60% / 0.15), transparent 70%)'
          }}
        />

        {/* Green orb - Medium drift */}
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl animate-drift-medium"
          style={{
            background: 'radial-gradient(circle, hsl(142 70% 40% / 0.12), transparent 70%)'
          }}
        />

        {/* Red orb - Fast drift */}
        <div
          className="absolute top-1/2 right-1/3 w-72 h-72 rounded-full blur-3xl animate-drift-fast"
          style={{
            background: 'radial-gradient(circle, hsl(0 75% 60% / 0.10), transparent 70%)'
          }}
        />
      </div>

      {/* Layer 3: Animated scanlines for tech feel */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0 h-32 animate-scan"
          style={{
            background: 'linear-gradient(to bottom, transparent, hsl(var(--primary)) 50%, transparent)'
          }}
        />
      </div>

      {/* Layer 4: Noise texture overlay (subtle) */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px'
        }}
      />
    </div>
  );
};
