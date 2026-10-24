/**
 * The dashboard wallpaper: two faint brand glows over a 64px grid. Shared by
 * the /dashboard tabs (DashboardShell) and the tool pages (DashboardLayout).
 */
export function DashboardBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, hsl(var(--primary) / 0.08), transparent 40%), radial-gradient(circle at 85% 30%, hsl(var(--accent) / 0.06), transparent 45%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  );
}

export default DashboardBackground;
