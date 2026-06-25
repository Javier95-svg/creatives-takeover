// Podcast section wallpaper — its own identity: a cinematic "live broadcast studio"
// at night. Drifting aurora glows, sound waves rippling out like a radio signal, a
// reactive equalizer along the floor, and a perspective stage grid. All built on the
// theme tokens (primary / accent / secondary), animation-light, reduced-motion aware,
// and finished with a readability veil so foreground text stays legible.

// Deterministic equalizer bar heights so the baseline looks organic but stable.
const EQ_BARS = Array.from({ length: 52 }, (_, i) =>
  20 + (Math.sin(i * 1.3) * 0.5 + 0.5) * 64 + (Math.sin(i * 0.5) * 0.5 + 0.5) * 14
);

const PodcastWallpaper = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    <style>{`
      @keyframes pw-ring {
        0%   { transform: translate(-50%, -50%) scale(0.18); opacity: 0; }
        12%  { opacity: 0.5; }
        100% { transform: translate(-50%, -50%) scale(1.65); opacity: 0; }
      }
      @keyframes pw-drift-1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(4%, 3%) scale(1.08); } }
      @keyframes pw-drift-2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-5%, -3%) scale(1.12); } }
      @keyframes pw-drift-3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(3%, -4%) scale(1.06); } }
      @keyframes pw-eq { 0%,100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
      @media (prefers-reduced-motion: reduce) {
        .pw-anim { animation: none !important; }
      }
    `}</style>

    {/* Base: dark stage with a glow spilling from the top */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(135% 90% at 50% -15%, hsl(var(--primary) / 0.30) 0%, transparent 55%), linear-gradient(165deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.40) 55%, hsl(var(--background)) 100%)",
      }}
    />

    {/* Drifting aurora glows */}
    <div
      className="pw-anim absolute -left-[12%] top-[16%] h-[46vh] w-[46vh] rounded-full opacity-60 blur-[90px] dark:opacity-45"
      style={{
        background: "radial-gradient(circle, hsl(var(--primary) / 0.55), transparent 70%)",
        animation: "pw-drift-1 18s ease-in-out infinite",
      }}
    />
    <div
      className="pw-anim absolute -right-[10%] top-[42%] h-[40vh] w-[40vh] rounded-full opacity-55 blur-[100px] dark:opacity-40"
      style={{
        background: "radial-gradient(circle, hsl(var(--accent) / 0.50), transparent 70%)",
        animation: "pw-drift-2 22s ease-in-out infinite",
      }}
    />
    <div
      className="pw-anim absolute bottom-[-14%] left-[34%] h-[44vh] w-[44vh] rounded-full opacity-50 blur-[110px] dark:opacity-35"
      style={{
        background: "radial-gradient(circle, hsl(var(--secondary) / 0.50), transparent 70%)",
        animation: "pw-drift-3 26s ease-in-out infinite",
      }}
    />

    {/* Sound waves rippling out from the "mic" focal point */}
    <div className="absolute left-1/2 top-[30%]">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="pw-anim absolute rounded-full border"
          style={{
            width: "42vmax",
            height: "42vmax",
            left: 0,
            top: 0,
            borderColor: "hsl(var(--primary) / 0.38)",
            animation: `pw-ring 8s ease-out ${i * 1.6}s infinite`,
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

    {/* Reactive equalizer along the floor */}
    <div className="absolute inset-x-0 bottom-0 flex h-[22vh] items-end justify-center gap-[0.5vw] px-6 opacity-55 dark:opacity-40">
      {EQ_BARS.map((h, i) => (
        <div
          key={i}
          className="pw-anim w-[0.7vw] max-w-[9px] origin-bottom rounded-t-full"
          style={{
            height: `${h}%`,
            background:
              "linear-gradient(to top, hsl(var(--primary) / 0.6), hsl(var(--accent) / 0.3) 70%, transparent)",
            animation: `pw-eq ${2.4 + (i % 5) * 0.4}s ease-in-out ${i * 0.05}s infinite`,
          }}
        />
      ))}
    </div>

    {/* On-air sign */}
    <div className="absolute right-[8%] top-[15%] hidden items-center gap-2 rounded-full border border-primary/40 bg-background/60 px-4 py-1.5 shadow-lg backdrop-blur-sm md:flex rotate-[3deg]">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-destructive" />
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
