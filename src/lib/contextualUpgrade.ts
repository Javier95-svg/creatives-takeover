import { captureEvent } from '@/lib/analytics';
import type { Plan } from '@/config/planPermissions';

/**
 * Contextual upgrade prompt system.
 *
 * A single instrumentation taxonomy for every rule-based, event-driven upgrade
 * prompt across the platform. The prompts fire on real friction events (credit
 * depletion, plan gates, booking blocks, activation milestones) — never on
 * timers — and every impression, CTA click, dismissal, and resulting conversion
 * is logged with the trigger attached. That event stream is the foundation for
 * the success metrics (prompt-to-conversion rate per trigger, time-to-upgrade,
 * credit-purchase frequency, week-over-week free→paid) and for any later
 * personalization layer. No ML or inferred intent is used here.
 */
export type ContextualUpgradeTrigger =
  | 'mvp_credit_low' // MVP Builder balance at/under the low-water mark (~20%)
  | 'mvp_credit_zero' // MVP Builder balance exhausted
  | 'stage_gate' // Rookie hit a plan-locked tool (PMF Lab, GTM Strategist, …)
  | 'mentor_booking_gate' // Free-tier mentor booking blocked
  | 'activation_complete'; // Just finished a key milestone (ICP output, Demo saved)

export type ContextualUpgradeOutcome = 'plan' | 'credits';

export interface ContextualUpgradeProps {
  trigger: ContextualUpgradeTrigger;
  /** Tool/surface the prompt fired from, e.g. "mvp_builder", "pmf_lab". */
  sourceTool?: string;
  currentPlan?: Plan | string;
  targetPlan?: Plan | string;
  /** Resolution offered: a plan upgrade or a credit top-up. */
  outcome?: ContextualUpgradeOutcome;
  /** Credit balance at the moment the prompt fired (depletion triggers). */
  creditsRemaining?: number;
  /** Free-form context, e.g. the feature/tool name that was blocked. */
  context?: string;
}

const EVENT = {
  impression: 'contextual_upgrade_impression',
  cta: 'contextual_upgrade_cta_clicked',
  dismissed: 'contextual_upgrade_dismissed',
  converted: 'contextual_upgrade_converted',
} as const;

const PENDING_KEY = 'ct_contextual_upgrade_pending';
/** A click should only attribute a conversion that happens reasonably soon. */
const PENDING_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function routeNow(): string | undefined {
  return typeof window !== 'undefined' ? window.location.pathname : undefined;
}

function baseProps(props: ContextualUpgradeProps) {
  return {
    trigger: props.trigger,
    source_tool: props.sourceTool,
    current_plan: props.currentPlan,
    target_plan: props.targetPlan,
    outcome: props.outcome,
    credits_remaining: props.creditsRemaining,
    context: props.context,
    route: routeNow(),
  };
}

/** A prompt became visible on a real friction event. */
export function trackContextualUpgradeImpression(props: ContextualUpgradeProps): void {
  captureEvent(EVENT.impression, baseProps(props));
}

/**
 * The user clicked a primary CTA (upgrade or buy credits). Also stashes the
 * trigger so the downstream conversion (after the Stripe round trip) can be
 * attributed back to the prompt that drove it.
 */
export function trackContextualUpgradeCtaClicked(props: ContextualUpgradeProps): void {
  captureEvent(EVENT.cta, baseProps(props));
  recordPendingContextualConversion(props);
}

/** The user dismissed the prompt (no guilt framing on the UI side). */
export function trackContextualUpgradeDismissed(props: ContextualUpgradeProps): void {
  captureEvent(EVENT.dismissed, baseProps(props));
}

/**
 * A conversion (plan upgrade or credit purchase) completed. Emitted from the
 * post-checkout surface; `attributeContextualConversion` is the convenience
 * path that pulls the pending trigger written at CTA-click time.
 */
export function trackContextualUpgradeConverted(
  props: ContextualUpgradeProps & { revenueUsd?: number },
): void {
  captureEvent(EVENT.converted, {
    ...baseProps(props),
    revenue_usd: props.revenueUsd,
  });
}

interface PendingConversion {
  trigger: ContextualUpgradeTrigger;
  sourceTool?: string;
  targetPlan?: string;
  outcome?: ContextualUpgradeOutcome;
  ts: number;
}

export function recordPendingContextualConversion(props: ContextualUpgradeProps): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PendingConversion = {
      trigger: props.trigger,
      sourceTool: props.sourceTool,
      targetPlan: props.targetPlan ? String(props.targetPlan) : undefined,
      outcome: props.outcome,
      ts: Date.now(),
    };
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(payload));
  } catch {
    /* localStorage unavailable — attribution is best-effort */
  }
}

/**
 * Pull and clear a pending conversion if it was recorded within the window.
 * Returns null when there is nothing to attribute (e.g. organic upgrade with no
 * preceding prompt click) so the caller can skip emitting.
 */
export function consumePendingContextualConversion(
  withinMs: number = PENDING_WINDOW_MS,
): { props: ContextualUpgradeProps; msFromCta: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(PENDING_KEY);
    const parsed = JSON.parse(raw) as PendingConversion;
    const msFromCta = Date.now() - parsed.ts;
    if (!parsed.trigger || msFromCta > withinMs) return null;
    return {
      props: {
        trigger: parsed.trigger,
        sourceTool: parsed.sourceTool,
        targetPlan: parsed.targetPlan,
        outcome: parsed.outcome,
      },
      msFromCta,
    };
  } catch {
    return null;
  }
}

/**
 * Convenience for post-checkout surfaces: if the user reached here via a
 * contextual prompt CTA in the last hour, emit the conversion with the original
 * trigger and the elapsed time (feeds time-from-impression-to-upgrade).
 */
export function attributeContextualConversion(extra?: {
  currentPlan?: Plan | string;
  revenueUsd?: number;
}): void {
  const pending = consumePendingContextualConversion();
  if (!pending) return;
  captureEvent(EVENT.converted, {
    ...baseProps({ ...pending.props, currentPlan: extra?.currentPlan }),
    ms_from_cta: pending.msFromCta,
    revenue_usd: extra?.revenueUsd,
  });
}
