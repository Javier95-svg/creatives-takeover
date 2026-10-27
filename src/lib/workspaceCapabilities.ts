import type { UserType } from './accountTypes.ts';
import { navSectionsForType, navToolsForType } from './workspaceNavForType.ts';
import { ADOPTION_SECTIONS, SIDEBAR_HIDDEN_TOOLS, WORKSPACE_SECTION_TOOLS, type AdoptionSection } from './workspaceSections.ts';
import { WORKSPACE_ROUTES } from './workspaceNavigation.ts';
import { FOUNDER_TOOL_CATALOG } from '../config/founderToolCatalog.ts';

export type WorkspaceRetrievalKind =
  | 'navigation' | 'project' | 'pedia' | 'article' | 'podcast' | 'service'
  | 'mentor' | 'cofounder' | 'angel' | 'vc' | 'accelerator' | 'directory' | 'community';

export interface WorkspaceCapability {
  id: string;
  name: string;
  section: AdoptionSection;
  route: string;
  purpose: string;
  retrieval: WorkspaceRetrievalKind;
}

// Pure product copy shared by the workspace shell and the Pulse planner. Keep
// icons and React components out of this module so Edge Functions can import it.
export const WORKSPACE_CAPABILITY_PURPOSES: Readonly<Record<string, string>> = {
  Overview: 'Track progress and see what to work on next.',
  Tasks: 'Plan, prioritize, and complete next actions.',
  Routine: 'Build consistent habits and manage recurring work.',
  Files: 'Keep startup documents and files together.',
  Referrals: 'Invite founders and track referral rewards.',
  'ICP Builder': 'Define the ideal customer and the pain they need solved.',
  'Demo Studio': 'Create and publish a demand-capture page.',
  'PMF Lab': 'Validate assumptions with evidence and interviews.',
  'MVP Builder': 'Build the product the target customer asked for.',
  'GTM Strategist': 'Design one measurable acquisition cycle.',
  Directories: 'Find places to submit and distribute a launch.',
  'Find a Mentor': 'Find startup mentors by verified expertise and working preferences.',
  'Find a Co-Founder': 'Find potential co-founders by skills, stage, location, and commitment.',
  'Find your Angel': 'Find angel investors by declared sector and investment stage.',
  Marketplace: 'Compare service providers and start direct conversations.',
  'Traction Engine': 'Track weekly distribution and retention signals.',
  'VC Search': 'Build a focused venture-capital investor list.',
  'Pitch Deck Analyzer': 'Review a pitch deck and prioritize improvements.',
  'Insighta Test': 'Measure fundraising readiness.',
  Rooms: 'Talk with founders by stage and skill.',
  Launchpad: 'Discover public founder launches and progress.',
  Newspaper: 'Read business cases and founder stories.',
  Podcast: 'Hear candid conversations with founders.',
  'Accelerator Hunt': 'Find accelerator programs matched to a startup.',
  'Tech Stack Builder': 'Choose a practical stack and understand its budget.',
  'Startup Pedia': 'Look up startup terms, metrics, frameworks, and practical guides.',
};

const RETRIEVAL_BY_NAME: Partial<Record<string, WorkspaceRetrievalKind>> = {
  'Startup Pedia': 'pedia', Newspaper: 'article', Podcast: 'podcast', Marketplace: 'service',
  'Find a Mentor': 'mentor', 'Find a Co-Founder': 'cofounder', 'Find your Angel': 'angel',
  'VC Search': 'vc', 'Accelerator Hunt': 'accelerator', Directories: 'directory',
  Rooms: 'community', Launchpad: 'community',
  'ICP Builder': 'project', 'Demo Studio': 'project', 'PMF Lab': 'project', 'MVP Builder': 'project',
  'GTM Strategist': 'project', 'Traction Engine': 'project', Tasks: 'project', Routine: 'project', Files: 'project',
};

const founderIds = new Map(FOUNDER_TOOL_CATALOG.map(tool => [tool.name, tool.key]));
const capabilityId = (name: string) => founderIds.get(name) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const BASE_CAPABILITIES: WorkspaceCapability[] = ADOPTION_SECTIONS.flatMap(section =>
  WORKSPACE_SECTION_TOOLS[section].map(name => ({
    id: capabilityId(name), name, section, route: WORKSPACE_ROUTES[name],
    purpose: WORKSPACE_CAPABILITY_PURPOSES[name] ?? `Open ${name}.`,
    retrieval: RETRIEVAL_BY_NAME[name] ?? 'navigation',
  })).filter(capability => Boolean(capability.route)),
);

// These tools are visible only in reviewed-account navigation slices, so they
// do not belong in the founder adoption taxonomy above.
const ROLE_CAPABILITIES: WorkspaceCapability[] = [
  { id: 'my_bookings', name: 'My Bookings', section: 'Dashboard', route: WORKSPACE_ROUTES['My Bookings'], purpose: WORKSPACE_CAPABILITY_PURPOSES['My Bookings'], retrieval: 'project' },
  { id: 'enquiries', name: 'Enquiries', section: 'Dashboard', route: WORKSPACE_ROUTES.Enquiries, purpose: WORKSPACE_CAPABILITY_PURPOSES.Enquiries, retrieval: 'project' },
  { id: 'matches', name: 'Matches', section: 'Dashboard', route: WORKSPACE_ROUTES.Matches, purpose: WORKSPACE_CAPABILITY_PURPOSES.Matches, retrieval: 'project' },
  { id: 'analytics', name: 'Analytics', section: 'Dashboard', route: WORKSPACE_ROUTES.Analytics, purpose: WORKSPACE_CAPABILITY_PURPOSES.Analytics, retrieval: 'navigation' },
  { id: 'messages', name: 'Messages', section: 'Dashboard', route: WORKSPACE_ROUTES.Messages, purpose: WORKSPACE_CAPABILITY_PURPOSES.Messages, retrieval: 'navigation' },
];

export const WORKSPACE_CAPABILITIES: readonly WorkspaceCapability[] = [...BASE_CAPABILITIES, ...ROLE_CAPABILITIES];

export function workspaceCapabilitiesForType(userType: UserType): WorkspaceCapability[] {
  const sections = navSectionsForType(userType, ADOPTION_SECTIONS);
  return WORKSPACE_CAPABILITIES.filter(capability => {
    if (!sections.includes(capability.section)) return false;
    const tools = navToolsForType(userType, capability.section, WORKSPACE_SECTION_TOOLS);
    return !tools || tools.includes(capability.name) || SIDEBAR_HIDDEN_TOOLS.has(capability.name);
  });
}

export function workspaceCapabilityById(id: string): WorkspaceCapability | undefined {
  return WORKSPACE_CAPABILITIES.find(capability => capability.id === id);
}

export function workspaceCapabilityForPath(pathname: string): WorkspaceCapability | undefined {
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return [...WORKSPACE_CAPABILITIES].sort((a, b) => b.route.length - a.route.length).find(capability => {
    const route = capability.route.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    return clean === route || (route !== '/' && clean.startsWith(`${route}/`));
  });
}
