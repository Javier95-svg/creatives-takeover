/**
 * Bell notifications sent by a founder tool carry that tool's identity: its
 * icon instead of the founder's own photo, and its name first ("GTM
 * Strategist: 22 companies are ready to contact…").
 *
 * A notification names its tool in metadata.tool. Types sent before that
 * field existed are mapped here so older notifications look the same.
 */

export type NotificationTool = 'icp_builder' | 'demo_studio' | 'pmf_lab' | 'mvp_builder' | 'gtm_strategist' | 'traction_engine';

export const NOTIFICATION_TOOLS: Record<NotificationTool, { name: string; route: string }> = {
  icp_builder: { name: 'ICP Builder', route: '/icp-builder' },
  demo_studio: { name: 'Demo Studio', route: '/demo-studio' },
  pmf_lab: { name: 'PMF Lab', route: '/pmf-lab' },
  mvp_builder: { name: 'MVP Builder', route: '/mvp-builder' },
  gtm_strategist: { name: 'GTM Strategist', route: '/go-to-market' },
  traction_engine: { name: 'Traction Engine', route: '/traction-engine' },
};

// Notification types each tool sent before metadata.tool existed.
const TOOL_BY_TYPE: Record<string, NotificationTool> = {
  customer_research_ready: 'gtm_strategist',
};

const isTool = (value: unknown): value is NotificationTool => typeof value === 'string' && value in NOTIFICATION_TOOLS;

/** The tool that sent a notification, or null for everything else (people, posts, announcements). */
export function notificationTool(notification: { notification_type: string; metadata?: Record<string, unknown> | null }): NotificationTool | null {
  const named = notification.metadata?.tool;
  if (isTool(named)) return named;
  return TOOL_BY_TYPE[notification.notification_type] ?? null;
}

/** "GTM Strategist: 22 companies are ready…", without doubling a name the text already starts with. */
export function toolNotificationText(tool: NotificationTool, text: string): string {
  const { name } = NOTIFICATION_TOOLS[tool];
  const body = text.trim();
  return body.toLowerCase().startsWith(name.toLowerCase()) ? body : `${name}: ${body}`;
}
