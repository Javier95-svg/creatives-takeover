// Traction Engine's own backdrop: a weekly logbook. Ruled lines and a margin
// rule fade out down the page, and TractionLogbookChart, drawn in the header,
// shows six weeks of results against a dashed target line, which is what the
// tool tracks. Static and low-contrast on purpose (see PMFLabWallpaper).

const WEEKS = [0.38, 0.52, 0.47, 0.71, 0.86, 0.95];
const TARGET = 0.7;
const CHART_TOP = 24;
const CHART_BOTTOM = 250;

export default function TractionLogbookWallpaper() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)',
      }}
    >
      {/* Ruled logbook lines. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(to bottom, hsl(var(--tool-traction) / 0.12) 1px, transparent 1px)',
          backgroundSize: '100% 32px',
        }}
      />
      {/* The margin rule, as in a paper log. */}
      {/* Kept in the left gutter so it never crosses the title. */}
      <div className="absolute inset-y-0 left-3 w-px sm:left-6" style={{ background: 'hsl(var(--tool-traction) / 0.28)' }} />
      <div className="absolute inset-y-0 left-4 w-px sm:left-7" style={{ background: 'hsl(var(--tool-traction) / 0.16)' }} />
    </div>
  );
}

/** Six weeks of results against the target, shown on the right of the header. */
export function TractionLogbookChart() {
  const height = CHART_BOTTOM - CHART_TOP;
  const targetY = CHART_BOTTOM - TARGET * height;
  return (
    <svg aria-hidden="true" viewBox="0 0 520 300" className="h-full w-full text-tool-traction" fill="none">
      <path d={`M24 ${CHART_BOTTOM} H504`} stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.25" />
      {WEEKS.map((value, index) => {
        const x = 52 + index * 76;
        const top = CHART_BOTTOM - value * height;
        const hit = value >= TARGET;
        return (
          <g key={x}>
            <rect
              x={x}
              y={top}
              width="40"
              height={CHART_BOTTOM - top}
              rx="4"
              fill={hit ? 'currentColor' : 'none'}
              fillOpacity={hit ? 0.5 : 0}
              stroke="currentColor"
              strokeOpacity={hit ? 0.75 : 0.45}
              strokeWidth="1.25"
            />
            <text x={x + 20} y={CHART_BOTTOM + 22} textAnchor="middle" fill="currentColor" fillOpacity="0.6" fontSize="12" fontFamily="'Space Grotesk', sans-serif">
              W{index + 1}
            </text>
          </g>
        );
      })}
      <path d={`M24 ${targetY} H504`} stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.25" strokeDasharray="6 6" />
      <text x="500" y={targetY - 8} textAnchor="end" fill="currentColor" fillOpacity="0.7" fontSize="13" fontFamily="'Space Grotesk', sans-serif">
        target
      </text>
    </svg>
  );
}
