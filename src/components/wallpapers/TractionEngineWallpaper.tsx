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

      {/* Large emerald bloom rising from bottom-left */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 75% 60% at 2% 98%, rgba(16,185,129,0.42), transparent 52%), radial-gradient(ellipse 55% 50% at 98% 4%, rgba(6,182,212,0.28), transparent 48%), radial-gradient(ellipse 45% 38% at 55% 65%, rgba(16,185,129,0.20), transparent 48%)',
        }}
      />

      {/* Visible grid */}
      <div
        className="absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--border) / 1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 1) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }}
      />

      {/* Chart SVG */}
      <svg
        className="absolute inset-0 h-full w-full opacity-75 dark:opacity-85"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="te-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(16,185,129,0.2)" />
            <stop offset="20%" stopColor="rgba(16,185,129,1)" />
            <stop offset="65%" stopColor="rgba(6,182,212,0.95)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0.15)" />
          </linearGradient>
          <linearGradient id="te-area-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(16,185,129,0.32)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </linearGradient>
          <filter id="te-glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="te-node-glow">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Area fill under trend curve */}
        <path
          d="M100 720 C250 680 380 580 580 490 C760 410 940 350 1140 290 C1280 250 1380 230 1440 220 L1440 900 L100 900 Z"
          fill="url(#te-area-grad)"
        />

        {/* Primary trend line — thick and glowing */}
        <path
          d="M100 720 C250 680 380 580 580 490 C760 410 940 350 1140 290 C1280 250 1380 230 1440 220"
          fill="none"
          stroke="url(#te-line-grad)"
          strokeWidth="4"
          filter="url(#te-glow)"
        />

        {/* Secondary dashed momentum line */}
        <path
          d="M100 800 C280 760 440 680 640 600 C820 530 1020 460 1240 400 C1340 370 1400 355 1440 345"
          fill="none"
          stroke="rgba(6,182,212,0.5)"
          strokeWidth="2"
          strokeDasharray="10 18"
        />

        {/* Pulsing data nodes */}
        {nodes.map((node, i) => (
          <g key={i} filter="url(#te-node-glow)">
            <circle
              cx={node.cx}
              cy={node.cy}
              r="7"
              fill="rgba(16,185,129,1)"
              style={{ animation: 'pulse 2.6s ease-in-out infinite', animationDelay: `${i * 0.38}s` }}
            />
            <circle
              cx={node.cx}
              cy={node.cy}
              r="15"
              fill="none"
              stroke="rgba(16,185,129,0.5)"
              strokeWidth="1.5"
              style={{ animation: 'pulse 2.6s ease-in-out infinite', animationDelay: `${i * 0.38}s` }}
            />
          </g>
        ))}

        {/* Scatter particles above the trend */}
        {[
          { cx: 820, cy: 200 }, { cx: 940, cy: 160 }, { cx: 1060, cy: 195 },
          { cx: 1180, cy: 150 }, { cx: 1080, cy: 120 }, { cx: 700, cy: 230 },
          { cx: 1260, cy: 180 }, { cx: 1360, cy: 130 },
        ].map((p, i) => (
          <circle
            key={`scatter-${i}`}
            cx={p.cx}
            cy={p.cy}
            r="3.5"
            fill="rgba(6,182,212,0.7)"
            style={{ animation: 'pulse 3.2s ease-in-out infinite', animationDelay: `${i * 0.25}s` }}
          />
        ))}
      </svg>

      {/* Diagonal light streak — upward-right */}
      <div
        className="absolute inset-x-[-15%] top-[30%] h-[34rem] bg-gradient-to-r from-transparent via-emerald-400/[0.18] to-transparent blur-3xl dark:via-emerald-400/[0.14]"
        style={{ transform: 'rotate(-22deg)' }}
      />

      {/* Light readability overlay — lets the wallpaper breathe */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/20 to-background/55" />
    </div>
  );
};

export default TractionEngineWallpaper;
