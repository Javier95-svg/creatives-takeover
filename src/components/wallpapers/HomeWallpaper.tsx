const HomeWallpaper = () => (
  <>
    <div className="fixed inset-0 -z-10 bg-background" />
    <div
      className="fixed inset-0 -z-10"
      style={{
        backgroundImage:
          'radial-gradient(circle at top left, hsl(var(--primary) / 0.12), transparent 45%), radial-gradient(circle at 30% 80%, hsl(var(--accent) / 0.08), transparent 55%)',
      }}
    />
    <div
      className="fixed inset-0 -z-10 opacity-50"
      style={{
        backgroundImage:
          'linear-gradient(to right, hsl(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.6) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    >
    </div>
  </>
);

export default HomeWallpaper;
