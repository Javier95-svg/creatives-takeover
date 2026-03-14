const CommunityMentorsWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(16,185,129,0.14),transparent_26%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.94))] dark:bg-[radial-gradient(circle_at_16%_18%,rgba(56,189,248,0.2),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(52,211,153,0.14),transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.97),rgba(8,15,32,0.98))]" />

      <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl dark:bg-sky-500/20" />
      <div className="absolute right-[-8rem] top-20 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/20" />
      <div className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-500/16" />

      <svg className="absolute inset-0 h-full w-full opacity-70 dark:opacity-90" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="mentors-path" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(14,165,233,0)" />
            <stop offset="50%" stopColor="rgba(14,165,233,0.24)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0)" />
          </linearGradient>
          <linearGradient id="mentors-grid" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(148,163,184,0)" />
            <stop offset="50%" stopColor="rgba(148,163,184,0.18)" />
            <stop offset="100%" stopColor="rgba(148,163,184,0)" />
          </linearGradient>
        </defs>

        <g opacity="0.35">
          <path d="M120 170 Q340 80 520 180 T900 240 T1280 170" fill="none" stroke="url(#mentors-path)" strokeWidth="2.4" strokeDasharray="8 20" />
          <path d="M180 520 Q420 400 660 520 T1140 500" fill="none" stroke="url(#mentors-path)" strokeWidth="2" strokeDasharray="10 18" />
          <path d="M230 760 Q520 620 820 700 T1300 620" fill="none" stroke="url(#mentors-path)" strokeWidth="2.2" strokeDasharray="14 20" />
        </g>

        <g opacity="0.16" className="dark:opacity-[0.22]">
          <line x1="220" y1="120" x2="220" y2="760" stroke="url(#mentors-grid)" strokeWidth="1" />
          <line x1="520" y1="80" x2="520" y2="820" stroke="url(#mentors-grid)" strokeWidth="1" />
          <line x1="860" y1="60" x2="860" y2="800" stroke="url(#mentors-grid)" strokeWidth="1" />
          <line x1="1160" y1="120" x2="1160" y2="760" stroke="url(#mentors-grid)" strokeWidth="1" />
          <line x1="120" y1="240" x2="1320" y2="240" stroke="url(#mentors-grid)" strokeWidth="1" />
          <line x1="80" y1="520" x2="1360" y2="520" stroke="url(#mentors-grid)" strokeWidth="1" />
          <line x1="140" y1="740" x2="1300" y2="740" stroke="url(#mentors-grid)" strokeWidth="1" />
        </g>
      </svg>

      {[
        { top: "18%", left: "18%" },
        { top: "28%", left: "37%" },
        { top: "22%", left: "63%" },
        { top: "46%", left: "27%" },
        { top: "54%", left: "55%" },
        { top: "42%", left: "77%" },
        { top: "73%", left: "33%" },
        { top: "68%", left: "60%" },
      ].map((node, index) => (
        <div
          key={`mentor-node-${index}`}
          className="absolute h-3 w-3 rounded-full bg-sky-500/60 shadow-[0_0_18px_rgba(14,165,233,0.28)] dark:bg-sky-300 dark:shadow-[0_0_22px_rgba(56,189,248,0.45)]"
          style={{ top: node.top, left: node.left, animation: `pulse 3.2s ease-in-out ${index * 0.25}s infinite` }}
        />
      ))}

      {[
        { top: "14%", left: "12%", width: 168, rotation: "-6deg" },
        { top: "32%", left: "72%", width: 176, rotation: "5deg" },
        { top: "62%", left: "18%", width: 182, rotation: "-3deg" },
      ].map((panel, index) => (
        <div
          key={`mentor-panel-${index}`}
          className="absolute rounded-[28px] border border-white/40 bg-white/45 px-6 py-5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.05]"
          style={{
            top: panel.top,
            left: panel.left,
            width: `${panel.width}px`,
            transform: `rotate(${panel.rotation})`,
            animation: `float 11s ease-in-out ${index * 0.8}s infinite`,
          }}
        >
          <div className="h-2.5 w-16 rounded-full bg-sky-500/30 dark:bg-sky-300/30" />
          <div className="mt-3 h-2 w-24 rounded-full bg-slate-500/15 dark:bg-white/10" />
          <div className="mt-2 h-2 w-20 rounded-full bg-slate-500/15 dark:bg-white/10" />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-background/84 via-background/72 to-background/90 dark:from-background/72 dark:via-background/56 dark:to-background/82" />
    </div>
  );
};

export default CommunityMentorsWallpaper;
