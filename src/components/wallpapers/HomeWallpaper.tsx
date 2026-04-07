/**
 * HomeWallpaper - Aurora Field
 *
 * Single continuous canvas for the home page. Fixed layers provide stability
 * while oversized absolute color fields scroll with the document, so the page
 * evolves gradually from the hero to the lower sections without visible seams.
 */
const HomeWallpaper = () => (
  <>
    {/* L1 - Stable base */}
    <div className="fixed inset-0 -z-10 bg-background" />

    {/* L2 - Hero-weighted glow that softens into the page */}
    <div
      className="absolute inset-x-0 top-0 h-[1100px] -z-10 pointer-events-none"
      style={{
        backgroundImage: [
          'radial-gradient(ellipse 130% 62% at 50% 0%, hsl(var(--primary) / 0.16), transparent 72%)',
          'radial-gradient(ellipse 84% 42% at 50% 8%, hsl(var(--accent) / 0.09), transparent 70%)',
          'radial-gradient(ellipse 58% 54% at 18% 18%, hsl(205 44% 78% / 0.16), transparent 72%)',
        ].join(', '),
      }}
    />

    {/* L3 - Mid-page field keeps the scroll feeling alive without implying sections */}
    <div
      className="absolute inset-x-0 top-[520px] h-[1500px] -z-10 pointer-events-none"
      style={{
        backgroundImage: [
          'radial-gradient(ellipse 92% 58% at 22% 18%, hsl(var(--primary) / 0.05), transparent 76%)',
          'radial-gradient(ellipse 88% 52% at 78% 34%, hsl(226 38% 64% / 0.07), transparent 78%)',
          'radial-gradient(ellipse 118% 66% at 52% 100%, hsl(var(--accent) / 0.04), transparent 82%)',
        ].join(', '),
      }}
    />

    {/* L4 - Soft lower-page veil so the canvas never drops to flat white */}
    <div
      className="absolute inset-x-0 top-[1500px] bottom-0 -z-10 pointer-events-none"
      style={{
        backgroundImage: [
          'radial-gradient(ellipse 82% 48% at 50% 10%, hsl(var(--primary) / 0.03), transparent 78%)',
          'radial-gradient(ellipse 64% 36% at 82% 36%, hsl(205 44% 78% / 0.05), transparent 82%)',
        ].join(', '),
      }}
    />

    {/* L5 - Global veil keeps edge contrast calm across the full viewport */}
    <div
      className="fixed inset-0 -z-10 pointer-events-none opacity-90 dark:opacity-100"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 120% 72% at 50% -10%, transparent 0%, transparent 54%, hsl(var(--background) / 0.22) 100%)',
      }}
    />

    {/* L6 - Editorial grain for depth without introducing a hard pattern */}
    <svg
      className="fixed inset-0 -z-10 h-full w-full pointer-events-none opacity-[0.24] mix-blend-multiply dark:opacity-[0.16] dark:mix-blend-soft-light"
      aria-hidden="true"
    >
      <filter id="homeGrain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.62"
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
