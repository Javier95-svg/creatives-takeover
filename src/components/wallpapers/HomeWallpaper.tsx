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
  </>
);

export default HomeWallpaper;
