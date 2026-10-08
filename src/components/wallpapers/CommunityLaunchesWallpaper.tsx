// Community Launches' own backdrop: a launch sky. A sparse starfield and a
// few dashed constellations repeat evenly from the top of the page to the bottom, and
// LaunchTrajectoryChart, drawn in the header, shows the week's podium with one
// launch climbing off it, which is what a round is. Static and low-contrast
// like the other tool backdrops (see PMFLabWallpaper).

// Deterministic stars so the sky never shifts between renders: [x%, y px, radius].
const STARS: Array<[number, number, number]> = [
  [4, 46, 1.4], [9, 210, 1], [13, 120, 1.8], [18, 330, 1.1], [22, 60, 1], [27, 250, 1.5], [31, 160, 1], [35, 400, 1.2],
  [39, 30, 1.6], [43, 290, 1], [47, 110, 1.2], [51, 360, 1.5], [55, 70, 1], [59, 220, 1.8], [63, 140, 1], [67, 320, 1.2],
  [71, 40, 1], [75, 190, 1.5], [79, 280, 1], [83, 90, 1.3], [87, 380, 1], [91, 160, 1.6], [95, 60, 1.1], [98, 250, 1],
];

// Star indexes joined into constellations, kept away from the title column.
const CONSTELLATIONS: number[][] = [[10, 12, 14, 13], [17, 19, 18, 21], [2, 4, 6]];

// The sky is one band this tall, stacked down the page so it covers it evenly
// from top to bottom. Enough bands for the longest board; the rest is clipped.
const BAND_HEIGHT = 420;
const BANDS = 24;

function SkyBand() {
  return (
    <svg className="block w-full shrink-0" height={BAND_HEIGHT} fill="none">
      {/* A few constellations: past launches joined up across the sky. */}
      <g stroke="currentColor" strokeOpacity="0.14" strokeWidth="1" strokeDasharray="3 6">
        {CONSTELLATIONS.map((line) => line.slice(1).map((star, index) => {
          const [x1, y1] = STARS[line[index]];
          const [x2, y2] = STARS[star];
          return <line key={`${line[index]}-${star}`} x1={`${x1}%`} y1={y1} x2={`${x2}%`} y2={y2} />;
        }))}
      </g>
      {STARS.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} cx={`${x}%`} cy={y} r={r} fill="currentColor" fillOpacity={r > 1.4 ? 0.45 : 0.28} />
      ))}
    </svg>
  );
}

export default function CommunityLaunchesWallpaper() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col overflow-hidden text-tool-launches">
      {Array.from({ length: BANDS }, (_, index) => <SkyBand key={index} />)}
    </div>
  );
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** The week's podium with a launch climbing off first place, on the right of the header. */
export function LaunchTrajectoryChart() {
  // Monday is 0, matching the round boundary (Monday 00:00 UTC).
  const today = (new Date().getUTCDay() + 6) % 7;
  return (
    <svg aria-hidden="true" viewBox="0 0 520 300" className="h-full w-full text-tool-launches" fill="none">
      <path d="M24 250 H504" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.25" />
      {/* Podium: second, first, third. */}
      <rect x="44" y="196" width="56" height="54" rx="4" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.25" fill="currentColor" fillOpacity="0.12" />
      <rect x="104" y="166" width="56" height="84" rx="4" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.25" fill="currentColor" fillOpacity="0.45" />
      <rect x="164" y="214" width="56" height="36" rx="4" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.25" fill="currentColor" fillOpacity="0.08" />
      {['2', '1', '3'].map((place, index) => (
        <text key={place} x={72 + index * 60} y={index === 1 ? 190 : index === 0 ? 218 : 234} textAnchor="middle" fill="currentColor" fillOpacity="0.8" fontSize="14" fontWeight="600" fontFamily="'Space Grotesk', sans-serif">{place}</text>
      ))}
      {/* Trajectory from first place up to the rocket. */}
      <path d="M132 160 C 190 110, 300 70, 432 46" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.75" strokeDasharray="6 7" strokeLinecap="round" />
      <g transform="translate(446 40) rotate(-62)">
        <path d="M0 -20 C 9 -12, 9 6, 6 14 H-6 C-9 6, -9 -12, 0 -20 Z" fill="currentColor" fillOpacity="0.75" />
        <circle cx="0" cy="-4" r="3.2" fill="hsl(var(--background))" />
        <path d="M-6 6 L-12 16 H-6 Z M6 6 L12 16 H6 Z" fill="currentColor" fillOpacity="0.55" />
        <path d="M-3 16 L0 26 L3 16 Z" fill="currentColor" fillOpacity="0.4" />
      </g>
      {[[300, 92], [256, 104], [214, 120]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.5" fill="currentColor" fillOpacity="0.35" />)}
      {/* The round's days, with today's position. */}
      {DAYS.map((day, index) => {
        const x = 272 + index * 34;
        const done = index <= today;
        return (
          <g key={`${day}-${index}`}>
            <circle cx={x} cy="250" r="4" fill={done ? 'currentColor' : 'hsl(var(--background))'} fillOpacity={done ? 0.6 : 1} stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.25" />
            <text x={x} y="274" textAnchor="middle" fill="currentColor" fillOpacity="0.6" fontSize="12" fontFamily="'Space Grotesk', sans-serif">{day}</text>
          </g>
        );
      })}
    </svg>
  );
}
