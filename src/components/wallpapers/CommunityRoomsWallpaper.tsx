// Community Rooms' own backdrop: a transcript. Rows of speech bubbles, left
// and right like a chat, repeat evenly from the top of the page to the bottom,
// and RoomsThreadChart, drawn in
// the header, shows a post with an upvote and its replies branching off it,
// which is what a room is. Static and low-contrast like the other tool
// backdrops (see PMFLabWallpaper).

export default function CommunityRoomsWallpaper() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden text-tool-rooms">
      <svg className="absolute inset-0 h-full w-full" fill="none">
        <defs>
          {/* One tile holds a short exchange: a message on the left, a reply on the right. */}
          <pattern id="rooms-transcript" width="220" height="132" patternUnits="userSpaceOnUse">
            <g stroke="currentColor" strokeWidth="1.1">
              <path d="M18 18 h92 a10 10 0 0 1 10 10 v14 a10 10 0 0 1 -10 10 h-78 l-10 9 v-9 h-4 a10 10 0 0 1 -10 -10 v-14 a10 10 0 0 1 10 -10 z" strokeOpacity="0.12" />
              <path d="M30 31 h62 M30 40 h44" strokeOpacity="0.09" strokeLinecap="round" />
              <path d="M132 76 h62 a10 10 0 0 1 10 10 v14 a10 10 0 0 1 -10 10 h-4 v9 l-10 -9 h-48 a10 10 0 0 1 -10 -10 v-14 a10 10 0 0 1 10 -10 z" strokeOpacity="0.09" />
              <path d="M144 89 h44 M144 98 h28" strokeOpacity="0.07" strokeLinecap="round" />
            </g>
            <circle cx="8" cy="66" r="2" fill="currentColor" fillOpacity="0.12" />
            <circle cx="214" cy="122" r="2" fill="currentColor" fillOpacity="0.1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#rooms-transcript)" />
      </svg>
    </div>
  );
}

/** A post, its upvote and two replies threaded under it, on the right of the header. */
export function RoomsThreadChart() {
  return (
    <svg aria-hidden="true" viewBox="0 0 520 300" className="h-full w-full text-tool-rooms" fill="none">
      {/* The post. */}
      <rect x="40" y="22" width="420" height="92" rx="14" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" fill="currentColor" fillOpacity="0.06" />
      <circle cx="74" cy="54" r="14" fill="currentColor" fillOpacity="0.45" />
      <path d="M100 48 h150" stroke="currentColor" strokeOpacity="0.6" strokeWidth="6" strokeLinecap="round" />
      <path d="M100 66 h220 M100 82 h180" stroke="currentColor" strokeOpacity="0.3" strokeWidth="4" strokeLinecap="round" />
      {/* Upvote pill. */}
      <rect x="370" y="40" width="70" height="30" rx="15" fill="currentColor" fillOpacity="0.55" />
      <path d="M392 60 l8 -9 8 9 h-5 v6 h-6 v-6 z" fill="hsl(var(--background))" />
      <text x="424" y="60" textAnchor="middle" fill="hsl(var(--background))" fontSize="13" fontWeight="600" fontFamily="'Space Grotesk', sans-serif">24</text>
      {/* The thread line and its two replies. */}
      <path d="M74 114 V250 M74 166 H112 M74 238 H112" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" />
      <rect x="112" y="138" width="300" height="56" rx="12" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.25" />
      <circle cx="138" cy="166" r="10" fill="currentColor" fillOpacity="0.3" />
      <path d="M158 160 h170 M158 174 h120" stroke="currentColor" strokeOpacity="0.3" strokeWidth="4" strokeLinecap="round" />
      <rect x="112" y="210" width="260" height="56" rx="12" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.25" fill="currentColor" fillOpacity="0.08" />
      <circle cx="138" cy="238" r="10" fill="currentColor" fillOpacity="0.45" />
      <path d="M158 232 h140 M158 246 h90" stroke="currentColor" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
