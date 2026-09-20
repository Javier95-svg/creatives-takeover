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
