const DemoStudioWallpaper = () => {
  const storyboardFrames = [
    { top: '11%', left: '6%', width: '11rem', height: '7rem', opacity: 0.34 },
    { top: '29%', left: '3%', width: '14rem', height: '8rem', opacity: 0.28 },
    { top: '51%', left: '8%', width: '10rem', height: '6.5rem', opacity: 0.24 },
  ];

  const timelineBars = [
    { left: '9%', width: '13%', color: 'rgba(56, 189, 248, 0.46)' },
    { left: '25%', width: '8%', color: 'rgba(244, 114, 182, 0.4)' },
    { left: '37%', width: '16%', color: 'rgba(34, 197, 94, 0.38)' },
    { left: '57%', width: '10%', color: 'rgba(250, 204, 21, 0.36)' },
    { left: '71%', width: '17%', color: 'rgba(99, 102, 241, 0.42)' },
  ];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'linear-gradient(115deg, rgba(8, 47, 73, 0.24) 0%, transparent 36%), linear-gradient(245deg, rgba(63, 63, 70, 0.26) 0%, transparent 42%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background) / 0.82) 48%, hsl(var(--background)) 100%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--border) / 0.9) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.9) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            'linear-gradient(120deg, transparent 0 46%, rgba(255,255,255,0.34) 46% 46.35%, transparent 46.35% 100%), linear-gradient(120deg, transparent 0 60%, rgba(255,255,255,0.22) 60% 60.28%, transparent 60.28% 100%)',
          backgroundSize: '320px 320px, 460px 460px',
        }}
      />

      {/* Storyboard strip */}
      <div className="absolute left-0 top-0 hidden h-full w-[23rem] md:block">
        {storyboardFrames.map((frame, index) => (
          <div
            key={index}
            className="absolute rounded-2xl border border-white/[0.18] bg-background/[0.35] shadow-2xl backdrop-blur-sm"
            style={{
              top: frame.top,
              left: frame.left,
              width: frame.width,
              height: frame.height,
              opacity: frame.opacity,
              transform: `rotate(${index === 1 ? -4 : 3}deg)`,
            }}
          >
            <div className="absolute left-3 right-3 top-3 h-2 rounded-full bg-white/[0.18]" />
            <div className="absolute left-3 top-7 h-10 w-16 rounded-lg border border-white/[0.14] bg-white/10" />
            <div className="absolute bottom-3 left-3 h-2 w-20 rounded-full bg-sky-300/[0.45]" />
            <div className="absolute bottom-3 right-3 h-2 w-12 rounded-full bg-emerald-300/[0.35]" />
          </div>
        ))}
      </div>

      {/* Main demo playback surface */}
      <div className="absolute left-1/2 top-[8%] hidden h-[28rem] w-[44rem] -translate-x-1/2 rotate-[-2deg] rounded-5xl border border-white/[0.16] bg-background/[0.28] shadow-[0_30px_110px_rgba(0,0,0,0.32)] backdrop-blur-sm lg:block">
        <div className="absolute inset-x-0 top-0 h-12 rounded-t-[2rem] border-b border-white/[0.12] bg-white/[0.08]" />
        <div className="absolute left-6 top-5 h-2 w-2 rounded-full bg-red-400/80" />
        <div className="absolute left-11 top-5 h-2 w-2 rounded-full bg-yellow-300/80" />
        <div className="absolute left-16 top-5 h-2 w-2 rounded-full bg-emerald-300/80" />
        <div className="absolute left-7 right-7 top-20 h-44 rounded-2xl border border-white/[0.12] bg-white/[0.07]" />
        <div className="absolute left-12 top-28 h-20 w-32 rounded-xl border border-sky-300/20 bg-sky-300/10" />
        <div className="absolute right-16 top-28 h-5 w-28 rounded-full bg-white/[0.18]" />
        <div className="absolute right-16 top-40 h-3 w-40 rounded-full bg-white/10" />
        <div className="absolute right-16 top-[12.5rem] h-3 w-32 rounded-full bg-white/10" />

        <div className="absolute left-[39%] top-[38%] h-8 w-8 rounded-full border border-sky-300/70 bg-sky-300/15 shadow-[0_0_0_12px_rgba(56,189,248,0.08)]" />
        <div className="absolute right-[18%] top-[50%] h-7 w-7 rounded-full border border-emerald-300/[0.65] bg-emerald-300/15 shadow-[0_0_0_10px_rgba(34,197,94,0.08)]" />
        <div className="absolute bottom-9 left-7 right-7 h-12 rounded-2xl border border-white/10 bg-black/20">
          <div className="absolute left-5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-white/40" />
          {timelineBars.map((bar, index) => (
            <div
              key={index}
              className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
              style={{ left: bar.left, width: bar.width, backgroundColor: bar.color }}
            />
          ))}
        </div>
      </div>

      {/* Recording and launch column */}
      <div className="absolute right-[-1rem] top-[15%] hidden h-[30rem] w-[20rem] rotate-[5deg] rounded-5xl border border-white/[0.14] bg-background/30 shadow-2xl backdrop-blur-sm md:block">
        <div className="absolute left-6 right-6 top-6 h-36 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10" />
        <div className="absolute left-12 top-12 h-14 w-14 rounded-full border border-white/[0.22] bg-white/10" />
        <div className="absolute right-12 top-14 h-3 w-16 rounded-full bg-red-400/[0.55]" />
        <div className="absolute left-6 right-6 top-48 h-3 rounded-full bg-white/[0.12]" />
        <div className="absolute left-6 right-14 top-60 h-3 rounded-full bg-white/10" />
        <div className="absolute bottom-24 left-6 h-14 w-24 rounded-xl border border-emerald-300/20 bg-emerald-300/10" />
        <div className="absolute bottom-24 right-6 h-14 w-24 rounded-xl border border-sky-300/20 bg-sky-300/10" />
        <div className="absolute bottom-8 left-6 right-6 h-8 rounded-full bg-white/10" />
      </div>

      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-background via-background/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background via-background/[0.82] to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/[0.68] via-background/30 to-background/[0.72]" />
    </div>
  );
};

export default DemoStudioWallpaper;
