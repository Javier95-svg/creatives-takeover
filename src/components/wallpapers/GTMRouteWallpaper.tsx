// GTM Strategist's own backdrop: a route map. A faint survey grid fades out
// down the page, and GTMRouteChart, drawn in the header, shows a dashed route
// through six weekly waypoints to a goal flag, which is what the six-week plan
// is. Static and low-contrast on purpose (see PMFLabWallpaper).

const WAYPOINTS: Array<[number, number]> = [
  [40, 236],
  [118, 190],
  [196, 214],
  [270, 140],
  [352, 162],
  [430, 86],
];
const GOAL: [number, number] = [492, 52];

export default function GTMRouteWallpaper() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)',
      }}
    >
      {/* A survey grid, as on a map sheet. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'linear-gradient(to right, hsl(var(--tool-gtm) / 0.09) 1px, transparent 1px)',
            'linear-gradient(to bottom, hsl(var(--tool-gtm) / 0.09) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '48px 48px',
        }}
      />
      {/* Contour lines in the far corner, kept away from the title. */}
      <svg className="absolute -right-24 top-0 hidden h-[30rem] w-[30rem] text-tool-gtm lg:block" viewBox="0 0 400 400" fill="none">
        {[70, 110, 150, 190].map((r) => (
          <ellipse key={r} cx="260" cy="140" rx={r * 1.15} ry={r} stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
        ))}
      </svg>
    </div>
  );
}

/** Six weekly waypoints on a dashed route to the six-week goal, shown on the right of the header. */
export function GTMRouteChart() {
  const route = [...WAYPOINTS, GOAL].map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  return (
    <svg aria-hidden="true" viewBox="0 0 520 300" className="h-full w-full text-tool-gtm" fill="none">
      <path d={route} stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="7 6" strokeLinecap="round" />
      {WAYPOINTS.map(([x, y], index) => (
        <g key={x}>
          <circle cx={x} cy={y} r="9" fill="hsl(var(--background))" stroke="currentColor" strokeOpacity={index < 2 ? 0.85 : 0.5} strokeWidth="1.5" />
          {index < 2 ? <circle cx={x} cy={y} r="4" fill="currentColor" fillOpacity="0.8" /> : null}
          <text x={x} y={y + 28} textAnchor="middle" fill="currentColor" fillOpacity="0.6" fontSize="12" fontFamily="'Space Grotesk', sans-serif">
            W{index + 1}
          </text>
        </g>
      ))}
      <path d={`M${GOAL[0]} ${GOAL[1] + 14} V${GOAL[1] - 22}`} stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.5" />
      <path d={`M${GOAL[0]} ${GOAL[1] - 22} l18 6 l-18 6 z`} fill="currentColor" fillOpacity="0.6" />
      <text x={GOAL[0] + 4} y={GOAL[1] + 34} textAnchor="middle" fill="currentColor" fillOpacity="0.7" fontSize="13" fontFamily="'Space Grotesk', sans-serif">
        goal
      </text>
    </svg>
  );
}
