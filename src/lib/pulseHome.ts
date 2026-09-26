import { FOUNDER_TOOL_CATALOG } from '../config/founderToolCatalog.ts';
import type { DashboardAction, DashboardSnapshot } from '../types/dashboardSnapshot.ts';
import { PULSE_UUID } from './pulseScope.ts';
import type { PulseSourceReference } from './pulseSources.ts';

export type PulseHomeConcept = 'founder-guide' | 'command-center' | 'guided-journey';
export interface PulseHomeAction {
  kind: 'tool' | 'mentor' | 'browse' | 'article' | 'podcast' | 'service';
  id: string;
  title: string;
  reason: string;
  route: string;
  image?: string;
  slug?: string;
}
export interface PulseHomeMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: PulseHomeAction[];
  sources?: PulseSourceReference[];
}
export interface PulseHomePriority { id: string; title: string; route: string }

// Models supply identifiers, never executable URLs. Only these destinations
// and canonical mentor slugs can be rendered as actions.
export function validateHomeActions(value: unknown): PulseHomeAction[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const action = item as PulseHomeAction;
    if (typeof action.id !== 'string' || typeof action.title !== 'string' || typeof action.reason !== 'string') return [];
    if (action.kind === 'tool') {
      const tool = FOUNDER_TOOL_CATALOG.find(tool => tool.key === action.id);
      return tool ? [{ ...action, title: tool.name, route: tool.route }] : [];
    }
    if (action.kind === 'browse') {
      const routes: Record<string, string> = { mentorship: '/mentorship', newspaper: '/newspaper', podcast: '/podcast', marketplace: '/marketplace' };
      return Object.prototype.hasOwnProperty.call(routes, action.id) ? [{ ...action, route: routes[action.id], image: undefined }] : [];
    }
    if (['article', 'podcast', 'service'].includes(action.kind) && PULSE_UUID.test(action.id)) {
      if (action.kind === 'podcast') return [{ ...action, route: `/podcast?episode=${encodeURIComponent(action.id)}`, image: undefined }];
      if (typeof action.slug !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,199}$/i.test(action.slug)) return [];
      return [{ ...action, route: `${action.kind === 'article' ? '/newspaper' : '/marketplace'}/${encodeURIComponent(action.slug)}`, image: undefined }];
    }
    if (action.kind === 'mentor' && /^[a-z0-9-]+$/i.test(action.id) && /^\/mentorship\/[a-z0-9-]+$/.test(action.route)) {
      return [{ ...action, image: typeof action.image === 'string' && /^https:\/\//.test(action.image) ? action.image : undefined }];
    }
    return [];
  });
}

function safePriorityRoute(route?: string | null) {
  if (!route) return '/dashboard/tasks';
  if (!/^\/(?!\/)[a-z0-9/_-]+(?:[?#][^\\\s]*)?$/i.test(route)) return '/dashboard/tasks';
  return route;
}

export function homePriorities(snapshot: DashboardSnapshot | null, primary?: DashboardAction | null, toolRoute: (key: string | null) => string | undefined = key => FOUNDER_TOOL_CATALOG.find(tool => tool.key === key)?.route): PulseHomePriority[] {
  if (!snapshot) return [];
  const completed = new Set(snapshot.focus.dueToday.filter(task => task.completed).map(task => task.id));
  const actions = [primary ?? snapshot.focus.primaryAction, ...snapshot.focus.secondaryActions]
    .filter((action): action is DashboardAction => Boolean(action) && !(action?.entityId && completed.has(action.entityId)));
  const candidates: PulseHomePriority[] = actions.map(action => ({ id: action.entityId ?? action.key, title: action.title, route: safePriorityRoute(action.actionUrl || toolRoute(action.toolKey)) }));
  candidates.push(...snapshot.focus.dueToday.filter(task => !task.completed).map(task => ({ id: task.id, title: task.title, route: '/dashboard/tasks' })));
  const ids = new Set<string>();
  const titles = new Set<string>();
  return candidates.filter(item => {
    const title = item.title.trim().toLowerCase();
    if (!title || ids.has(item.id) || titles.has(title)) return false;
    ids.add(item.id); titles.add(title); return true;
  }).slice(0, 3);
}
