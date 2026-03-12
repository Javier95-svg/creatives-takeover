const WaitlistMakerWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 14%, hsl(var(--blue-primary) / 0.3), transparent 44%), radial-gradient(circle at 86% 18%, hsl(var(--green-primary) / 0.24), transparent 46%), radial-gradient(circle at 76% 84%, hsl(var(--red-primary) / 0.18), transparent 42%), linear-gradient(140deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.88) 55%, hsl(var(--background)) 100%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.2]"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--border) / 0.75) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.75) 1px, transparent 1px)',
          backgroundSize: '58px 58px',
        }}
      />

      <div
        className="absolute inset-x-[-12%] top-[18%] h-[32rem] bg-gradient-to-r from-transparent via-white/30 to-transparent blur-3xl dark:via-white/10"
        style={{ transform: 'rotate(-10deg)' }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-background/45 via-background/20 to-background/70" />
    </div>
  );
};

export default WaitlistMakerWallpaper;
