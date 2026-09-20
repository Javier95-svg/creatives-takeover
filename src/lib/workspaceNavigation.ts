import { FOUNDER_TOOL_CATALOG } from '../config/founderToolCatalog';

export const WORKSPACE_PREVIEW_KEY = 'ct-workspace-preview';
export const WORKSPACE_ROUTES: Record<string, string> = {
  ...Object.fromEntries(FOUNDER_TOOL_CATALOG.map((tool) => [tool.name, tool.route])),
  Overview: '/dashboard',
  Tasks: '/dashboard/tasks',
  Routine: '/dashboard/routine',
  Files: '/dashboard/files',
  Referrals: '/dashboard/referral',
  Pricing: '/pricing',
  'Find a Mentor': '/mentorship',
  'Find a Co-Founder': '/co-founder',
  'Find your Angel': '/investors',
  Marketplace: '/marketplace',
  Newspaper: '/newspaper',
  Podcast: '/podcast',
  Settings: '/dashboard/settings',
  Messages: '/messages',
  // Category surfaces. Only ever reached from a per type nav slice, so a
  // founder never sees them even though the map is shared.
  'My Bookings': '/mentor/bookings',
  Enquiries: '/marketplace/enquiries',
  Matches: '/investors/matches',
  Analytics: '/account/analytics',
  'Invite people': '/dashboard/referral',
};

type WorkspaceConcept = 'founder-guide' | 'command-center' | 'guided-journey';

export function getWorkspacePreview(): WorkspaceConcept | null {
  // Review metadata is never a production eligibility decision.
  if (!import.meta.env.DEV) return null;
  try {
    const value = sessionStorage.getItem(WORKSPACE_PREVIEW_KEY);
    return ['founder-guide', 'command-center', 'guided-journey'].includes(value ?? '') ? value as WorkspaceConcept : null;
  } catch { return null; }
}

let routerNavigate: ((path: string) => void) | undefined;
export function bindWorkspaceNavigator(navigate: (path: string) => void) {
  routerNavigate = navigate;
  return () => { if (routerNavigate === navigate) routerNavigate = undefined; };
}
export function enterWorkspaceRoute(path: string) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return;
  if (routerNavigate) routerNavigate(path);
  else window.location.assign(path);
}
