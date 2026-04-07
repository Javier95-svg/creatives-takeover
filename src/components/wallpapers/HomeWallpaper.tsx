/**
 * HomeWallpaper — "Orbital Depth"
 *
 * 4-layer composition for a premium SaaS feel:
 *   L1  Solid base (theme-aware)
 *   L2  Gradient mesh — three asymmetric radials create directional warmth
 *       (top-left stronger, bottom and right recede) mimicking a real light source
 *   L3  Noise grain — desaturated feTurbulence at low opacity, blended via
 *       mix-blend-soft-light so it adapts to both light and dark themes
 *   L4  Orbital arcs — thin ellipses partially overflowing the viewport,
 *       evoking trajectory / growth without being literal
 *
 * All colors reference design tokens so the wallpaper follows light/dark mode
 * automatically.  Every layer sits at -z-10 with pointer-events-none so it
 * never interferes with content.
 *
 * Alternate direction — "Luminous Veil":
 *   Single large top-center azimuthal glow (primary at 8%) with radial
 *   vignette (darker edges).  Same noise layer, no geometric shapes.
 *   To try: remove L4, change L2 to one centered ellipse gradient.
 */
const HomeWallpaper = () => (
  <>
    {/* L1 — Solid base */}
    <div className="fixed inset-0 -z-10 bg-background" />

    {/* L2 — Gradient mesh: asymmetric radials create directional depth */}
    <div
      className="fixed inset-0 -z-10"
      style={{
        backgroundImage: [
          'radial-gradient(ellipse 80% 50% at 10% 20%, hsl(var(--primary) / 0.12), transparent)',
          'radial-gradient(ellipse 50% 50% at 90% 15%, hsl(var(--primary) / 0.07), transparent)',
          'radial-gradient(ellipse 70% 35% at 45% 100%, hsl(var(--accent) / 0.08), transparent)',
        ].join(', '),
      }}
    />

    {/* L3 — Fine noise grain for editorial texture */}
    <svg
      className="fixed inset-0 -z-10 w-full h-full pointer-events-none opacity-[0.35] mix-blend-multiply dark:mix-blend-soft-light dark:opacity-[0.28]"
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

    {/* L4 — Orbital arcs: thin ellipses suggest trajectory and motion */}
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute -left-[20%] top-[8%] w-[75vw] aspect-[2/1] rounded-full border border-border/20" />
      <div className="absolute -right-[10%] top-[5%] w-[55vw] aspect-[1.6/1] rounded-full border border-primary/15" />
      <div className="absolute left-[5%] -bottom-[25%] w-[85vw] aspect-[2.5/1] rounded-full border border-border/15" />
    </div>
  </>
);

export default HomeWallpaper;
