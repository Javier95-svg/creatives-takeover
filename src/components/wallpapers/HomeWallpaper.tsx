const HomeWallpaper = () => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-background" />

    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 34%, hsl(var(--primary) / 0.028) 72%, hsl(var(--background)) 100%)",
      }}
    />

    <div
      className="absolute inset-0 opacity-[0.26] dark:opacity-[0.16]"
      style={{
        background:
          "radial-gradient(ellipse at top center, hsl(var(--foreground) / 0.045) 0%, transparent 58%)",
      }}
    />

    <div
      className="absolute inset-0 opacity-[0.18] dark:opacity-[0.12]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.22) 1px, transparent 1px)",
        backgroundSize: "26px 26px",
      }}
    />

    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(135deg, transparent 0%, hsl(var(--foreground) / 0.018) 50%, transparent 100%)",
      }}
    />

    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--background) / 0.02) 0%, transparent 22%, transparent 78%, hsl(var(--background) / 0.24) 100%)",
      }}
    />
  </div>
);

export default HomeWallpaper;
