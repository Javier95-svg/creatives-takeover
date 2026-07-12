import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookmarkCheck,
  Brain,
  CalendarCheck2,
  ClipboardList,
  FileText,
  FlaskConical,
  Globe2,
  Handshake,
  Library,
  LineChart,
  Mail,
  MessageCircle,
  Presentation,
  Repeat2,
  Rocket,
  Search,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';

import type { DashboardActionKind } from '@/types/dashboardSnapshot';

export type DashboardJourneyStage =
  | 'IDENTITY'
  | 'PROTOTYPE'
  | 'VALIDATING'
  | 'BUILDING'
  | 'LAUNCH'
  | 'TRACTION'
  | 'FUNDRAISING'
  | 'MORE';

export interface DashboardToolDefinition {
  key: string;
  label: string;
  route: string;
  stage: DashboardJourneyStage;
  icon: LucideIcon;
  entitlement?: string;
  inlineActions: DashboardActionKind[];
}

const definitions: DashboardToolDefinition[] = [
  { key: 'tasks', label: 'Tasks', route: '/dashboard/tasks', stage: 'MORE', icon: CalendarCheck2, inlineActions: ['complete_task', 'reschedule_task', 'create_task'] },
  { key: 'routine', label: 'Routine', route: '/dashboard/routine', stage: 'MORE', icon: Repeat2, inlineActions: ['complete_routine_item'] },
  { key: 'messages', label: 'Messages', route: '/messages', stage: 'MORE', icon: MessageCircle, inlineActions: ['mark_conversation_read', 'create_follow_up_task'] },
  { key: 'icp_builder', label: 'ICP Builder', route: '/icp-builder', stage: 'IDENTITY', icon: Target, entitlement: 'icp_builder', inlineActions: ['open_tool'] },
  { key: 'demo_studio', label: 'Demo Studio', route: '/demo-studio', stage: 'PROTOTYPE', icon: ClipboardList, entitlement: 'waitlist_maker', inlineActions: ['open_tool'] },
  { key: 'waitlist_maker', label: 'Demo Studio', route: '/demo-studio', stage: 'PROTOTYPE', icon: ClipboardList, entitlement: 'waitlist_maker', inlineActions: ['open_tool'] },
  { key: 'pmf_lab', label: 'PMF Lab', route: '/pmf-lab', stage: 'VALIDATING', icon: FlaskConical, entitlement: 'pmf_lab', inlineActions: ['open_tool'] },
  { key: 'mvp_builder', label: 'MVP Builder', route: '/mvp-builder', stage: 'BUILDING', icon: Rocket, entitlement: 'mvp_builder', inlineActions: ['open_tool'] },
  { key: 'tech_stack', label: 'Tech Stack', route: '/tech-stack', stage: 'BUILDING', icon: Zap, entitlement: 'tech_stack', inlineActions: ['open_tool'] },
  { key: 'gtm_strategist', label: 'GTM Strategist', route: '/go-to-market', stage: 'LAUNCH', icon: Globe2, entitlement: 'gtm_strategist', inlineActions: ['open_tool'] },
  { key: 'traction_engine', label: 'Traction Engine', route: '/traction-engine', stage: 'TRACTION', icon: LineChart, inlineActions: ['open_tool'] },
  { key: 'pitch_deck_analyzer', label: 'Pitch Deck Analyzer', route: '/pitch-deck-analyzer', stage: 'FUNDRAISING', icon: Presentation, entitlement: 'pitch_deck_analyzer', inlineActions: ['open_tool'] },
  { key: 'saved_mentors', label: 'Saved Mentors', route: '/saved-mentors', stage: 'MORE', icon: BookmarkCheck, inlineActions: ['remove_saved_mentor', 'create_follow_up_task'] },
  { key: 'find_mentor', label: 'Find a Mentor', route: '/mentorship', stage: 'IDENTITY', icon: Users, inlineActions: ['save_mentor', 'create_task', 'open_tool'] },
  { key: 'find_cofounder', label: 'Find a Co-Founder', route: '/co-founder', stage: 'IDENTITY', icon: Handshake, inlineActions: ['open_tool'] },
  { key: 'directories', label: 'Directories', route: '/directories', stage: 'TRACTION', icon: Search, entitlement: 'directories', inlineActions: ['open_tool'] },
  { key: 'decision_sprint', label: 'Decision Sprint', route: '/decision-sprint', stage: 'VALIDATING', icon: ClipboardList, inlineActions: ['open_tool'] },
  { key: 'find_angel', label: 'Find your Angel', route: '/investors', stage: 'FUNDRAISING', icon: Sparkles, entitlement: 'angels_community', inlineActions: ['open_tool'] },
  { key: 'vc_search', label: 'VC Search', route: '/vc-search', stage: 'FUNDRAISING', icon: Search, entitlement: 'vc_search_browse', inlineActions: ['toggle_funding_bookmark', 'create_follow_up_task'] },
  { key: 'accelerator_hunt', label: 'Accelerator Hunt', route: '/accelerator-hunt', stage: 'TRACTION', icon: Rocket, entitlement: 'accelerator_browse', inlineActions: ['toggle_funding_bookmark', 'create_follow_up_task'] },
  { key: 'core_metrics', label: 'Core Metrics', route: '/core-metrics', stage: 'TRACTION', icon: BarChart3, inlineActions: ['update_kpi'] },
  { key: 'ai_goals', label: 'Goals Planner', route: '/ai-goals', stage: 'MORE', icon: Brain, inlineActions: ['open_tool'] },
  { key: 'email_templates', label: 'Email Templates', route: '/email-templates', stage: 'LAUNCH', icon: Mail, entitlement: 'email_templates', inlineActions: ['open_tool'] },
  { key: 'prompt_library', label: 'Prompt Library', route: '/prompt-library', stage: 'MORE', icon: Library, entitlement: 'prompt_library', inlineActions: ['toggle_content_bookmark'] },
  { key: 'insighta_test', label: 'Insighta Test', route: '/insighta-test', stage: 'VALIDATING', icon: Sparkles, entitlement: 'insighta_test', inlineActions: ['open_tool'] },
  { key: 'newspaper', label: 'Newspaper', route: '/newspaper', stage: 'MORE', icon: FileText, entitlement: 'newspaper', inlineActions: ['toggle_content_bookmark'] },
  { key: 'files', label: 'Files', route: '/dashboard/files', stage: 'MORE', icon: FileText, inlineActions: ['create_task'] },
  { key: 'dashboard', label: 'Dashboard', route: '/dashboard', stage: 'MORE', icon: Sparkles, inlineActions: ['open_tool'] },
];

export const DASHBOARD_TOOL_REGISTRY = Object.fromEntries(
  definitions.map((definition) => [definition.key, definition]),
) as Record<string, DashboardToolDefinition>;

export const DASHBOARD_TOOL_DEFINITIONS = definitions;

export function getDashboardTool(key: string | null | undefined): DashboardToolDefinition {
  return DASHBOARD_TOOL_REGISTRY[key ?? ''] ?? DASHBOARD_TOOL_REGISTRY.dashboard;
}
