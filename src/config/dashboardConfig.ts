/**
 * Plan-driven dashboard configuration.
 *
 * Controls which widgets and stage cards are shown per plan.
 * Import DASHBOARD_CONFIG[plan] in Dashboard.tsx — never hardcode plan checks in widgets.
 */

import { Plan } from '@/config/planPermissions';

export interface DashboardConfig {
  /** Stage numbers that are fully active/accessible */
  activeStages: number[];
  /** Stage numbers that render as locked cards (progressive lock) */
  lockedStages: number[];
  /** Whether to show the upgrade CTA banner at the top */
  showUpgradeBanner: boolean;
  /** Which widgets to render in the sidebar / header area */
  widgets: DashboardWidget[];
}

export type DashboardWidget =
  | 'progress_tracker'
  | 'stage_tools'
  | 'upgrade_banner'
  | 'discovery_call_counter'
  | 'vc_quota_counter'
  | 'accelerator_quota_counter'
  | 'angels_shortcut'
  | 'whatsapp_link'
  | 'unlimited_calls_badge';

export const DASHBOARD_CONFIG: Record<Plan, DashboardConfig> = {
  rookie: {
    activeStages: [1, 2, 3],
    lockedStages: [4, 5, 6, 7],
    showUpgradeBanner: true,
    widgets: ['progress_tracker', 'stage_tools', 'upgrade_banner'],
  },
  rising: {
    activeStages: [1, 2, 3, 4, 5, 6, 7],
    lockedStages: [],
    showUpgradeBanner: false,
    widgets: [
      'progress_tracker',
      'stage_tools',
      'discovery_call_counter',
      'vc_quota_counter',
      'accelerator_quota_counter',
    ],
  },
  pro: {
    activeStages: [1, 2, 3, 4, 5, 6, 7],
    lockedStages: [],
    showUpgradeBanner: false,
    widgets: [
      'progress_tracker',
      'stage_tools',
      'angels_shortcut',
      'whatsapp_link',
      'unlimited_calls_badge',
    ],
  },
};
