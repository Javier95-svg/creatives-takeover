import heroImage from "@/assets/hero-bg-animated.jpg";

const AnimatedBackground = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Background image with theme-aware layers. Drawn still: the image used to
          pulse (scale and box-shadow on a full-screen layer) and 25 dots moved on
          endless paths, which repainted the whole screen every frame. With a 4x
          slower CPU /resources idled at 20fps; still, it idles at 60. */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 animate-fade-in" />
      <div className="absolute inset-0 bg-gradient-to-b dark:from-background/80 dark:via-background/60 dark:to-background/80 from-background/90 via-background/95 to-background/90" />
      
      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-primary rounded-full opacity-80" />
      <div className="absolute top-40 right-20 w-6 h-6 bg-secondary rounded-full opacity-60" />
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-accent rounded-full opacity-70" />
      <div className="absolute top-60 left-1/3 w-2 h-2 bg-primary/50 rounded-full" />
      <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-secondary/40 rounded-full" />
      <div className="absolute top-1/3 right-10 w-8 h-8 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full opacity-50" />
      <div className="absolute bottom-1/3 left-10 w-6 h-6 bg-gradient-to-r from-accent/40 to-primary/40 rounded-full opacity-40" />

      {/* Additional floating elements */}
      <div className="absolute top-32 left-1/4 w-3 h-3 bg-primary/60 rounded-full opacity-80" />
      <div className="absolute top-80 right-1/4 w-7 h-7 bg-secondary/30 rounded-full opacity-60" />
      <div className="absolute bottom-32 left-1/2 w-4 h-4 bg-accent/50 rounded-full opacity-70" />
      <div className="absolute top-96 left-16 w-5 h-5 bg-primary/40 rounded-full opacity-50" />
      <div className="absolute bottom-96 right-16 w-2 h-2 bg-secondary/60 rounded-full opacity-80" />
      <div className="absolute top-44 left-3/4 w-6 h-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full opacity-40" />
      <div className="absolute bottom-44 right-3/4 w-3 h-3 bg-gradient-to-tl from-secondary/40 to-primary/40 rounded-full opacity-60" />

      {/* Gradient orbs */}
      <div className="absolute top-24 right-1/3 w-12 h-12 bg-gradient-to-r from-primary/15 to-transparent rounded-full opacity-30 blur-sm" />
      <div className="absolute bottom-24 left-1/3 w-16 h-16 bg-gradient-to-l from-secondary/10 to-transparent rounded-full opacity-25 blur-md" />
      <div className="absolute top-1/2 left-8 w-10 h-10 bg-gradient-to-b from-accent/20 to-transparent rounded-full opacity-35 blur-sm" />
      <div className="absolute top-1/2 right-8 w-14 h-14 bg-gradient-to-t from-primary/12 to-transparent rounded-full opacity-30 blur-md" />

      {/* Tiny particles */}
      <div className="absolute top-16 left-1/2 w-1 h-1 bg-primary/70 rounded-full opacity-90" />
      <div className="absolute bottom-16 right-1/2 w-1 h-1 bg-secondary/80 rounded-full opacity-85" />
      <div className="absolute top-72 left-12 w-2 h-2 bg-accent/60 rounded-full opacity-75" />
      <div className="absolute bottom-72 right-12 w-2 h-2 bg-primary/50 rounded-full opacity-70" />
    </div>
  );
};

export default AnimatedBackground;
