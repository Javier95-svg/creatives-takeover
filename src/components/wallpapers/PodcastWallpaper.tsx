// Podcast section wallpaper — its own identity: a dark "on-air studio" mood with a
// stage spotlight, concentric sound waves, and a faint equalizer baseline. Distinct
// from the editorial Newspaper wallpaper while using the same theme tokens.

const EQ_BARS = Array.from({ length: 48 });

const PodcastWallpaper = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    {/* Deep studio base */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(120% 80% at 50% -10%, hsl(var(--primary) / 0.22) 0%, transparent 55%), linear-gradient(160deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.45) 60%, hsl(var(--background)) 100%)",
      }}
    />

    {/* Stage spotlight cone from the top */}
    <div
      className="absolute -top-[18%] left-1/2 h-[70vh] w-[78vw] -translate-x-1/2 opacity-70 dark:opacity-50"
      style={{
        background:
          "radial-gradient(closest-side, hsl(var(--accent) / 0.28), hsl(var(--primary) / 0.12) 45%, transparent 72%)",
        filter: "blur(6px)",
      }}
    />

    {/* Concentric sound rings (left) */}
    <div className="absolute -left-[12vw] top-[28%] hidden md:block opacity-40 dark:opacity-30">
      {[14, 22, 30, 38].map((r) => (
        <div
          key={r}
          className="absolute rounded-full border"
          style={{
            width: `${r}vw`,
            height: `${r}vw`,
            left: `${-r / 2}vw`,
            top: `${-r / 2}vw`,
            borderColor: "hsl(var(--primary) / 0.35)",
          }}
        />
      ))}
    </div>

    {/* Concentric sound rings (right) */}
    <div className="absolute -right-[10vw] top-[58%] hidden lg:block opacity-35 dark:opacity-25">
      {[12, 20, 28].map((r) => (
        <div
          key={r}
          className="absolute rounded-full border"
          style={{
            width: `${r}vw`,
            height: `${r}vw`,
            left: `${-r / 2}vw`,
            top: `${-r / 2}vw`,
            borderColor: "hsl(var(--secondary) / 0.4)",
          }}
        />
      ))}
    </div>

    {/* Equalizer baseline */}
    <div className="absolute inset-x-0 bottom-0 flex h-[26vh] items-end justify-center gap-[0.6vw] px-6 opacity-50 dark:opacity-35">
      {EQ_BARS.map((_, i) => {
        // Deterministic pseudo-random heights so the baseline looks organic.
        const h = 18 + (Math.sin(i * 1.7) * 0.5 + 0.5) * 70;
        return (
          <div
            key={i}
            className="w-[0.7vw] max-w-[10px] rounded-t-full"
            style={{
              height: `${h}%`,
              background:
                "linear-gradient(to top, hsl(var(--primary) / 0.5), hsl(var(--accent) / 0.25) 70%, transparent)",
            }}
          />
        );
      })}
    </div>

    {/* On-air badge accents */}
    <div className="absolute top-[16%] right-[9%] hidden md:block rounded-full border border-primary/40 bg-background/70 px-4 py-1.5 shadow-lg rotate-[3deg]">
      <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-foreground/70">
        <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
        ON AIR
      </span>
    </div>
    <div className="absolute top-[70%] left-[7%] hidden md:block rounded-md border border-border/70 bg-background/70 px-4 py-2 shadow-lg rotate-[-4deg]">
      <span className="text-xs font-semibold tracking-[0.12em] text-foreground/70">EPISODE LOG</span>
    </div>

    {/* Grain */}
    <div
      className="absolute inset-0 opacity-25 dark:opacity-14"
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
          "linear-gradient(to bottom, hsl(var(--background) / 0.5) 0%, hsl(var(--background) / 0.72) 100%)",
      }}
    />
  </div>
);

export default PodcastWallpaper;
