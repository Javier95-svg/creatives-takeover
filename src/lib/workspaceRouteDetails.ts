import { BIZMAP_STAGES, BIZMAP_TOOLS } from './bizmapStages';
import { BarChart3, BriefcaseBusiness, CalendarClock, CheckSquare, FolderOpen, Gift, GraduationCap, Handshake, Inbox, LayoutDashboard, LineChart, MessageSquare, Mic, Newspaper, Repeat, Rocket, Settings, Sparkles, Users, type LucideIcon } from 'lucide-react';

export const WORKSPACE_ROUTE_ICONS: Record<string, LucideIcon> = {
  ...Object.fromEntries(BIZMAP_TOOLS.map(tool => [tool.name, tool.icon])),
  'Traction Engine': LineChart,
  'VC Search': Users,
  'Pitch Deck Analyzer': BarChart3,
  'Find a Mentor': GraduationCap,
  'Find a Co-Founder': Handshake,
  'Find your Angel': Sparkles,
  Marketplace: BriefcaseBusiness,
  Newspaper,
  Podcast: Mic,
  'Accelerator Hunt': Rocket,
  'Tech Stack Builder': Settings,
  Overview: LayoutDashboard,
  Tasks: CheckSquare,
  Routine: Repeat,
  Files: FolderOpen,
  Referrals: Gift,
  Messages: MessageSquare,
  'My Bookings': CalendarClock,
  Enquiries: Inbox,
  Matches: Sparkles,
  Analytics: BarChart3,
};

// Reuse the canonical journey copy and stage labels used by the existing navbar.
export const WORKSPACE_SECTION_SLOGANS: Record<string, string> = {
  Dashboard: 'Accountability Partner ⏱️',
  BizMap: 'Validate ✅ Build 🛠️ Launch 🚀',
  Insighta: 'Distribute📦 Fundraise💸',
  Network: 'Connect & Collab 🌐',
  Content: 'Leisure Time🍿',
  Resources: 'Some Gifts 🎁',
};

export const WORKSPACE_ROUTE_DESCRIPTIONS: Record<string, string> = {
  ...Object.fromEntries(BIZMAP_TOOLS.map(tool => [tool.name, tool.description])),
  'Traction Engine': 'Track weekly distribution and retention signals.',
  'VC Search': 'Build a focused investor list.',
  'Find a Mentor': 'Connect with experienced startup coaches.',
  'Find a Co-Founder': 'Meet your business soulmate.',
  'Find your Angel': 'Angel investor network.',
  Marketplace: 'Grow your business with niche services.',
  Newspaper: 'Read business cases and founder stories.',
  Podcast: 'Hear candid conversations with founders.',
  'Accelerator Hunt': 'Find accelerator programs matched to your startup.',
  'Tech Stack Builder': 'Choose a practical stack for your product.',
  Overview: 'Track your progress and see what to work on next.',
  Tasks: 'Plan, prioritize, and complete your next actions.',
  Routine: 'Build consistent habits and manage recurring work.',
  Files: 'Keep your startup documents and files together.',
  Referrals: 'Invite founders and track your referral rewards.',
  Messages: 'Read and reply to your conversations.',
  'My Bookings': 'Accept or decline discovery call requests.',
  Enquiries: 'Answer people asking about your services.',
  Matches: 'Founders matching the sectors and stages you back.',
  Analytics: 'See how many people viewed your profile.',
};

export const WORKSPACE_TOOL_STAGES: Record<string, string> = Object.fromEntries(
  BIZMAP_STAGES.flatMap(stage => stage.tools.map(tool => [tool.name, `Stage ${stage.numeral}: ${stage.title}`])),
);

/**
 * Per type overrides for the founder-voiced copy above.
 *
 * "Accountability Partner" and "Validate, Build, Launch" describe a founder's
 * journey. A mentor keeps the same Dashboard section but is doing something
 * else entirely in it, and reading a founder's slogan there tells them the
 * product was not built for them.
 *
 * Founders and builders are absent on purpose: they get the copy above,
 * unchanged. A type with no entry falls back to it too.
 */
export const SECTION_SLOGANS_BY_TYPE: Record<string, Record<string, string>> = {
  mentor: {
    Dashboard: 'Your Founders ⏱️',
    Network: 'Connect & Collab 🌐',
    Content: 'Leisure Time🍿',
    Resources: 'Some Gifts 🎁',
  },
  marketplace: {
    Dashboard: 'Your Clients 📥',
    Network: 'Connect & Collab 🌐',
    Content: 'Leisure Time🍿',
    Resources: 'Some Gifts 🎁',
  },
  investor: {
    Dashboard: 'Your Dealflow 🔎',
    Network: 'Connect & Collab 🌐',
    Content: 'Leisure Time🍿',
  },
};

export const ROUTE_DESCRIPTIONS_BY_TYPE: Record<string, Record<string, string>> = {
  mentor: {
    Overview: 'See who is waiting on you and what changed.',
    'Find a Mentor': 'See how other mentors present themselves.',
    'Find a Co-Founder': 'Browse founders looking for a partner.',
    Marketplace: 'Find services for the founders you advise.',
  },
  marketplace: {
    Overview: 'See new enquiries and how your listing is doing.',
    'Find a Mentor': 'Get advice on growing your practice.',
    'Find a Co-Founder': 'Meet people building something with you.',
    Marketplace: 'See your listing the way buyers see it.',
  },
  investor: {
    Overview: 'See new matches and what your founders are shipping.',
    'Find a Co-Founder': 'Browse founders looking for a partner.',
    'Find your Angel': 'See the rest of the investor network.',
    Marketplace: 'Find services for your portfolio.',
  },
};

/** The section slogan for this type, falling back to the founder wording. */
export function sectionSloganFor(userType: string, section: string) {
  return SECTION_SLOGANS_BY_TYPE[userType]?.[section] ?? WORKSPACE_SECTION_SLOGANS[section];
}

/** The tool description for this type, falling back to the founder wording. */
export function routeDescriptionFor(userType: string, route: string) {
  return ROUTE_DESCRIPTIONS_BY_TYPE[userType]?.[route] ?? WORKSPACE_ROUTE_DESCRIPTIONS[route];
}
