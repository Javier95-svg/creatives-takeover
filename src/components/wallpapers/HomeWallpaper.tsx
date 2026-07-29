import "./home-wallpaper.css";

type HomeWallpaperProps = {
  variant?: "default" | "landing";
};

const HomeWallpaper = ({ variant = "default" }: HomeWallpaperProps) => {
  if (variant === "landing") {
    return (
      <div
        aria-hidden="true"
        className="home-wallpaper home-wallpaper--landing fixed inset-0 -z-10 pointer-events-none"
      >
        <div className="home-wallpaper__mesh" />
      </div>
    );
  }

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 -z-10 bg-background pointer-events-none" />
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at top left, hsl(var(--primary) / 0.12), transparent 45%), radial-gradient(circle at 30% 80%, hsl(var(--accent) / 0.08), transparent 55%)",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 opacity-50 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </>
  );
};

export default HomeWallpaper;
