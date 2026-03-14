const CommunityCofoundersWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(249,115,22,0.16),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(20,184,166,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))] dark:bg-[radial-gradient(circle_at_18%_16%,rgba(251,146,60,0.18),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(45,212,191,0.18),transparent_24%),linear-gradient(180deg,rgba(9,9,11,0.96),rgba(15,23,42,0.98))]" />

      <div className="absolute left-[-6rem] top-28 h-72 w-72 rounded-full bg-orange-400/15 blur-3xl dark:bg-orange-500/20" />
      <div className="absolute right-[-8rem] top-24 h-80 w-80 rounded-full bg-teal-400/15 blur-3xl dark:bg-teal-500/22" />
      <div className="absolute bottom-[-8rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-violet-400/10 blur-3xl dark:bg-violet-500/16" />

      <svg className="absolute inset-0 h-full w-full opacity-75 dark:opacity-90" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cofounder-arc-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(249,115,22,0)" />
            <stop offset="52%" stopColor="rgba(249,115,22,0.32)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id="cofounder-arc-right" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(45,212,191,0)" />
            <stop offset="52%" stopColor="rgba(45,212,191,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <path d="M120 210 Q360 120 560 280 T720 460" fill="none" stroke="url(#cofounder-arc-left)" strokeWidth="3" strokeDasharray="12 18" />
        <path d="M1320 210 Q1080 120 880 280 T720 460" fill="none" stroke="url(#cofounder-arc-right)" strokeWidth="3" strokeDasharray="12 18" />
        <path d="M220 700 Q430 570 620 620 T980 620 Q1130 620 1240 700" fill="none" stroke="rgba(168,85,247,0.18)" strokeWidth="2.2" strokeDasharray="10 16" />

        <g opacity="0.18" className="dark:opacity-[0.24]">
          <line x1="290" y1="170" x2="470" y2="340" stroke="rgba(148,163,184,0.38)" strokeWidth="1" />
          <line x1="1150" y1="170" x2="970" y2="340" stroke="rgba(148,163,184,0.38)" strokeWidth="1" />
          <line x1="400" y1="640" x2="610" y2="560" stroke="rgba(148,163,184,0.38)" strokeWidth="1" />
          <line x1="1040" y1="640" x2="830" y2="560" stroke="rgba(148,163,184,0.38)" strokeWidth="1" />
        </g>
      </svg>

      {[
        { top: "19%", left: "21%", color: "bg-orange-500/60 dark:bg-orange-300" },
        { top: "28%", left: "34%", color: "bg-orange-500/40 dark:bg-orange-300/90" },
        { top: "30%", left: "66%", color: "bg-teal-500/50 dark:bg-teal-300" },
        { top: "19%", left: "79%", color: "bg-teal-500/60 dark:bg-teal-300" },
        { top: "49%", left: "49.5%", color: "bg-violet-500/60 dark:bg-violet-300" },
        { top: "67%", left: "33%", color: "bg-violet-500/40 dark:bg-violet-300/90" },
        { top: "67%", left: "67%", color: "bg-violet-500/40 dark:bg-violet-300/90" },
      ].map((node, index) => (
        <div
          key={`cofounder-node-${index}`}
          className={`absolute h-3 w-3 rounded-full shadow-[0_0_18px_rgba(255,255,255,0.12)] ${node.color}`}
          style={{ top: node.top, left: node.left, animation: `pulse 3s ease-in-out ${index * 0.3}s infinite` }}
        />
      ))}

      {[
        { top: "21%", left: "10%", width: 180, rotation: "-5deg" },
        { top: "20%", right: "10%", width: 180, rotation: "5deg" },
        { top: "62%", left: "41%", width: 250, rotation: "0deg" },
      ].map((card, index) => (
        <div
          key={`cofounder-card-${index}`}
          className="absolute rounded-[30px] border border-white/45 bg-white/50 px-6 py-5 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.05]"
          style={{
            top: card.top,
            left: card.left,
            right: card.right,
            width: `${card.width}px`,
            transform: `rotate(${card.rotation})`,
            animation: `float 12s ease-in-out ${index * 0.7}s infinite`,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-orange-500/18 dark:bg-orange-300/18" />
            <div className="h-10 w-10 rounded-2xl bg-teal-500/18 dark:bg-teal-300/18" />
          </div>
          <div className="mt-4 h-2.5 w-24 rounded-full bg-slate-500/15 dark:bg-white/10" />
          <div className="mt-2 h-2 w-20 rounded-full bg-slate-500/15 dark:bg-white/10" />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-background/82 via-background/70 to-background/90 dark:from-background/70 dark:via-background/54 dark:to-background/82" />
    </div>
  );
};

export default CommunityCofoundersWallpaper;
