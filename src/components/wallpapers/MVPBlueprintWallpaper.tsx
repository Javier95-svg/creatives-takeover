// MVP Builder's own backdrop: a blueprint. A faint drafting grid with a few
// dimension lines sits behind the empty start screens, and MVPBlueprintSketch
// draws an app wireframe being measured out, which is what the builder makes.
// Static and low-contrast on purpose (see PMFLabWallpaper). The builder is a
// full-screen workspace, so the wallpaper is only used where a panel is empty.

export default function MVPBlueprintWallpaper() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden text-tool-mvp"
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 55%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 55%, transparent 100%)',
      }}
    >
      {/* Drafting grid: fine lines every 16px, a stronger line every 80px. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            'linear-gradient(to right, hsl(var(--tool-mvp) / 0.035) 1px, transparent 1px)',
            'linear-gradient(to bottom, hsl(var(--tool-mvp) / 0.035) 1px, transparent 1px)',
            'linear-gradient(to right, hsl(var(--tool-mvp) / 0.07) 1px, transparent 1px)',
            'linear-gradient(to bottom, hsl(var(--tool-mvp) / 0.07) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '16px 16px, 16px 16px, 80px 80px, 80px 80px',
        }}
      />
    </div>
  );
}

/** A small app wireframe with dimension lines, for the empty preview. */
export function MVPBlueprintSketch({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 220" className={className} fill="none">
      <g className="text-tool-mvp">
        {/* Browser frame */}
        <rect x="40" y="30" width="240" height="160" rx="8" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.5" />
        <path d="M40 50 H280" stroke="currentColor" strokeOpacity="0.4" />
        {[52, 62, 72].map((cx) => <circle key={cx} cx={cx} cy="40" r="2.5" fill="currentColor" fillOpacity="0.5" />)}
        {/* Layout blocks */}
        <rect x="56" y="64" width="96" height="10" rx="3" fill="currentColor" fillOpacity="0.35" />
        <rect x="56" y="82" width="140" height="6" rx="3" fill="currentColor" fillOpacity="0.18" />
        <rect x="56" y="94" width="120" height="6" rx="3" fill="currentColor" fillOpacity="0.18" />
        <rect x="56" y="112" width="64" height="20" rx="5" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.25" />
        <rect x="206" y="64" width="58" height="68" rx="5" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="4 4" />
        <rect x="56" y="146" width="208" height="30" rx="5" stroke="currentColor" strokeOpacity="0.25" />
        {/* Dimension lines */}
        <path d="M40 204 H280 M40 199 V209 M280 199 V209" stroke="currentColor" strokeOpacity="0.45" />
        <path d="M24 30 V190 M19 30 H29 M19 190 H29" stroke="currentColor" strokeOpacity="0.45" />
      </g>
    </svg>
  );
}
