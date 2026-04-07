/**
 * HomeWallpaper — Continuous Scrolling Canvas
 *
 * Single seamless background — no section breaks. Gradient layers use
 * `absolute` positioning so they scroll with the page, creating a
 * progressive visual journey from hero → mid-page → footer.
 *
 *   L1  Solid base (fixed)
 *   L2  Hero glow — top 900px, concentrated primary aurora (absolute)
 *   L3  Mid-page warmth — offset warm gradient adding depth (absolute)
 *   L4  Dot grid — subtle structure across full viewport (fixed)
 *   L5  Noise grain — editorial texture, theme-adaptive blend (fixed)
 */
const HomeWallpaper = () => (
  <>
    {/* L1 — Solid base */}
    <div className="fixed inset-0 -z-10 bg-background" />

    {/* L2 — Hero glow: concentrated at top, fades into page */}
    <div
      className="absolute inset-x-0 top-0 h-[900px] -z-10"
      style={{
        backgroundImage: [
          'radial-gradient(ellipse 130% 55% at 50% 0%, hsl(217 91% 60% / 0.14), transparent)',
          'radial-gradient(ellipse 80% 35% at 50% 0%, hsl(217 91% 70% / 0.09), transparent)',
          'radial-gradient(ellipse 60% 60% at 50% 5%, hsl(210 60% 90% / 0.22), transparent 80%)',
        ].join(', '),
      }}
    />

    {/* L3 — Mid-page warmth: offset gradient for depth */}
    <div
      className="absolute inset-x-0 top-[800px] h-[1200px] -z-10"
      style={{
        backgroundImage: [
          'radial-gradient(ellipse 100% 50% at 30% 20%, hsl(217 91% 60% / 0.06), transparent)',
          'radial-gradient(ellipse 80% 40% at 70% 60%, hsl(230 70% 65% / 0.05), transparent)',
        ].join(', '),
      }}
    />

    {/* L4 — Dot grid: full-viewport structure */}
    <div
      className="fixed inset-0 -z-10 opacity-[0.35] dark:opacity-[0.12]"
      style={{
        backgroundImage:
          'radial-gradient(circle 0.75px at center, hsl(var(--foreground) / 0.12) 0.75px, transparent 0.75px)',
        backgroundSize: '24px 24px',
      }}
    />

    {/* L5 — Noise grain */}
    <svg
      className="fixed inset-0 -z-10 w-full h-full pointer-events-none opacity-[0.28] mix-blend-multiply dark:mix-blend-soft-light dark:opacity-[0.18]"
      aria-hidden="true"
    >
      <filter id="homeGrain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="4"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#homeGrain)" />
    </svg>
  </>
);

export default HomeWallpaper;
