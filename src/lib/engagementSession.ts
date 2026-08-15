export const ENGAGEMENT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const ENGAGEMENT_RECENT_INTERACTION_MS = 60 * 1000;
export const ENGAGEMENT_TICK_MS = 15 * 1000;

export type EngagementSection =
  | 'dashboard'
  | 'bizmap'
  | 'insighta'
  | 'network'
  | 'resources'
  | 'account'
  | 'platform';

export type MeaningfulActionType =
  | 'task_completed'
  | 'routine_completed'
  | 'artifact_created'
  | 'artifact_updated'
  | 'research_saved'
  | 'pipeline_updated'
  | 'mentor_saved'
  | 'message_sent'
  | 'booking_created'
  | 'customer_evidence_recorded'
  | 'return_cue_scheduled';

export interface EngagementSessionState {
  id: string;
  startedAt: number;
  lastActivityAt: number;
  lastInteractionAt: number;
  activeSeconds: number;
  interactionCount: number;
  meaningfulActionCount: number;
  summarySequence: number;
  startedEventSent: boolean;
  lastSummarySignature: string | null;
  entrySection: EngagementSection;
  currentSection: EngagementSection;
}

export interface MeaningfulActionDetail {
  actionType: MeaningfulActionType;
  section: EngagementSection;
  plan: string;
  daysSinceSignup: number;
  recommendationKey?: string | null;
  creditCost?: number;
  entityType?: string | null;
  entityId?: string | null;
}

export const MEANINGFUL_ACTION_EVENT = 'ct:meaningful-action';

export function resolveEngagementSection(pathname: string): EngagementSection {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (
    pathname.startsWith('/bizmap-ai')
    || pathname.startsWith('/icp-builder')
    || pathname.startsWith('/pmf-lab')
    || pathname.startsWith('/demo-studio')
    || pathname.startsWith('/mvp-builder')
    || pathname.startsWith('/tech-stack')
    || pathname.startsWith('/go-to-market')
  ) return 'bizmap';
  if (
    pathname.startsWith('/insighta')
    || pathname.startsWith('/vc-search')
    || pathname.startsWith('/accelerator-hunt')
    || pathname.startsWith('/pitch-deck-analyzer')
    || pathname.startsWith('/traction-engine')
    || pathname.startsWith('/email-templates')
  ) return 'insighta';
  if (
    pathname.startsWith('/mentorship')
    || pathname.startsWith('/messages')
    || pathname.startsWith('/co-founder')
    || pathname.startsWith('/investors')
    || pathname.startsWith('/marketplace')
  ) return 'network';
  if (
    pathname.startsWith('/newspaper')
    || pathname.startsWith('/podcast')
    || pathname.startsWith('/resources')
    || pathname.startsWith('/prompt-library')
  ) return 'resources';
  if (pathname.startsWith('/account') || pathname.startsWith('/settings')) return 'account';
  return 'platform';
}

export function shouldStartNewEngagementSession(
  state: EngagementSessionState | null,
  now: number,
): boolean {
  return !state || now - state.lastActivityAt >= ENGAGEMENT_SESSION_TIMEOUT_MS;
}

export function createEngagementSession(
  now: number,
  section: EngagementSection,
  id = crypto.randomUUID(),
): EngagementSessionState {
  return {
    id,
    startedAt: now,
    lastActivityAt: now,
    lastInteractionAt: now,
    activeSeconds: 0,
    interactionCount: 0,
    meaningfulActionCount: 0,
    summarySequence: 0,
    startedEventSent: false,
    lastSummarySignature: null,
    entrySection: section,
    currentSection: section,
  };
}

export function engagementSummarySignature(state: EngagementSessionState): string {
  return [
    state.activeSeconds,
    state.interactionCount,
    state.meaningfulActionCount,
    state.currentSection,
  ].join(':');
}

export function recordMeaningfulAction(detail: MeaningfulActionDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<MeaningfulActionDetail>(MEANINGFUL_ACTION_EVENT, { detail }));
  void import('./analytics.ts').then(({ captureEvent }) => {
    captureEvent('meaningful_action_completed', {
      session_id: readCurrentEngagementSessionId(),
      section: detail.section,
      plan: detail.plan,
      days_since_signup: detail.daysSinceSignup,
      recommendation_key: detail.recommendationKey ?? null,
      action_type: detail.actionType,
      credit_cost: detail.creditCost ?? 0,
      entity_type: detail.entityType ?? null,
      entity_id: detail.entityId ?? null,
    });
  });
}

export function readCurrentEngagementSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem('ct_engagement_session_v2');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EngagementSessionState>;
    return typeof parsed.id === 'string' ? parsed.id : null;
  } catch {
    return null;
  }
}
