import { FOUNDER_TOOL_CATALOG } from '../config/founderToolCatalog.ts';
import type { BizMapStage } from './bizmapStageOrder.ts';

/** The founder home's eight quick starts, each with the place it opens. */

export type PulseShortcutIcon = 'focus' | 'mentor' | 'cofounder' | 'customer' | 'demo' | 'validate' | 'mvp' | 'launch';

export interface PulseShortcut {
  id: string;
  label: string;
  /** Where it happens, shown under the label. */
  tool: string;
  route: string;
  icon: PulseShortcutIcon;
}

const toolRoute = (key: string) => FOUNDER_TOOL_CATALOG.find((tool) => tool.key === key)!.route;

// Four rows of two, in this order.
export const PULSE_HOME_SHORTCUTS: readonly PulseShortcut[] = [
  { id: 'focus', label: 'What should I focus next?', tool: 'Dashboard', route: '/dashboard', icon: 'focus' },
  { id: 'mentor', label: 'Find me a mentor', tool: 'Mentorship', route: '/mentorship', icon: 'mentor' },
  { id: 'cofounder', label: 'Find me a co-founder', tool: 'Co-founder match', route: '/co-founder/create', icon: 'cofounder' },
  { id: 'customer', label: 'Help me define my customer', tool: 'ICP Builder', route: toolRoute('icp_builder'), icon: 'customer' },
  { id: 'demo', label: 'Help me create a demo', tool: 'Demo Studio', route: toolRoute('demo_studio'), icon: 'demo' },
  { id: 'validate', label: 'Help me validate my idea', tool: 'PMF Lab', route: toolRoute('pmf_lab'), icon: 'validate' },
  { id: 'mvp', label: 'Help me build my MVP', tool: 'MVP Builder', route: toolRoute('mvp_builder'), icon: 'mvp' },
  { id: 'launch', label: 'Help me plan my launch', tool: 'GTM Strategist', route: toolRoute('gtm_strategist'), icon: 'launch' },
];

/** The tool a focus item opens, from its route, e.g. "ICP Builder" for /icp-builder?x=1. */
export function toolNameForRoute(route: string): string | null {
  const path = route.split(/[?#]/)[0];
  const tool = FOUNDER_TOOL_CATALOG.find((candidate) => {
    const toolPath = candidate.route.split(/[?#]/)[0];
    return path === toolPath || path.startsWith(`${toolPath}/`);
  });
  return tool?.name ?? null;
}

/** An example question for the Pulse box, matched to the stage. */
export const STAGE_EXAMPLE_QUESTION: Record<BizMapStage, string> = {
  IDENTITY: 'Who has this problem the most?',
  PROTOTYPE: 'What is the smallest version I could show people?',
  VALIDATING: 'How do I know if people really want this?',
  BUILDING: 'What should I cut from my first version?',
  LAUNCH: 'Where do I find my first 10 customers?',
  TRACTION: 'Which channel brought my best users?',
  FUNDRAISING: 'What will investors ask me first?',
};
