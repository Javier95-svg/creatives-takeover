const AboutWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Elegant gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#030610] via-[#070d1c] to-[#0e1a2e]" />

      {/* Horizon glow */}
      <div className="absolute inset-x-0 top-1/3 h-[420px] bg-gradient-to-b from-[#facc15]/10 via-transparent to-transparent blur-2xl opacity-70" />

      {/* Floating bands */}
      {[
        { top: '18%', left: '12%', width: '28rem', height: '6rem', rotation: '-8deg' },
        { top: '42%', left: '38%', width: '24rem', height: '5rem', rotation: '5deg' },
        { top: '66%', left: '18%', width: '26rem', height: '5.5rem', rotation: '-4deg' }
      ].map((band, index) => (
        <div
          key={`about-band-${index}`}
          className="absolute border border-amber-200/30 bg-gradient-to-r from-amber-100/10 via-transparent to-amber-100/10 opacity-70 rounded-2xl"
          style={{
            top: band.top,
            left: band.left,
            width: band.width,
            height: band.height,
            transform: `rotate(${band.rotation})`,
            animation: 'float 14s ease-in-out infinite',
            animationDelay: `${index * 1.4}s`
          }}
        />
      ))}

      {/* Particle field */}
      {[
        { top: '8%', left: '18%', delay: '0s', opacity: 0.6 },
        { top: '14%', left: '32%', delay: '0.4s', opacity: 0.7 },
        { top: '20%', left: '48%', delay: '0.8s', opacity: 0.5 },
        { top: '12%', left: '68%', delay: '1.2s', opacity: 0.65 },
        { top: '26%', left: '22%', delay: '1.6s', opacity: 0.55 },
        { top: '30%', left: '58%', delay: '2s', opacity: 0.7 },
        { top: '34%', left: '74%', delay: '2.4s', opacity: 0.6 },
        { top: '44%', left: '16%', delay: '2.8s', opacity: 0.55 },
        { top: '46%', left: '38%', delay: '3.2s', opacity: 0.7 },
        { top: '50%', left: '62%', delay: '3.6s', opacity: 0.65 },
        { top: '52%', left: '82%', delay: '4s', opacity: 0.6 },
        { top: '60%', left: '28%', delay: '4.4s', opacity: 0.55 },
        { top: '62%', left: '46%', delay: '4.8s', opacity: 0.7 },
        { top: '68%', left: '68%', delay: '5.2s', opacity: 0.6 },
        { top: '72%', left: '84%', delay: '5.6s', opacity: 0.5 },
        { top: '78%', left: '20%', delay: '6s', opacity: 0.6 },
        { top: '82%', left: '40%', delay: '6.4s', opacity: 0.7 },
        { top: '86%', left: '60%', delay: '6.8s', opacity: 0.55 },
        { top: '88%', left: '76%', delay: '7.2s', opacity: 0.6 },
        { top: '90%', left: '90%', delay: '7.6s', opacity: 0.5 }
      ].map((star, index) => (
        <div
          key={`about-star-${index}`}
          className="absolute w-1 h-1 bg-white/70 rounded-full"
          style={{
            top: star.top,
            left: star.left,
            animation: 'pulse 4s ease-in-out infinite',
            animationDelay: star.delay,
            opacity: star.opacity
          }}
        />
      ))}

      {/* Subtle vertical gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/45 to-background/80" />
    </div>
  );
};

export default AboutWallpaper;

