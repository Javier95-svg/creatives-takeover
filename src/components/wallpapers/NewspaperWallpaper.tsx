const NewspaperWallpaper = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
    {/* Warm editorial base tint */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(145deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.55) 52%, hsl(var(--background)) 100%)",
      }}
    />

    {/* Strong newspaper columns */}
    <div
      className="absolute inset-0 opacity-65 dark:opacity-35"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to right, transparent 0, transparent 17rem, hsl(var(--border) / 0.95) 17rem, hsl(var(--border) / 0.95) 17.12rem)",
      }}
    />

    {/* Print texture lines */}
    <div
      className="absolute inset-0 opacity-35 dark:opacity-18"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, hsl(var(--foreground) / 0.2) 0, hsl(var(--foreground) / 0.2) 1px, transparent 1px, transparent 8px)",
      }}
    />

    {/* Masthead accent strips */}
    <div
      className="absolute top-[9%] left-[-12%] h-20 w-[62vw] opacity-35 dark:opacity-22"
      style={{
        transform: "rotate(-6deg)",
        background:
          "linear-gradient(90deg, hsl(var(--primary) / 0.55), hsl(var(--accent) / 0.3), transparent)",
      }}
    />
    <div
      className="absolute top-[45%] right-[-14%] h-16 w-[56vw] opacity-35 dark:opacity-22"
      style={{
        transform: "rotate(5deg)",
        background:
          "linear-gradient(270deg, hsl(var(--secondary) / 0.5), hsl(var(--primary) / 0.24), transparent)",
      }}
    />

    {/* Floating headline cards for section uniqueness */}
    <div className="absolute top-[18%] left-[8%] hidden md:block rounded-md border border-border/70 bg-background/70 px-4 py-2 shadow-lg rotate-[-5deg]">
      <span className="text-xs font-semibold tracking-[0.12em] text-foreground/70">FOUNDER EDITION</span>
    </div>
    <div className="absolute top-[62%] right-[10%] hidden md:block rounded-md border border-border/70 bg-background/70 px-4 py-2 shadow-lg rotate-[4deg]">
      <span className="text-xs font-semibold tracking-[0.12em] text-foreground/70">TREND DESK</span>
    </div>

    {/* Grain */}
    <div
      className="absolute inset-0 opacity-25 dark:opacity-14"
      style={{
        backgroundImage:
          "radial-gradient(hsl(var(--foreground) / 0.09) 0.4px, transparent 0.4px)",
        backgroundSize: "2.8px 2.8px",
      }}
    />

    {/* Readability veil */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, hsl(var(--background) / 0.56) 0%, hsl(var(--background) / 0.74) 100%)",
      }}
    />
  </div>
);

export default NewspaperWallpaper;
