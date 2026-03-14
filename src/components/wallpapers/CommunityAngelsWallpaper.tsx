const CommunityAngelsWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(250,204,21,0.18),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] dark:bg-[radial-gradient(circle_at_18%_14%,rgba(250,204,21,0.18),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(96,165,250,0.18),transparent_24%),linear-gradient(180deg,rgba(3,7,18,0.97),rgba(10,15,30,0.98))]" />

      <div className="absolute left-[-4rem] top-24 h-72 w-72 rounded-full bg-amber-400/14 blur-3xl dark:bg-amber-500/20" />
      <div className="absolute right-[-7rem] top-16 h-80 w-80 rounded-full bg-blue-400/14 blur-3xl dark:bg-blue-500/22" />
      <div className="absolute bottom-[-8rem] right-1/4 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-500/16" />

      <svg className="absolute inset-0 h-full w-full opacity-80 dark:opacity-95" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="angels-ring" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(250,204,21,0)" />
            <stop offset="50%" stopColor="rgba(250,204,21,0.28)" />
            <stop offset="100%" stopColor="rgba(96,165,250,0)" />
          </linearGradient>
          <linearGradient id="angels-path" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(96,165,250,0)" />
            <stop offset="50%" stopColor="rgba(96,165,250,0.28)" />
            <stop offset="100%" stopColor="rgba(250,204,21,0)" />
          </linearGradient>
        </defs>

        <ellipse cx="720" cy="330" rx="420" ry="180" fill="none" stroke="url(#angels-ring)" strokeWidth="1.6" strokeDasharray="10 18" />
        <ellipse cx="720" cy="330" rx="280" ry="110" fill="none" stroke="url(#angels-ring)" strokeWidth="1.2" strokeDasharray="8 14" />
        <path d="M180 640 Q420 520 660 560 T1260 420" fill="none" stroke="url(#angels-path)" strokeWidth="2.4" strokeDasharray="10 18" />
        <path d="M280 730 Q520 640 760 660 T1180 560" fill="none" stroke="rgba(250,204,21,0.18)" strokeWidth="1.8" strokeDasharray="8 16" />

        <g opacity="0.18" className="dark:opacity-[0.26]">
          <line x1="720" y1="150" x2="720" y2="700" stroke="rgba(148,163,184,0.34)" strokeWidth="1" />
          <line x1="440" y1="330" x2="1000" y2="330" stroke="rgba(148,163,184,0.3)" strokeWidth="1" />
          <line x1="560" y1="235" x2="900" y2="235" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
          <line x1="560" y1="425" x2="900" y2="425" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
        </g>
      </svg>

      {[
        { top: "24%", left: "31%" },
        { top: "17%", left: "49%" },
        { top: "24%", left: "67%" },
        { top: "36%", left: "50%" },
        { top: "58%", left: "27%" },
        { top: "53%", left: "46%" },
        { top: "47%", left: "72%" },
        { top: "67%", left: "64%" },
      ].map((node, index) => (
        <div
          key={`angel-node-${index}`}
          className="absolute h-3 w-3 rounded-full bg-amber-400/80 shadow-[0_0_20px_rgba(250,204,21,0.25)] dark:bg-amber-200 dark:shadow-[0_0_22px_rgba(253,224,71,0.42)]"
          style={{ top: node.top, left: node.left, animation: `pulse 3.4s ease-in-out ${index * 0.28}s infinite` }}
        />
      ))}

      {[
        { top: "18%", left: "11%", width: 182, rotation: "-4deg" },
        { top: "16%", right: "12%", width: 174, rotation: "4deg" },
        { top: "62%", left: "16%", width: 188, rotation: "-3deg" },
      ].map((pill, index) => (
        <div
          key={`angel-pill-${index}`}
          className="absolute rounded-[30px] border border-white/45 bg-white/55 px-6 py-4 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.05]"
          style={{
            top: pill.top,
            left: pill.left,
            right: pill.right,
            width: `${pill.width}px`,
            transform: `rotate(${pill.rotation})`,
            animation: `float 12s ease-in-out ${index * 0.85}s infinite`,
          }}
        >
          <div className="h-2.5 w-20 rounded-full bg-amber-500/28 dark:bg-amber-300/24" />
          <div className="mt-3 flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-500/14 dark:bg-blue-300/16" />
            <div className="h-8 w-14 rounded-full bg-slate-500/12 dark:bg-white/10" />
          </div>
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-background/82 via-background/70 to-background/90 dark:from-background/70 dark:via-background/54 dark:to-background/82" />
    </div>
  );
};

export default CommunityAngelsWallpaper;
