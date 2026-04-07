const HomeWallpaper = () => (
  <>
    <div className="fixed inset-0 -z-10 bg-background" />
    <div
      className="fixed inset-0 -z-10"
      style={{
        backgroundImage: [
          'radial-gradient(circle at 50% -12%, hsl(var(--primary) / 0.13), transparent 34%)',
          'radial-gradient(circle at 100% 0%, hsl(var(--primary) / 0.05), transparent 26%)',
          'radial-gradient(circle at 0% 100%, hsl(var(--foreground) / 0.025), transparent 28%)',
          'linear-gradient(180deg, hsl(var(--background)), hsl(220 24% 97%))',
        ].join(', '),
      }}
    />
    <div
      className="fixed inset-0 -z-10 opacity-90"
      style={{
        backgroundImage: 'linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.022) 28%, transparent 58%, hsl(var(--primary) / 0.028) 100%)',
      }}
    >
    </div>
  </>
);

export default HomeWallpaper;
