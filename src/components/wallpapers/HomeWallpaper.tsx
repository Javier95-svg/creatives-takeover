const orbitPaths = [
  "M -80 250 C 160 110, 420 120, 760 250 S 1320 410, 1600 250",
  "M -120 420 C 140 300, 420 330, 760 430 S 1290 590, 1560 420",
  "M -40 620 C 210 520, 500 560, 820 650 S 1300 790, 1540 650",
];

const floatingTiles = [
  { top: "9%", left: "5%", width: 210, height: 132, rotate: "-10deg" },
  { top: "19%", right: "6%", width: 188, height: 116, rotate: "8deg" },
  { top: "56%", left: "3.5%", width: 170, height: 106, rotate: "9deg" },
  { top: "62%", right: "7%", width: 224, height: 138, rotate: "-8deg" },
];

const HomeWallpaper = () => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-[linear-gradient(180deg,#fbfdff_0%,#f6f9fe_32%,#f3f7fd_68%,#f7f9fc_100%)] dark:bg-[linear-gradient(180deg,#060c16_0%,#08111f_32%,#091525_68%,#08111d_100%)]" />

    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 50% 14%, hsl(var(--primary) / 0.18) 0%, hsl(var(--primary) / 0.08) 18%, transparent 48%)",
      }}
    />

    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 18% 22%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.6) 18%, transparent 42%), radial-gradient(circle at 82% 18%, hsl(var(--accent) / 0.08) 0%, transparent 36%)",
      }}
    />

    <div
      className="absolute inset-x-0 top-0 h-[34rem] opacity-60 dark:opacity-30"
      style={{
        backgroundImage:
          "linear-gradient(to right, hsl(var(--border) / 0.55) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.55) 1px, transparent 1px)",
        backgroundSize: "88px 88px",
        maskImage:
          "linear-gradient(to bottom, rgba(0,0,0,0.78), rgba(0,0,0,0.16), transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, rgba(0,0,0,0.78), rgba(0,0,0,0.16), transparent)",
      }}
    />

    <div className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]">
      <svg className="h-full w-full" viewBox="0 0 1440 980" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="home-orbit-line" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="18%" stopColor="hsl(var(--primary) / 0.12)" />
            <stop offset="50%" stopColor="hsl(var(--primary) / 0.32)" />
            <stop offset="82%" stopColor="hsl(var(--primary) / 0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id="home-orbit-line-soft" x1="0" y1="0" x2="1440" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="28%" stopColor="hsl(var(--accent) / 0.08)" />
            <stop offset="50%" stopColor="hsl(var(--primary) / 0.18)" />
            <stop offset="72%" stopColor="hsl(var(--accent) / 0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {orbitPaths.map((path, index) => (
          <path
            key={path}
            d={path}
            stroke={index === 1 ? "url(#home-orbit-line-soft)" : "url(#home-orbit-line)"}
            strokeWidth={index === 1 ? "1.2" : "1.4"}
            strokeDasharray={index === 1 ? "4 10" : "8 12"}
          />
        ))}

        <circle cx="290" cy="170" r="5" fill="hsl(var(--primary) / 0.35)" />
        <circle cx="1115" cy="195" r="4" fill="hsl(var(--primary) / 0.28)" />
        <circle cx="382" cy="338" r="5" fill="hsl(var(--primary) / 0.24)" />
        <circle cx="1032" cy="516" r="6" fill="hsl(var(--primary) / 0.26)" />
        <circle cx="250" cy="626" r="4" fill="hsl(var(--accent) / 0.22)" />
        <circle cx="1185" cy="710" r="5" fill="hsl(var(--primary) / 0.24)" />
      </svg>
    </div>

    {floatingTiles.map((tile, index) => (
      <div
        key={`${tile.top}-${index}`}
        className="absolute rounded-[28px] border border-white/60 bg-white/55 shadow-[0_18px_40px_rgba(31,41,55,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_18px_40px_rgba(0,0,0,0.32)]"
        style={{
          top: tile.top,
          left: tile.left,
          right: tile.right,
          width: `${tile.width}px`,
          height: `${tile.height}px`,
          transform: `rotate(${tile.rotate})`,
        }}
      >
        <div className="absolute inset-[14px] rounded-[22px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.18)_100%)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_100%)]" />
        <div className="absolute left-[22px] top-[22px] h-[9px] w-[42%] rounded-full bg-primary/12 dark:bg-primary/20" />
        <div className="absolute left-[22px] top-[42px] h-[8px] w-[58%] rounded-full bg-foreground/8 dark:bg-white/10" />
        <div className="absolute left-[22px] top-[60px] h-[8px] w-[36%] rounded-full bg-foreground/8 dark:bg-white/10" />
        <div className="absolute bottom-[22px] right-[22px] h-10 w-10 rounded-2xl bg-primary/10 dark:bg-primary/14" />
      </div>
    ))}

    <div className="absolute left-[18%] top-[18%] h-[26rem] w-[26rem] rounded-full bg-primary/[0.12] blur-[110px] dark:bg-primary/[0.14]" />
    <div className="absolute right-[16%] top-[28%] h-[18rem] w-[18rem] rounded-full bg-accent/[0.08] blur-[90px] dark:bg-accent/[0.1]" />

    <div
      className="absolute inset-x-0 top-0 h-[28rem]"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.54) 0%, rgba(255,255,255,0.12) 46%, transparent 100%)",
      }}
    />

    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, transparent 68%, hsl(var(--background) / 0.82) 88%, hsl(var(--background)) 100%)",
      }}
    />
  </div>
);

export default HomeWallpaper;
