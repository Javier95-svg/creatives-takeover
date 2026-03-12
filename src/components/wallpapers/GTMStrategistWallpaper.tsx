const GTMStrategistWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-background" />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 18%, rgba(14, 165, 233, 0.24), transparent 46%), radial-gradient(circle at 86% 16%, rgba(34, 197, 94, 0.22), transparent 48%), radial-gradient(circle at 72% 78%, rgba(250, 204, 21, 0.18), transparent 44%), radial-gradient(circle at 24% 82%, rgba(6, 182, 212, 0.16), transparent 42%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--border) / 0.7) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.7) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/45 to-background/80" />
    </div>
  );
};

export default GTMStrategistWallpaper;
