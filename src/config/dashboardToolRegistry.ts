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
import { getFounderTool, type FounderToolKey } from '@/config/founderToolCatalog';

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

function catalogTool(
  key: FounderToolKey,
  icon: LucideIcon,
  inlineActions: DashboardActionKind[],
  entitlement?: string,
): DashboardToolDefinition {
  const tool = getFounderTool(key);
  return {
    key,
    label: tool.name,
    route: tool.route,
    stage: tool.role === 'core' ? tool.stage : 'MORE',
    icon,
    entitlement: entitlement ?? tool.entitlement,
    inlineActions,
  };
}

const definitions: DashboardToolDefinition[] = [
  { key: 'tasks', label: 'Tasks', route: '/dashboard/tasks', stage: 'MORE', icon: CalendarCheck2, inlineActions: ['complete_task', 'reschedule_task', 'create_task'] },
  { key: 'routine', label: 'Routine', route: '/dashboard/routine', stage: 'MORE', icon: Repeat2, inlineActions: ['complete_routine_item'] },
  { key: 'messages', label: 'Messages', route: '/messages', stage: 'MORE', icon: MessageCircle, inlineActions: ['mark_conversation_read', 'create_follow_up_task'] },
  { ...catalogTool('icp_builder', Target, ['open_tool']), key: 'icp_builder' },
  { ...catalogTool('demo_studio', ClipboardList, ['open_tool'], 'waitlist_maker'), key: 'demo_studio' },
  { ...catalogTool('demo_studio', ClipboardList, ['open_tool'], 'waitlist_maker'), key: 'waitlist_maker' },
  { ...catalogTool('pmf_lab', FlaskConical, ['open_tool']), key: 'pmf_lab' },
  { ...catalogTool('mvp_builder', Rocket, ['open_tool']), key: 'mvp_builder' },
  { ...catalogTool('tech_stack', Zap, ['open_tool']), key: 'tech_stack' },
  { ...catalogTool('gtm_strategist', Globe2, ['open_tool']), key: 'gtm_strategist' },
  { ...catalogTool('first_customer_sprint', Rocket, ['open_tool']), key: 'first_customer_sprint' },
  { ...catalogTool('traction_engine', LineChart, ['open_tool']), key: 'traction_engine' },
  { ...catalogTool('pitch_deck_analyzer', Presentation, ['open_tool']), key: 'pitch_deck_analyzer' },
  { key: 'saved_mentors', label: 'Saved Mentors', route: '/saved-mentors', stage: 'MORE', icon: BookmarkCheck, inlineActions: ['remove_saved_mentor', 'create_follow_up_task'] },
  { key: 'find_mentor', label: 'Find a Mentor', route: '/mentorship', stage: 'MORE', icon: Users, inlineActions: ['save_mentor', 'create_task', 'open_tool'] },
  { key: 'find_cofounder', label: 'Find a Co-Founder', route: '/co-founder', stage: 'MORE', icon: Handshake, inlineActions: ['open_tool'] },
  { key: 'marketplace', label: 'Marketplace', route: '/marketplace', stage: 'MORE', icon: Handshake, inlineActions: ['open_social_action', 'open_tool'] },
  { ...catalogTool('directories', Search, ['open_tool']), key: 'directories' },
  { key: 'decision_sprint', label: 'Decision Sprint', route: '/decision-sprint', stage: 'MORE', icon: ClipboardList, inlineActions: ['open_tool'] },
  { key: 'find_angel', label: 'Find your Angel', route: '/investors', stage: 'MORE', icon: Sparkles, entitlement: 'angels_community', inlineActions: ['open_tool'] },
  { ...catalogTool('vc_search', Search, ['toggle_funding_bookmark', 'create_follow_up_task']), key: 'vc_search' },
  { ...catalogTool('accelerator_hunt', Rocket, ['toggle_funding_bookmark', 'create_follow_up_task']), key: 'accelerator_hunt' },
  { key: 'core_metrics', label: 'Core Metrics', route: '/core-metrics', stage: 'MORE', icon: BarChart3, inlineActions: ['update_kpi'] },
  { key: 'ai_goals', label: 'Goals Planner', route: '/ai-goals', stage: 'MORE', icon: Brain, inlineActions: ['open_tool'] },
  { ...catalogTool('email_templates', Mail, ['open_tool']), key: 'email_templates' },
  { key: 'prompt_library', label: 'Prompt Library', route: '/prompt-library', stage: 'MORE', icon: Library, entitlement: 'prompt_library', inlineActions: ['toggle_content_bookmark'] },
  { ...catalogTool('insighta_test', Sparkles, ['open_tool']), key: 'insighta_test' },
  { key: 'newspaper', label: 'Newspaper', route: '/newspaper', stage: 'MORE', icon: FileText, entitlement: 'newspaper', inlineActions: ['toggle_content_bookmark'] },
  { key: 'files', label: 'Files', route: '/dashboard/files', stage: 'MORE', icon: FileText, inlineActions: ['create_task'] },
  { key: 'dashboard', label: 'Dashboard', route: '/dashboard', stage: 'MORE', icon: Sparkles, inlineActions: ['open_tool'] },
  { key: 'founder_cycle', label: 'Founder Execution Cycle', route: '/bizmap-ai', stage: 'MORE', icon: Target, inlineActions: ['open_tool'] },
];

export const DASHBOARD_TOOL_REGISTRY = Object.fromEntries(
  definitions.map((definition) => [definition.key, definition]),
) as Record<string, DashboardToolDefinition>;

export const DASHBOARD_TOOL_DEFINITIONS = definitions;

export function getDashboardTool(key: string | null | undefined): DashboardToolDefinition {
  return DASHBOARD_TOOL_REGISTRY[key ?? ''] ?? DASHBOARD_TOOL_REGISTRY.dashboard;
}
