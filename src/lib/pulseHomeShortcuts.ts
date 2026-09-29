import { FOUNDER_TOOL_CATALOG } from '../config/founderToolCatalog.ts';
import type { BizMapStage } from './bizmapStageOrder.ts';

/**
 * The founder home's quick starts. Four are picked for the founder's stage and
 * the rest sit behind "All tools", instead of the same eight for everyone.
 * Labels name the outcome, not "Help me…".
 */

export type PulseShortcutIcon = 'focus' | 'mentor' | 'cofounder' | 'customer' | 'demo' | 'validate' | 'mvp' | 'launch' | 'retention' | 'deck' | 'investors';

export interface PulseShortcut {
  id: string;
  label: string;
  /** Where it happens, shown under the label. */
  tool: string;
  route: string;
  icon: PulseShortcutIcon;
}

const toolRoute = (key: string) => FOUNDER_TOOL_CATALOG.find((tool) => tool.key === key)!.route;

const SHORTCUTS = {
  focus: { id: 'focus', label: 'What should I focus on next?', tool: 'Dashboard', route: '/dashboard', icon: 'focus' },
  mentor: { id: 'mentor', label: 'Talk to a mentor', tool: 'Mentorship', route: '/mentorship', icon: 'mentor' },
  cofounder: { id: 'cofounder', label: 'Find a co-founder', tool: 'Co-founder match', route: '/co-founder/create', icon: 'cofounder' },
  customer: { id: 'customer', label: 'Define your customer', tool: 'ICP Builder', route: toolRoute('icp_builder'), icon: 'customer' },
  demo: { id: 'demo', label: 'Show people a demo', tool: 'Demo Studio', route: toolRoute('demo_studio'), icon: 'demo' },
  validate: { id: 'validate', label: 'Test if people want it', tool: 'PMF Lab', route: toolRoute('pmf_lab'), icon: 'validate' },
  pitch: { id: 'pitch', label: 'Test your one-line pitch', tool: 'PMF Lab', route: toolRoute('pmf_lab'), icon: 'validate' },
  mvp: { id: 'mvp', label: 'Build your MVP', tool: 'MVP Builder', route: toolRoute('mvp_builder'), icon: 'mvp' },
  launch: { id: 'launch', label: 'Plan your launch', tool: 'GTM Strategist', route: toolRoute('gtm_strategist'), icon: 'launch' },
  customers: { id: 'customers', label: 'Find your next 10 customers', tool: 'GTM Strategist', route: toolRoute('gtm_strategist'), icon: 'launch' },
  retention: { id: 'retention', label: 'See who comes back', tool: 'Traction Engine', route: toolRoute('traction_engine'), icon: 'retention' },
  deck: { id: 'deck', label: 'Review your pitch deck', tool: 'Pitch Deck Analyzer', route: toolRoute('pitch_deck_analyzer'), icon: 'deck' },
  investors: { id: 'investors', label: 'Find investors', tool: 'VC Search', route: toolRoute('vc_search'), icon: 'investors' },
} satisfies Record<string, PulseShortcut>;

type ShortcutId = keyof typeof SHORTCUTS;

const BY_STAGE: Record<BizMapStage, readonly ShortcutId[]> = {
  IDENTITY: ['customer', 'validate', 'mentor', 'cofounder'],
  PROTOTYPE: ['demo', 'customer', 'validate', 'mentor'],
  VALIDATING: ['validate', 'demo', 'customer', 'mentor'],
  BUILDING: ['mvp', 'validate', 'cofounder', 'mentor'],
  LAUNCH: ['launch', 'demo', 'mvp', 'mentor'],
  TRACTION: ['retention', 'customers', 'pitch', 'mentor'],
  FUNDRAISING: ['deck', 'investors', 'retention', 'mentor'],
};
const NO_STAGE: readonly ShortcutId[] = ['focus', 'customer', 'validate', 'mentor'];
// Everything "All tools" can show, one entry per destination.
const ALL: readonly ShortcutId[] = ['focus', 'customer', 'demo', 'validate', 'mvp', 'launch', 'retention', 'deck', 'investors', 'mentor', 'cofounder'];

export function pulseHomeShortcuts(stage: BizMapStage | null | undefined): { suggested: PulseShortcut[]; more: PulseShortcut[] } {
  const suggested = (stage ? BY_STAGE[stage] : NO_STAGE).map((id) => SHORTCUTS[id]);
  const shownRoutes = new Set(suggested.map((shortcut) => shortcut.route));
  return { suggested, more: ALL.map((id) => SHORTCUTS[id]).filter((shortcut) => !shownRoutes.has(shortcut.route)) };
}

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
