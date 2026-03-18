type HomeWallpaperProps = {
  variant?: "default" | "home";
};

const HomeWallpaper = ({ variant = "default" }: HomeWallpaperProps) => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-background" />

    {variant === "home" ? (
      <>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 32%, hsl(var(--primary) / 0.042) 70%, hsl(var(--background)) 100%)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.6] dark:opacity-[0.4]"
          style={{
            background:
              "radial-gradient(ellipse at top center, hsl(var(--primary) / 0.09) 0%, transparent 54%), radial-gradient(circle at 16% 22%, hsl(var(--foreground) / 0.038) 0%, transparent 34%), radial-gradient(circle at 82% 18%, hsl(var(--primary) / 0.045) 0%, transparent 28%)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.34] dark:opacity-[0.18]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(118deg, hsl(var(--foreground) / 0.05) 0 1px, transparent 1px 22px), repeating-linear-gradient(28deg, hsl(var(--foreground) / 0.028) 0 1px, transparent 1px 30px)",
            maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.8) 52%, rgba(0,0,0,0.28) 100%)",
            WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.8) 52%, rgba(0,0,0,0.28) 100%)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.22] dark:opacity-[0.14]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.16) 0.8px, transparent 0.9px)",
            backgroundSize: "20px 20px",
            maskImage: "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.08) 100%)",
            WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.08) 100%)",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(126deg, transparent 0%, hsl(var(--foreground) / 0.025) 44%, transparent 70%), linear-gradient(180deg, transparent 0%, transparent 78%, hsl(var(--background) / 0.46) 100%)",
          }}
        />
      </>
    ) : (
      <>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 34%, hsl(var(--primary) / 0.028) 72%, hsl(var(--background)) 100%)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.26] dark:opacity-[0.16]"
          style={{
            background:
              "radial-gradient(ellipse at top center, hsl(var(--foreground) / 0.045) 0%, transparent 58%)",
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.18] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.22) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, transparent 0%, hsl(var(--foreground) / 0.018) 50%, transparent 100%)",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--background) / 0.02) 0%, transparent 22%, transparent 78%, hsl(var(--background) / 0.24) 100%)",
          }}
        />
      </>
    )}
  </div>
);

export default HomeWallpaper;
