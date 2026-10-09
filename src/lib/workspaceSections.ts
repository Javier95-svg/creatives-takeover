import { WORKSPACE_ROUTES } from './workspaceNavigation.ts';

/**
 * The workspace's sections and their tools, as the sidebar shows them. The
 * sidebar renders from this, and adoption is reported by the same sections,
 * so the two cannot drift apart. Pricing is a sidebar link, not a section.
 */
export const ADOPTION_SECTIONS = ['Dashboard', 'BizMap', 'Network', 'Insighta', 'Community', 'Content', 'Bonus'] as const;
export type AdoptionSection = typeof ADOPTION_SECTIONS[number];

export const WORKSPACE_SECTION_TOOLS: Record<AdoptionSection, string[]> = {
  Dashboard: ['Overview', 'Tasks', 'Routine', 'Files', 'Referrals'],
  BizMap: ['ICP Builder', 'Demo Studio', 'PMF Lab', 'MVP Builder', 'GTM Strategist', 'Directories'],
  Network: ['Find a Mentor', 'Find a Co-Founder', 'Find your Angel', 'Marketplace'],
  Insighta: ['Traction Engine', 'VC Search', 'Pitch Deck Analyzer', 'Insighta Test'],
  Community: ['Rooms', 'Launchpad'],
  Content: ['Newspaper', 'Podcast'],
  Bonus: ['Accelerator Hunt', 'Tech Stack Builder'],
};

/**
 * Other pages that belong to a section, so a visit there still counts for it.
 * An alias of a sidebar tool names that tool; a page that is no sidebar tool
 * (the home page, Messages, profiles, Decision Sprint) has a null tool and
 * counts for its section only, so the report stays exactly the sidebar.
 */
export const SECTION_EXTRA_ROUTES: Array<[route: string, section: AdoptionSection, tool: string | null]> = [
  ['/', 'Dashboard', null],
  ['/accountability', 'Dashboard', 'Overview'],
  ['/weekly-mission', 'Dashboard', 'Overview'],
  ['/focus-funnel', 'Dashboard', 'Overview'],
  ['/tasks', 'Dashboard', 'Tasks'],
  ['/routine', 'Dashboard', 'Routine'],
  ['/files', 'Dashboard', 'Files'],
  ['/icp', 'BizMap', 'ICP Builder'],
  ['/bizmap-ai/icp-builder', 'BizMap', 'ICP Builder'],
  ['/bizmap-ai/pmf-lab', 'BizMap', 'PMF Lab'],
  ['/projects-dashboard', 'BizMap', 'Demo Studio'],
  ['/waitlist', 'BizMap', 'Demo Studio'],
  ['/waitlist-maker', 'BizMap', 'Demo Studio'],
  ['/gtm-strategist', 'BizMap', 'GTM Strategist'],
  ['/client-acquisition', 'BizMap', 'GTM Strategist'],
  ['/decision-sprint', 'BizMap', null],
  ['/validate', 'BizMap', null],
  ['/messages', 'Network', null],
  ['/saved-mentors', 'Network', 'Find a Mentor'],
  ['/my-bookings', 'Network', 'Find a Mentor'],
  ['/mentor', 'Network', 'Find a Mentor'],
  ['/profile', 'Network', null],
  ['/insighta/vc', 'Insighta', 'VC Search'],
  ['/insighta/vc-search', 'Insighta', 'VC Search'],
  ['/insighta/traction-engine', 'Insighta', 'Traction Engine'],
  ['/insighta/pitch-deck-analyzer', 'Insighta', 'Pitch Deck Analyzer'],
  ['/insighta/test', 'Insighta', 'Insighta Test'],
  ['/insighta/accelerator', 'Bonus', 'Accelerator Hunt'],
  ['/insighta/accelerator-hunt', 'Bonus', 'Accelerator Hunt'],
  ['/bizmap-ai/tech-stack', 'Bonus', 'Tech Stack Builder'],
];

/** Account and billing pages are not product sections. */
const NOT_A_SECTION = ['/pricing', '/account', '/settings', '/dashboard/settings'];

const under = (path: string, root: string) => path === root || (root !== '/' && path.startsWith(`${root}/`));

const SECTION_ROUTES: Array<[route: string, section: AdoptionSection, tool: string | null]> = [
  ...ADOPTION_SECTIONS.flatMap((section) => WORKSPACE_SECTION_TOOLS[section].flatMap((tool) => {
    const route = WORKSPACE_ROUTES[tool]?.split('?')[0];
    return route ? [[route, section, tool] as [string, AdoptionSection, string]] : [];
  })),
  ...SECTION_EXTRA_ROUTES,
].sort((a, b) => b[0].length - a[0].length);

/** The section and tool a workspace page belongs to, or null for pages outside the sections. */
export function sectionForPath(path: string): { section: AdoptionSection; tool: string | null } | null {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (NOT_A_SECTION.some((root) => under(clean, root))) return null;
  const match = SECTION_ROUTES.find(([route]) => under(clean, route));
  return match ? { section: match[1], tool: match[2] } : null;
}
