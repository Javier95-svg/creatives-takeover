// PMF Lab's own backdrop: a lab notebook. Faint graph paper fades out down the
// page, and PMFLabChart, drawn in the header, plots survey answers as dots, a
// fitted S-curve, and the dashed 40% line that marks product-market fit.
//
// Deliberately static and low-contrast. Earlier tool backdrops used glowing
// blobs and spinning gradients, which founders read as machine-made; this one
// says what the tool measures instead of just adding colour.

// Deterministic points so the drawing never shifts between renders.
const POINTS: Array<[number, number]> = [
  [40, 238], [72, 226], [96, 244], [128, 214], [152, 230], [184, 196], [208, 206], [236, 168], [262, 182],
  [288, 140], [314, 150], [338, 112], [364, 122], [392, 92], [420, 100], [448, 80], [476, 86],
];

const THRESHOLD_Y = 150;

export default function PMFLabWallpaper() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)',
      }}
    >
      {/* Graph paper: fine 24px squares with a stronger line every 120px. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'linear-gradient(to right, hsl(var(--tool-pmf) / 0.14) 1px, transparent 1px)',
            'linear-gradient(to bottom, hsl(var(--tool-pmf) / 0.14) 1px, transparent 1px)',
            'linear-gradient(to right, hsl(var(--tool-pmf) / 0.06) 1px, transparent 1px)',
            'linear-gradient(to bottom, hsl(var(--tool-pmf) / 0.06) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '120px 120px, 120px 120px, 24px 24px, 24px 24px',
          backgroundPosition: '-1px -1px',
        }}
      />
    </div>
  );
}

/** The plotted chart shown on the right of the PMF Lab header. */
export function PMFLabChart() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 520 300"
      className="h-full w-full text-tool-pmf"
      fill="none"
    >
      <g stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.25">
        <path d="M24 270 V24" />
        <path d="M24 270 H504" />
      </g>
      <path
        d={`M24 ${THRESHOLD_Y} H504`}
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="1.25"
        strokeDasharray="6 6"
      />
      <text x="500" y={THRESHOLD_Y - 8} textAnchor="end" fill="currentColor" fillOpacity="0.7" fontSize="13" fontFamily="'Space Grotesk', sans-serif">
        40%
      </text>
      <path
        d="M36 240 C 150 236, 210 214, 262 166 S 380 92, 492 82"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {POINTS.map(([x, y]) => {
        // Answers above the 40% line are filled in; the rest stay hollow.
        const above = y < THRESHOLD_Y;
        return (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={above ? 4.5 : 3.5}
          fill={above ? 'currentColor' : 'none'}
          fillOpacity={above ? 0.55 : 0}
          stroke="currentColor"
          strokeOpacity={above ? 0.7 : 0.45}
          strokeWidth="1.25"
        />
        );
      })}
    </svg>
  );
}
