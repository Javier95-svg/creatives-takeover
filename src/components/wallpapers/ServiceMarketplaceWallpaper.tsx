const ServiceMarketplaceWallpaper = () => {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.94)_42%,rgba(255,255,255,0.98))] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(8,15,32,0.96)_44%,rgba(2,6,23,0.98))]" />

      <div
        className="absolute inset-0 opacity-55 dark:opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.055) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div
        className="absolute inset-0 opacity-80 dark:opacity-70"
        style={{
          backgroundImage:
            "linear-gradient(120deg, transparent 0%, rgba(8,145,178,0.14) 14%, transparent 32%), linear-gradient(300deg, transparent 0%, rgba(225,29,72,0.1) 16%, transparent 36%)",
        }}
      />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id="service-lane-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(8,145,178,0)" />
            <stop offset="48%" stopColor="rgba(8,145,178,0.34)" />
            <stop offset="100%" stopColor="rgba(8,145,178,0)" />
          </linearGradient>
          <linearGradient id="service-lane-rose" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(225,29,72,0)" />
            <stop offset="50%" stopColor="rgba(225,29,72,0.26)" />
            <stop offset="100%" stopColor="rgba(225,29,72,0)" />
          </linearGradient>
          <linearGradient id="service-ticket-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.62)" />
            <stop offset="100%" stopColor="rgba(241,245,249,0.2)" />
          </linearGradient>
        </defs>

        <g opacity="0.72">
          <path d="M-40 210 H360 C430 210 440 292 512 292 H1480" fill="none" stroke="url(#service-lane-cyan)" strokeWidth="2.2" strokeDasharray="16 18" />
          <path d="M-20 398 H210 C284 398 302 328 374 328 H1480" fill="none" stroke="url(#service-lane-rose)" strokeWidth="2" strokeDasharray="10 18" />
          <path d="M-30 638 H470 C546 638 560 562 630 562 H1480" fill="none" stroke="url(#service-lane-cyan)" strokeWidth="2.1" strokeDasharray="18 20" />
        </g>

        <g opacity="0.55">
          {[
            { x: 118, y: 142, w: 176, h: 78 },
            { x: 934, y: 118, w: 194, h: 82 },
            { x: 244, y: 582, w: 206, h: 84 },
            { x: 1062, y: 596, w: 188, h: 78 },
          ].map((panel, index) => (
            <g key={`service-panel-${index}`}>
              <rect
                x={panel.x}
                y={panel.y}
                width={panel.w}
                height={panel.h}
                rx="12"
                fill="url(#service-ticket-fill)"
                stroke={index % 2 === 0 ? "rgba(8,145,178,0.24)" : "rgba(225,29,72,0.2)"}
              />
              <rect x={panel.x + 18} y={panel.y + 18} width="58" height="6" rx="3" fill={index % 2 === 0 ? "rgba(8,145,178,0.28)" : "rgba(225,29,72,0.24)"} />
              <rect x={panel.x + 18} y={panel.y + 38} width={panel.w - 50} height="5" rx="2.5" fill="rgba(100,116,139,0.16)" />
              <rect x={panel.x + 18} y={panel.y + 54} width={panel.w - 82} height="5" rx="2.5" fill="rgba(100,116,139,0.12)" />
            </g>
          ))}
        </g>

        <g opacity="0.75">
          {[
            { cx: 360, cy: 210, color: "rgba(8,145,178,0.48)" },
            { cx: 512, cy: 292, color: "rgba(8,145,178,0.42)" },
            { cx: 374, cy: 328, color: "rgba(225,29,72,0.4)" },
            { cx: 630, cy: 562, color: "rgba(8,145,178,0.38)" },
            { cx: 940, cy: 638, color: "rgba(225,29,72,0.32)" },
          ].map((node, index) => (
            <circle key={`service-node-${index}`} cx={node.cx} cy={node.cy} r="4" fill={node.color} />
          ))}
        </g>
      </svg>

      <div className="absolute inset-0 bg-gradient-to-b from-background/86 via-background/68 to-background/92 dark:from-background/72 dark:via-background/58 dark:to-background/88" />
    </div>
  );
};

export default ServiceMarketplaceWallpaper;
