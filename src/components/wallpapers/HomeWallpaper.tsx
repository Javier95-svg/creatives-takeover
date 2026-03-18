const HomeWallpaper = () => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-background" />

    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 22%, hsl(var(--primary) / 0.035) 58%, hsl(var(--background)) 100%)",
      }}
    />

    <div
      className="absolute inset-x-0 top-0 h-[42rem]"
      style={{
        background:
          "radial-gradient(ellipse at top center, hsl(var(--primary) / 0.14) 0%, hsl(var(--primary) / 0.08) 24%, transparent 62%)",
      }}
    />

    <div
      className="absolute left-[-10%] top-[8rem] h-[26rem] w-[26rem] rounded-full blur-3xl"
      style={{
        background:
          "radial-gradient(circle, hsl(var(--primary) / 0.11) 0%, hsl(var(--primary) / 0.05) 38%, transparent 72%)",
      }}
    />

    <div
      className="absolute right-[-8%] top-[12rem] h-[22rem] w-[22rem] rounded-full blur-3xl"
      style={{
        background:
          "radial-gradient(circle, hsl(var(--accent) / 0.08) 0%, hsl(var(--accent) / 0.04) 42%, transparent 72%)",
      }}
    />

    <div
      className="absolute inset-x-0 top-0 h-[38rem] opacity-70"
      style={{
        backgroundImage:
          "linear-gradient(to right, hsl(var(--border) / 0.55) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.55) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.22), transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.22), transparent)",
      }}
    />

    <div
      className="absolute inset-0 opacity-[0.22]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.18) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.14), transparent 55%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, rgba(0,0,0,0.14), transparent 55%)",
      }}
    />

    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, transparent 68%, hsl(var(--background) / 0.78) 92%, hsl(var(--background)) 100%)",
      }}
    />

    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at center, transparent 52%, hsl(var(--background) / 0.24) 78%, hsl(var(--background) / 0.5) 100%)",
      }}
    />
  </div>
);

export default HomeWallpaper;
