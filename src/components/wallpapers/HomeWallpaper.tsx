const HomeWallpaper = () => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-background" />

    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 38%, hsl(var(--primary) / 0.018) 72%, hsl(var(--background)) 100%)",
      }}
    />

    <div
      className="absolute inset-0 opacity-[0.2] dark:opacity-[0.12]"
      style={{
        background:
          "radial-gradient(ellipse at top center, hsl(var(--foreground) / 0.03) 0%, transparent 58%)",
      }}
    />

    <div
      className="absolute inset-0 opacity-[0.12] dark:opacity-[0.08]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.18) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />

    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(135deg, transparent 0%, hsl(var(--foreground) / 0.012) 50%, transparent 100%)",
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
