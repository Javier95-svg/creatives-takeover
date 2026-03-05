const NewspaperWallpaper = () => (
  <>
    <div className="fixed inset-0 -z-10 bg-background" />

    {/* Editorial tone gradient */}
    <div
      className="fixed inset-0 -z-10"
      style={{
        backgroundImage:
          "linear-gradient(160deg, hsl(var(--background)) 0%, hsl(var(--background)) 35%, hsl(var(--muted) / 0.45) 100%)",
      }}
    />

    {/* Paper grain texture */}
    <div
      className="fixed inset-0 -z-10 opacity-30 dark:opacity-15"
      style={{
        backgroundImage:
          "radial-gradient(hsl(var(--foreground) / 0.08) 0.45px, transparent 0.45px)",
        backgroundSize: "3px 3px",
      }}
    />

    {/* Newspaper column separators */}
    <div
      className="fixed inset-0 -z-10 opacity-35 dark:opacity-20"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to right, transparent 0, transparent 20rem, hsl(var(--border) / 0.9) 20rem, hsl(var(--border) / 0.9) 20.1rem)",
      }}
    />

    {/* Printed text lines impression */}
    <div
      className="fixed inset-0 -z-10 opacity-25 dark:opacity-10"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, hsl(var(--foreground) / 0.22) 0, hsl(var(--foreground) / 0.22) 1px, transparent 1px, transparent 9px)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}
    />

    {/* Editorial highlight bars */}
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div
        className="absolute top-[14%] left-[-12%] h-16 w-[55vw] rounded-sm opacity-20 dark:opacity-15"
        style={{
          background:
            "linear-gradient(90deg, hsl(var(--primary) / 0.45), hsl(var(--accent) / 0.25), transparent)",
          transform: "rotate(-5deg)",
        }}
      />
      <div
        className="absolute top-[52%] right-[-16%] h-14 w-[50vw] rounded-sm opacity-20 dark:opacity-14"
        style={{
          background:
            "linear-gradient(270deg, hsl(var(--secondary) / 0.45), hsl(var(--primary) / 0.2), transparent)",
          transform: "rotate(4deg)",
        }}
      />
    </div>

    {/* Section-unique ambient glow */}
    <div
      className="fixed inset-0 -z-10 opacity-25 dark:opacity-20 animate-[spin_90s_linear_infinite]"
      style={{
        backgroundImage:
          "conic-gradient(from 35deg at 72% 20%, hsl(var(--primary) / 0.2), transparent 35%, hsl(var(--accent) / 0.16) 60%, transparent 80%)",
      }}
    />

    {/* Readability veil */}
    <div
      className="fixed inset-0 -z-10"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, hsl(var(--background) / 0.6) 0%, hsl(var(--background) / 0.78) 100%)",
      }}
    />
  </>
);

export default NewspaperWallpaper;
