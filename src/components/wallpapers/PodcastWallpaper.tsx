// Podcast section wallpaper — its own identity: a cinematic "live broadcast studio"
// at night. Aurora glows, sound waves rippling out like a radio signal, an
// equalizer along the floor, and a perspective stage grid. All built on the theme
// tokens (primary / accent / secondary) and finished with a readability veil so
// foreground text stays legible.
//
// It is drawn still. It used to run 36 endless loops (drifting 90 to 110px blurs,
// expanding rings, bouncing bars) behind the frosted navbar: with a 4x slower CPU
// the page managed 12fps idle and while scrolling, against 47fps held still. The
// rings and bars keep the look of a moment caught mid-broadcast.

// Deterministic equalizer bar heights so the baseline looks organic but stable,
// and a second wave for how far each bar is "lit", so the row reads as audio.
const EQ_BARS = Array.from({ length: 28 }, (_, i) => ({
  height: 20 + (Math.sin(i * 1.3) * 0.5 + 0.5) * 64 + (Math.sin(i * 0.5) * 0.5 + 0.5) * 14,
  level: 0.35 + (Math.sin(i * 0.9 + 1) * 0.5 + 0.5) * 0.65,
}));

// Five sound waves caught as they spread out from the mic, fading with distance.
const RINGS = [
  { scale: 0.3, opacity: 0.45 },
  { scale: 0.58, opacity: 0.34 },
  { scale: 0.9, opacity: 0.24 },
  { scale: 1.24, opacity: 0.15 },
  { scale: 1.6, opacity: 0.08 },
];

const PodcastWallpaper = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    {/* Base: dark stage with a glow spilling from the top */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(135% 90% at 50% -15%, hsl(var(--primary) / 0.30) 0%, transparent 55%), linear-gradient(165deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.40) 55%, hsl(var(--background)) 100%)",
      }}
    />

    {/* Aurora glows */}
    <div
      className="absolute -left-[12%] top-[16%] h-[46vh] w-[46vh] rounded-full opacity-60 blur-[90px] dark:opacity-45"
      style={{
        background: "radial-gradient(circle, hsl(var(--primary) / 0.55), transparent 70%)",
      }}
    />
    <div
      className="absolute -right-[10%] top-[42%] h-[40vh] w-[40vh] rounded-full opacity-55 blur-[100px] dark:opacity-40"
      style={{
        background: "radial-gradient(circle, hsl(var(--accent) / 0.50), transparent 70%)",
      }}
    />
    <div
      className="absolute bottom-[-14%] left-[34%] h-[44vh] w-[44vh] rounded-full opacity-50 blur-[110px] dark:opacity-35"
      style={{
        background: "radial-gradient(circle, hsl(var(--secondary) / 0.50), transparent 70%)",
      }}
    />

    {/* Sound waves rippling out from the "mic" focal point */}
    <div className="absolute left-1/2 top-[30%]">
      {RINGS.map((ring, i) => (
        <div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: "42vmax",
            height: "42vmax",
            left: 0,
            top: 0,
            borderColor: "hsl(var(--primary) / 0.38)",
            opacity: ring.opacity,
            transform: `translate(-50%, -50%) scale(${ring.scale})`,
          }}
        />
      ))}
    </div>

    {/* Perspective stage grid (depth) */}
    <div
      className="absolute inset-x-0 bottom-0 h-[42%] opacity-[0.16] dark:opacity-[0.1]"
      style={{
        backgroundImage:
          "linear-gradient(hsl(var(--foreground) / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.6) 1px, transparent 1px)",
        backgroundSize: "3rem 3rem",
        transform: "perspective(48vh) rotateX(60deg)",
        transformOrigin: "bottom",
        maskImage: "linear-gradient(to top, black, transparent)",
        WebkitMaskImage: "linear-gradient(to top, black, transparent)",
      }}
    />

    {/* Equalizer along the floor */}
    <div className="absolute inset-x-0 bottom-0 flex h-[22vh] items-end justify-center gap-[0.5vw] px-6 opacity-55 dark:opacity-40">
      {EQ_BARS.map((bar, i) => (
        <div
          key={i}
          className="w-[0.7vw] max-w-[9px] origin-bottom rounded-t-full"
          style={{
            height: `${bar.height}%`,
            background:
              "linear-gradient(to top, hsl(var(--primary) / 0.6), hsl(var(--accent) / 0.3) 70%, transparent)",
            transform: `scaleY(${bar.level})`,
          }}
        />
      ))}
    </div>

    {/* On-air sign */}
    <div className="absolute right-[8%] top-[15%] hidden items-center gap-2 rounded-full border border-primary/40 bg-background/60 px-4 py-1.5 shadow-lg backdrop-blur-sm md:flex rotate-[3deg]">
      <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
      <span className="text-xs font-semibold tracking-[0.2em] text-foreground/70">ON AIR</span>
    </div>

    {/* Grain */}
    <div
      className="absolute inset-0 opacity-25 dark:opacity-[0.14]"
      style={{
        backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.09) 0.4px, transparent 0.4px)",
        backgroundSize: "2.8px 2.8px",
      }}
    />

    {/* Readability veil */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, hsl(var(--background) / 0.52) 0%, hsl(var(--background) / 0.70) 58%, hsl(var(--background) / 0.80) 100%)",
      }}
    />
  </div>
);

export default PodcastWallpaper;
