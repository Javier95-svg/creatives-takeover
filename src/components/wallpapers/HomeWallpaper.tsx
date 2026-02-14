const HomeWallpaper = () => (
  <>
    <div className="fixed inset-0 -z-10 bg-background" />
    <div
      className="fixed inset-0 -z-10"
      style={{
        backgroundImage:
          "radial-gradient(60% 70% at 10% 0%, hsl(var(--primary) / 0.16), transparent 60%), radial-gradient(45% 50% at 92% 8%, hsl(var(--accent) / 0.1), transparent 65%), radial-gradient(40% 55% at 60% 95%, hsl(var(--primary) / 0.08), transparent 75%)",
      }}
    />
    <div
      className="fixed inset-0 -z-10 opacity-35"
      style={{
        backgroundImage:
          "linear-gradient(to right, hsl(var(--border) / 0.45) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.45) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
      }}
    />
    <div
      className="fixed inset-0 -z-10 opacity-[0.04]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }}
    />
  </>
);

export default HomeWallpaper;
