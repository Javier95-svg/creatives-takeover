const networkNodes = [
  { top: "13%", left: "18%", size: 10, hue: "amber", delay: "0s" },
  { top: "18%", left: "46%", size: 12, hue: "blue", delay: "0.4s" },
  { top: "15%", left: "74%", size: 9, hue: "sky", delay: "0.8s" },
  { top: "28%", left: "31%", size: 14, hue: "amber", delay: "1.1s" },
  { top: "34%", left: "57%", size: 11, hue: "blue", delay: "1.4s" },
  { top: "42%", left: "79%", size: 10, hue: "amber", delay: "1.7s" },
  { top: "52%", left: "22%", size: 12, hue: "sky", delay: "2s" },
  { top: "57%", left: "47%", size: 15, hue: "amber", delay: "2.3s" },
  { top: "64%", left: "67%", size: 11, hue: "blue", delay: "2.6s" },
  { top: "74%", left: "36%", size: 9, hue: "amber", delay: "2.9s" },
  { top: "78%", left: "83%", size: 13, hue: "sky", delay: "3.2s" },
];

const floatingPanels = [
  {
    top: "12%",
    left: "8%",
    width: 188,
    rotate: "-6deg",
    delay: "0s",
    labelWidth: "w-24",
    bars: ["w-12", "w-20"],
  },
  {
    top: "14%",
    right: "9%",
    width: 176,
    rotate: "5deg",
    delay: "0.9s",
    labelWidth: "w-20",
    bars: ["w-10", "w-16"],
  },
  {
    top: "54%",
    left: "10%",
    width: 210,
    rotate: "-4deg",
    delay: "1.5s",
    labelWidth: "w-28",
    bars: ["w-14", "w-24"],
  },
  {
    top: "61%",
    right: "11%",
    width: 194,
    rotate: "4deg",
    delay: "2.1s",
    labelWidth: "w-24",
    bars: ["w-16", "w-12"],
  },
];

const nodeColorMap = {
  amber: {
    className: "bg-amber-400/85 dark:bg-amber-200",
    glow: "0 0 0 8px rgba(251, 191, 36, 0.10), 0 0 28px rgba(245, 158, 11, 0.36)",
  },
  blue: {
    className: "bg-blue-500/85 dark:bg-blue-300",
    glow: "0 0 0 8px rgba(59, 130, 246, 0.10), 0 0 28px rgba(59, 130, 246, 0.34)",
  },
  sky: {
    className: "bg-sky-400/85 dark:bg-sky-300",
    glow: "0 0 0 8px rgba(56, 189, 248, 0.10), 0 0 28px rgba(14, 165, 233, 0.34)",
  },
} as const;

const CommunityAngelsWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(252,253,255,0.98)_0%,rgba(242,247,255,0.95)_36%,rgba(249,250,252,0.98)_100%)] dark:bg-[linear-gradient(180deg,rgba(5,10,24,0.98)_0%,rgba(8,14,30,0.97)_42%,rgba(7,10,20,0.99)_100%)]" />

      <div className="absolute inset-0 opacity-60 dark:opacity-70" style={{ backgroundImage: "radial-gradient(circle at 18% 16%, rgba(245, 158, 11, 0.16), transparent 24%), radial-gradient(circle at 76% 12%, rgba(59, 130, 246, 0.18), transparent 28%), radial-gradient(circle at 52% 42%, rgba(56, 189, 248, 0.10), transparent 22%), radial-gradient(circle at 24% 76%, rgba(245, 158, 11, 0.10), transparent 18%), radial-gradient(circle at 84% 70%, rgba(59, 130, 246, 0.12), transparent 20%)" }} />

      <div className="absolute inset-0 opacity-[0.32] dark:opacity-[0.14]" style={{ backgroundImage: "linear-gradient(to right, rgba(148, 163, 184, 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.22) 1px, transparent 1px)", backgroundSize: "58px 58px", maskImage: "radial-gradient(circle at center, black 42%, transparent 100%)" }} />

      <div className="absolute left-[-8rem] top-[-4rem] h-[26rem] w-[26rem] rounded-full bg-amber-300/18 blur-3xl dark:bg-amber-500/14" />
      <div className="absolute right-[-10rem] top-[-3rem] h-[30rem] w-[30rem] rounded-full bg-blue-300/20 blur-3xl dark:bg-blue-500/16" />
      <div className="absolute left-[18%] top-[22%] h-[18rem] w-[18rem] rounded-full bg-white/45 blur-3xl dark:bg-sky-400/8" />
      <div className="absolute bottom-[-8rem] left-[30%] h-[24rem] w-[24rem] rounded-full bg-sky-300/14 blur-3xl dark:bg-sky-500/12" />

      <svg className="absolute inset-0 h-full w-full opacity-90 dark:opacity-100" viewBox="0 0 1440 1100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="angel-signal-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(245, 158, 11, 0)" />
            <stop offset="42%" stopColor="rgba(245, 158, 11, 0.28)" />
            <stop offset="72%" stopColor="rgba(59, 130, 246, 0.32)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
          <linearGradient id="angel-orbit-line" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(125, 211, 252, 0)" />
            <stop offset="45%" stopColor="rgba(125, 211, 252, 0.22)" />
            <stop offset="100%" stopColor="rgba(245, 158, 11, 0)" />
          </linearGradient>
          <radialGradient id="angel-focus" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.76)" />
            <stop offset="45%" stopColor="rgba(255, 255, 255, 0.18)" />
            <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </radialGradient>
        </defs>

        <ellipse cx="780" cy="290" rx="420" ry="148" fill="none" stroke="url(#angel-orbit-line)" strokeWidth="1.4" strokeDasharray="14 18" />
        <ellipse cx="790" cy="300" rx="285" ry="92" fill="none" stroke="url(#angel-signal-line)" strokeWidth="1.2" strokeDasharray="8 14" />
        <path d="M110 654 C278 550, 404 482, 595 512 S950 624, 1330 452" fill="none" stroke="url(#angel-signal-line)" strokeWidth="2.2" strokeDasharray="12 18" />
        <path d="M180 816 C388 694, 534 684, 714 726 S1020 790, 1295 610" fill="none" stroke="url(#angel-orbit-line)" strokeWidth="1.7" strokeDasharray="10 16" />
        <path d="M312 214 C454 270, 576 316, 723 282 S1014 172, 1172 244" fill="none" stroke="rgba(148, 163, 184, 0.18)" strokeWidth="1.3" strokeDasharray="7 14" />

        <circle cx="790" cy="300" r="116" fill="url(#angel-focus)" opacity="0.7" />
        <circle cx="790" cy="300" r="54" fill="url(#angel-focus)" opacity="0.9" />

        <g opacity="0.22" className="dark:opacity-[0.30]">
          <line x1="790" y1="112" x2="790" y2="872" stroke="rgba(148, 163, 184, 0.40)" strokeWidth="1" />
          <line x1="420" y1="300" x2="1170" y2="300" stroke="rgba(148, 163, 184, 0.34)" strokeWidth="1" />
          <line x1="556" y1="206" x2="1024" y2="206" stroke="rgba(148, 163, 184, 0.24)" strokeWidth="1" />
          <line x1="548" y1="394" x2="1030" y2="394" stroke="rgba(148, 163, 184, 0.24)" strokeWidth="1" />
        </g>
      </svg>

      <div className="absolute left-1/2 top-[20%] h-40 w-40 -translate-x-1/2 rounded-full border border-white/45 bg-white/35 shadow-[0_0_50px_rgba(255,255,255,0.2)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_0_80px_rgba(96,165,250,0.15)]" style={{ animation: "pulse 8s ease-in-out infinite" }}>
        <div className="absolute inset-5 rounded-full border border-blue-400/20 dark:border-blue-300/20" />
        <div className="absolute inset-10 rounded-full border border-amber-400/25 dark:border-amber-300/25" />
      </div>

      {networkNodes.map((node, index) => {
        const palette = nodeColorMap[node.hue];

        return (
          <div
            key={`angel-node-${index}`}
            className={`absolute rounded-full ${palette.className}`}
            style={{
              top: node.top,
              left: node.left,
              width: `${node.size}px`,
              height: `${node.size}px`,
              boxShadow: palette.glow,
              animation: `pulse 4.8s ease-in-out ${node.delay} infinite`,
            }}
          />
        );
      })}

      {floatingPanels.map((panel, index) => (
        <div
          key={`angel-panel-${index}`}
          className="absolute hidden rounded-[28px] border border-white/55 bg-white/55 px-5 py-4 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl md:block dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_18px_70px_rgba(2,6,23,0.34)]"
          style={{
            top: panel.top,
            left: panel.left,
            right: panel.right,
            width: `${panel.width}px`,
            transform: `rotate(${panel.rotate})`,
            animation: `float 16s ease-in-out ${panel.delay} infinite`,
          }}
        >
          <div className={`h-2 rounded-full bg-gradient-to-r from-amber-400/55 via-blue-400/45 to-sky-400/35 dark:from-amber-300/45 dark:via-blue-300/45 dark:to-sky-300/35 ${panel.labelWidth}`} />
          <div className="mt-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-500/10 ring-1 ring-blue-400/20 dark:bg-blue-300/12 dark:ring-blue-200/15" />
            <div className="space-y-2">
              <div className={`h-2 rounded-full bg-slate-900/8 dark:bg-white/12 ${panel.bars[0]}`} />
              <div className={`h-2 rounded-full bg-slate-900/8 dark:bg-white/8 ${panel.bars[1]}`} />
            </div>
          </div>
        </div>
      ))}

      <div className="absolute inset-x-[8%] top-[32%] h-px bg-gradient-to-r from-transparent via-blue-400/35 to-transparent dark:via-blue-300/30" />
      <div className="absolute inset-x-[16%] top-[58%] h-px bg-gradient-to-r from-transparent via-amber-400/28 to-transparent dark:via-amber-300/24" />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(249,250,251,0)_0%,rgba(249,250,251,0.22)_26%,rgba(249,250,251,0.54)_54%,rgba(248,250,252,0.84)_100%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_0%,rgba(2,6,23,0.14)_24%,rgba(2,6,23,0.34)_55%,rgba(2,6,23,0.74)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_50%,rgba(15,23,42,0.05)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,transparent_52%,rgba(2,6,23,0.28)_100%)]" />
    </div>
  );
};

export default CommunityAngelsWallpaper;
