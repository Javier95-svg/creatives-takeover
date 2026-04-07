const HomeWallpaper = () => (
  <>
    <div className="fixed inset-0 -z-10 bg-background" />
    <div
      className="fixed inset-0 -z-10"
      style={{
        backgroundImage: [
          'radial-gradient(circle at top left, hsl(var(--primary) / 0.05), transparent 45%)',
          'radial-gradient(circle at 30% 80%, hsl(var(--accent) / 0.03), transparent 55%)',
        ].join(', '),
      }}
    />
    <div
      className="fixed inset-0 -z-10 opacity-[0.15]"
      style={{
        backgroundImage: [
          'linear-gradient(to right, hsl(var(--border) / 0.6) 1px, transparent 1px)',
          'linear-gradient(to bottom, hsl(var(--border) / 0.6) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '64px 64px',
      }}
    >
    </div>
  </>
);

export default HomeWallpaper;
