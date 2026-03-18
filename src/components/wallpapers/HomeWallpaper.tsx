const HomeWallpaper = () => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-background" />

    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 18%, hsl(var(--primary) / 0.03) 52%, hsl(var(--background)) 100%)",
      }}
    />

    <div
      className="absolute inset-x-0 top-0 h-[36rem]"
      style={{
        background:
          "radial-gradient(ellipse at top center, hsl(var(--primary) / 0.14) 0%, hsl(var(--primary) / 0.07) 24%, transparent 64%)",
      }}
    />

    <div
      className="absolute left-[-8%] top-[6rem] h-[24rem] w-[24rem] rounded-full blur-3xl"
      style={{
        background:
          "radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, hsl(var(--primary) / 0.04) 42%, transparent 74%)",
      }}
    />

    <div
      className="absolute right-[-6%] top-[11rem] h-[20rem] w-[20rem] rounded-full blur-3xl"
      style={{
        background:
          "radial-gradient(circle, hsl(var(--accent) / 0.07) 0%, hsl(var(--accent) / 0.03) 44%, transparent 72%)",
      }}
    />

    <div
      className="absolute inset-x-0 top-0 h-[34rem] opacity-70"
      style={{
        backgroundImage:
          "linear-gradient(to right, hsl(var(--border) / 0.45) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.45) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage:
          "linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.24), transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.24), transparent)",
      }}
    />

    <div
      className="absolute inset-0 opacity-[0.14]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.24) 1px, transparent 1px)",
        backgroundSize: "26px 26px",
        maskImage:
          "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.06), transparent 62%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.06), transparent 62%)",
      }}
    />

    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, transparent 70%, hsl(var(--background) / 0.86) 92%, hsl(var(--background)) 100%)",
      }}
    />
  </div>
);

export default HomeWallpaper;
