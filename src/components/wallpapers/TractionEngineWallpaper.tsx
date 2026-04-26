const TractionEngineWallpaper = () => {
  const nodes = [
    { cx: 180, cy: 620 },
    { cx: 380, cy: 540 },
    { cx: 580, cy: 470 },
    { cx: 760, cy: 400 },
    { cx: 960, cy: 340 },
    { cx: 1160, cy: 290 },
    { cx: 1340, cy: 240 },
  ];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      {/* Directional momentum gradient — warm green tint rising from bottom-left */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 55% at 8% 88%, rgba(16,185,129,0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 92% 12%, rgba(6,182,212,0.14), transparent 58%), radial-gradient(ellipse 40% 35% at 50% 50%, rgba(16,185,129,0.07), transparent 55%)',
        }}
      />

      {/* Subtle grid — slightly tighter than GTM to feel more data-dense */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--border) / 0.8) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.8) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }}
      />

      {/* Ascending trend line + area fill */}
      <svg
        className="absolute inset-0 h-full w-full dark:opacity-40 opacity-30"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="te-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(16,185,129,0)" />
            <stop offset="30%" stopColor="rgba(16,185,129,0.7)" />
            <stop offset="70%" stopColor="rgba(6,182,212,0.65)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0)" />
          </linearGradient>
          <linearGradient id="te-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(16,185,129,0.18)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </linearGradient>
          <filter id="te-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Area fill under the main trend curve */}
        <path
          d="M100 720 C250 680 380 580 580 490 C760 410 940 350 1140 290 C1280 250 1380 230 1440 220 L1440 900 L100 900 Z"
          fill="url(#te-area-grad)"
        />

        {/* Primary ascending trend line */}
        <path
          d="M100 720 C250 680 380 580 580 490 C760 410 940 350 1140 290 C1280 250 1380 230 1440 220"
          fill="none"
          stroke="url(#te-line-grad)"
          strokeWidth="2.5"
          filter="url(#te-glow)"
        />

        {/* Secondary momentum line — slightly lagged, adds depth */}
        <path
          d="M100 800 C280 760 440 680 640 600 C820 530 1020 460 1240 400 C1340 370 1400 355 1440 345"
          fill="none"
          stroke="rgba(6,182,212,0.25)"
          strokeWidth="1.5"
          strokeDasharray="8 16"
        />

        {/* Pulsing data nodes along the main trend */}
        {nodes.map((node, i) => (
          <g key={i} filter="url(#te-glow)">
            <circle
              cx={node.cx}
              cy={node.cy}
              r="5"
              fill="rgba(16,185,129,0.85)"
              style={{
                animation: 'pulse 2.6s ease-in-out infinite',
                animationDelay: `${i * 0.38}s`,
              }}
            />
            <circle
              cx={node.cx}
              cy={node.cy}
              r="10"
              fill="none"
              stroke="rgba(16,185,129,0.3)"
              strokeWidth="1"
              style={{
                animation: 'pulse 2.6s ease-in-out infinite',
                animationDelay: `${i * 0.38}s`,
              }}
            />
          </g>
        ))}

        {/* Scatter of small upward-momentum particles above the trend */}
        {[
          { cx: 820, cy: 200 }, { cx: 940, cy: 160 }, { cx: 1060, cy: 195 },
          { cx: 1180, cy: 150 }, { cx: 1080, cy: 120 }, { cx: 700, cy: 230 },
          { cx: 1260, cy: 180 }, { cx: 1360, cy: 130 },
        ].map((p, i) => (
          <circle
            key={`scatter-${i}`}
            cx={p.cx}
            cy={p.cy}
            r="2"
            fill="rgba(6,182,212,0.45)"
            style={{
              animation: 'pulse 3.2s ease-in-out infinite',
              animationDelay: `${i * 0.25}s`,
            }}
          />
        ))}
      </svg>

      {/* Soft diagonal light streak — upward-right direction */}
      <div
        className="absolute inset-x-[-15%] top-[35%] h-[28rem] bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent blur-3xl dark:via-emerald-400/8"
        style={{ transform: 'rotate(-22deg)' }}
      />

      {/* Readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background/75" />
    </div>
  );
};

export default TractionEngineWallpaper;
