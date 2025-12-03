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

      {/* Network Connection Pattern - SVG Container */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          {/* Gradient for accent lines - Primary blue at 8% opacity */}
          <linearGradient id="accent-line-1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
            <stop offset="20%" stopColor="#3B82F6" stopOpacity="0.08" />
            <stop offset="80%" stopColor="#3B82F6" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="accent-line-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
            <stop offset="30%" stopColor="#3B82F6" stopOpacity="0.08" />
            <stop offset="70%" stopColor="#3B82F6" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Base Pattern: Thin Diagonal Lines - #E5E7EB at 1-2% opacity (light), 2-3% (dark) */}
        {/* Sparse, purposeful placement - 45° angles */}
        <g className="opacity-[0.015] dark:opacity-[0.025]">
          <line x1="0" y1="100" x2="300" y2="400" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="300" y1="0" x2="600" y2="300" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="600" y1="200" x2="900" y2="500" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="900" y1="100" x2="1200" y2="400" stroke="#E5E7EB" strokeWidth="1" />
          
          {/* -45° angles */}
          <line x1="0" y1="500" x2="300" y2="200" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="300" y1="700" x2="600" y2="400" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="600" y1="600" x2="900" y2="300" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="900" y1="800" x2="1200" y2="500" stroke="#E5E7EB" strokeWidth="1" />
          
          {/* 30° angles */}
          <line x1="0" y1="300" x2="350" y2="475" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="400" y1="0" x2="750" y2="175" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="800" y1="300" x2="1150" y2="475" stroke="#E5E7EB" strokeWidth="1" />
          
          {/* -30° angles */}
          <line x1="0" y1="600" x2="350" y2="425" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="400" y1="900" x2="750" y2="725" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="800" y1="600" x2="1150" y2="425" stroke="#E5E7EB" strokeWidth="1" />
        </g>

        {/* Connection Dots (Nodes) - #E5E7EB at 1-2% opacity (light), 2-3% (dark), strategic placement */}
        <g className="opacity-[0.015] dark:opacity-[0.025]">
          {[
            { x: 200, y: 180 },
            { x: 450, y: 280 },
            { x: 700, y: 220 },
            { x: 950, y: 320 },
            { x: 1200, y: 250 },
            { x: 320, y: 480 },
            { x: 570, y: 580 },
            { x: 820, y: 520 },
            { x: 1070, y: 620 },
            { x: 180, y: 680 },
            { x: 430, y: 780 },
            { x: 680, y: 720 },
            { x: 930, y: 780 },
            { x: 1180, y: 700 },
          ].map((dot, index) => (
            <circle
              key={`node-${index}`}
              cx={dot.x}
              cy={dot.y}
              r="2"
              fill="#E5E7EB"
            />
          ))}
        </g>

        {/* Subtle Connector Lines - Linking nodes, #E5E7EB at 1-2% opacity (light), 2-3% (dark) */}
        <g className="opacity-[0.015] dark:opacity-[0.025]">
          {/* Organic flowing paths connecting nodes */}
          <path
            d="M 200 180 Q 325 230 450 280 Q 575 300 700 220"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
          <path
            d="M 700 220 Q 825 270 950 320 Q 1075 340 1200 250"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
          <path
            d="M 320 480 Q 445 530 570 580 Q 695 600 820 520"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
          <path
            d="M 820 520 Q 945 570 1070 620"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
          <path
            d="M 180 680 Q 305 730 430 780 Q 555 800 680 720"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
          <path
            d="M 680 720 Q 805 750 930 780 Q 1055 790 1180 700"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
          
          {/* Vertical interconnections */}
          <line x1="450" y1="280" x2="570" y2="580" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="700" y1="220" x2="820" y2="520" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="950" y1="320" x2="1070" y2="620" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="320" y1="480" x2="180" y2="680" stroke="#E5E7EB" strokeWidth="1" />
          <line x1="820" y1="520" x2="680" y2="720" stroke="#E5E7EB" strokeWidth="1" />
        </g>

        {/* Accent Lines - Primary blue #3B82F6 at 8% opacity, 1-2 prominent paths */}
        {/* Primary accent: Flowing curved path from top-left to bottom-right */}
        <path
          d="M 80 150 Q 400 350 720 300 Q 1000 280 1320 450"
          fill="none"
          stroke="url(#accent-line-1)"
          strokeWidth="2.5"
        />
        
        {/* Secondary accent: Vertical flowing path through center */}
        <path
          d="M 760 50 Q 780 350 760 650 Q 740 850 720 900"
          fill="none"
          stroke="url(#accent-line-2)"
          strokeWidth="2.5"
        />
      </svg>

      {/* Readability overlay - ensures content is always readable */}
      <div className="absolute inset-0 
        dark:from-background/80 dark:via-background/55 dark:to-background/75 
        from-background/94 via-background/97 to-background/94 
        bg-gradient-to-b" />
    </div>
  );
};

export default MentorMarketplaceWallpaper;
