// Demo Studio's own backdrop: a storyboard. Faint screen frames sit in a row
// like a contact sheet and fade out down the page, and DemoStoryboardChart,
// drawn in the header, shows three screens joined by arrows with a click target
// and a cursor, which is what an interactive demo is. Static and low-contrast
// on purpose (see PMFLabWallpaper).

const FRAMES = [0, 1, 2, 3, 4, 5, 6, 7];

export default function DemoStoryboardWallpaper() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 40%, transparent 100%)',
      }}
    >
      {/* A contact sheet of screen frames along the top edge. */}
      <div className="absolute -left-10 top-6 flex gap-6 text-tool-demo">
        {FRAMES.map((frame) => (
          <svg key={frame} width="200" height="132" viewBox="0 0 200 132" fill="none">
            <rect x="1" y="1" width="198" height="130" rx="8" stroke="currentColor" strokeOpacity="0.09" />
            <path d="M1 20 H199" stroke="currentColor" strokeOpacity="0.06" />
            {[12, 22, 32].map((cx) => <circle key={cx} cx={cx} cy="10.5" r="2.5" fill="currentColor" fillOpacity="0.08" />)}
          </svg>
        ))}
      </div>
    </div>
  );
}

/** Three screens joined by arrows, with a click target and a cursor on the middle one. */
export function DemoStoryboardChart() {
  const screens = [
    { x: 20, y: 70 },
    { x: 190, y: 40 },
    { x: 360, y: 70 },
  ];
  return (
    <svg aria-hidden="true" viewBox="0 0 520 300" className="h-full w-full text-tool-demo" fill="none">
      {screens.map(({ x, y }, index) => (
        <g key={x}>
          <rect x={x} y={y} width="140" height="96" rx="8" fill="hsl(var(--background))" stroke="currentColor" strokeOpacity={index === 1 ? 0.75 : 0.45} strokeWidth="1.5" />
          <path d={`M${x} ${y + 16} H${x + 140}`} stroke="currentColor" strokeOpacity="0.3" />
          {[10, 18, 26].map((dx) => <circle key={dx} cx={x + dx} cy={y + 8} r="2" fill="currentColor" fillOpacity="0.4" />)}
          <rect x={x + 14} y={y + 30} width="70" height="8" rx="4" fill="currentColor" fillOpacity="0.25" />
          <rect x={x + 14} y={y + 46} width="100" height="6" rx="3" fill="currentColor" fillOpacity="0.15" />
          <rect x={x + 14} y={y + 58} width="84" height="6" rx="3" fill="currentColor" fillOpacity="0.15" />
          <text x={x + 70} y={y + 122} textAnchor="middle" fill="currentColor" fillOpacity="0.6" fontSize="12" fontFamily="'Space Grotesk', sans-serif">
            {index + 1}
          </text>
        </g>
      ))}
      {/* Arrows between screens. */}
      <path d="M164 118 C176 112 180 100 186 94" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="5 5" />
      <path d="M334 94 C342 100 348 110 356 116" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="5 5" />
      {/* Click target on the middle screen, with a cursor. */}
      <rect x="276" y="110" width="44" height="18" rx="9" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" fill="currentColor" fillOpacity="0.15" />
      <circle cx="298" cy="119" r="16" stroke="currentColor" strokeOpacity="0.35" />
      <path d="M304 124 L304 146 L310 140 L315 151 L319 149 L314 138 L322 138 Z" fill="hsl(var(--background))" stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  );
}
