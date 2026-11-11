// The Pulse home wallpaper: two engraved guilloché rosettes, like a watch dial
// or a banknote, set into the top-left and bottom-right corners over a faint
// plaster grain. Each rosette is a few wavy rings; copies of each ring, turned
// by a fraction of one wave, weave into the engraved bands. The rings are
// computed once here rather than shipped as path data, and the markup is a
// module constant so typing in the composer never re-renders it.

type Point = [number, number];

const round = (value: number) => Math.round(value * 10) / 10;

/** A smooth closed path through the points (Catmull-Rom as cubic Béziers). */
function smoothClosedPath(points: Point[]): string {
  const p = [points[points.length - 1], ...points, points[0], points[1]];
  let d = `M${round(p[1][0])} ${round(p[1][1])}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const [x2, y2] = p[i + 1];
    const [x3, y3] = p[i + 2];
    d += `C${round(x1 + (x2 - x0) / 6)} ${round(y1 + (y2 - y0) / 6)} ${round(x2 - (x3 - x1) / 6)} ${round(y2 - (y3 - y1) / 6)} ${round(x2)} ${round(y2)}`;
  }
  return `${d}Z`;
}

/** A circle of `radius` with `lobes` waves of `amplitude` around it. */
function wavyRing(radius: number, amplitude: number, lobes: number): string {
  const count = Math.max(240, lobes * 16);
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = radius + amplitude * Math.sin(lobes * angle);
    points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  return smoothClosedPath(points);
}

// tone: 'a' and 'b' are the two hairline colours; the right rosette swaps them.
const RINGS = [
  { radius: 300, amplitude: 22, lobes: 22, copies: 14, tone: 'a' },
  { radius: 205, amplitude: 30, lobes: 14, copies: 12, tone: 'b' },
  { radius: 120, amplitude: 16, lobes: 9, copies: 10, tone: 'a' },
].map(ring => ({ ...ring, d: wavyRing(ring.radius, ring.amplitude, ring.lobes) }));

const RULE_RADII = [338, 344, 252, 166, 70, 64];

function rosette(x: number, y: number) {
  return <g transform={`translate(${x} ${y})`} fill="none" strokeWidth=".85">
    {RINGS.map(ring => <g key={ring.radius} className={`pg-ring pg-ring--${ring.tone}`}>
      {Array.from({ length: ring.copies }, (_, copy) => <path key={copy} d={ring.d} transform={copy ? `rotate(${round((360 / ring.lobes) * (copy / ring.copies))})` : undefined} />)}
    </g>)}
    <g className="pg-ring pg-ring--rule">{RULE_RADII.map(r => <circle key={r} r={r} />)}</g>
  </g>;
}

// Each rosette sits in an edge-anchored panel (a 420×900 slice of a 1600×900
// wall) so it stays in its corner whatever the window's shape.
const WALLPAPER = <div className="pulse-guilloche" aria-hidden="true">
  <svg className="pg-grain" width="100%" height="100%" focusable="false">
    <filter id="pulse-plaster-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves={2} seed={7} />
      <feColorMatrix type="matrix" values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .9 -.35" />
    </filter>
    <rect width="100%" height="100%" filter="url(#pulse-plaster-grain)" />
  </svg>
  <svg className="pg-panel pg-panel--left" viewBox="0 0 420 900" preserveAspectRatio="xMinYMid meet" overflow="visible" focusable="false">{rosette(40, 150)}</svg>
  <svg className="pg-panel pg-panel--right" viewBox="1180 0 420 900" preserveAspectRatio="xMaxYMid meet" overflow="visible" focusable="false">{rosette(1570, 790)}</svg>
</div>;

export function PulseGuillocheWallpaper() {
  return WALLPAPER;
}
