/**
 * Central upgrade-trigger manager.
 *
 * Rules (from UX spec):
 *  - Only ONE upgrade surface is visible at a time across the entire dashboard.
 *  - Triggers are behaviour-driven, never time-based nags.
 *  - Each trigger key can be dismissed for 14 days independently.
 *  - Active work is never blocked by a modal — callers decide the surface (banner / inline card / dialog).
 */

import { useCallback, useEffect, useState } from 'react';
import type { Plan } from '@/config/planPermissions';

export type UpgradeTriggerKey =
  | 'rookie_icp_complete'
  | 'rookie_waitlist_published'
  | 'rookie_quota_discovery'
  | 'rookie_quota_cofounder'
  | 'starter_stage3_complete'
  | 'starter_quota_discovery'
  | 'starter_quota_cofounder'
  | 'starter_tool_mvp'
  | 'starter_tool_tech'
  | 'starter_tool_gtm'
  | 'starter_tool_directories'
  | 'rising_quota_vc'
  | 'rising_quota_accelerator'
  | 'rising_fundraising_signal'
  | 'rising_pitch_deck_heavy';

export interface UpgradeTriggerConfig {
  key: UpgradeTriggerKey;
  targetPlan: Plan;
  headline: string;
  body: string;
  ctaLabel: string;
}

export const UPGRADE_TRIGGER_CONFIGS: Record<UpgradeTriggerKey, UpgradeTriggerConfig> = {
  rookie_icp_complete: {
    key: 'rookie_icp_complete',
    targetPlan: 'starter',
    headline: 'ICP clarified. Next: validate demand.',
    body: 'Starter unlocks PMF Lab, Email Templates, and deeper research access so you can test this ICP before building.',
    ctaLabel: 'See Starter',
  },
  rookie_waitlist_published: {
    key: 'rookie_waitlist_published',
    targetPlan: 'starter',
    headline: 'Waitlist live. Turn interest into evidence.',
    body: 'Starter unlocks PMF Lab so you can score your early traction and decide what to validate next.',
    ctaLabel: 'Validate with Starter',
  },
  rookie_quota_discovery: {
    key: 'rookie_quota_discovery',
    targetPlan: 'starter',
    headline: 'Discovery call used for this month.',
    body: 'Starter includes 2 discovery calls per month — double the mentorship access.',
    ctaLabel: 'Upgrade to Starter',
  },
  rookie_quota_cofounder: {
    key: 'rookie_quota_cofounder',
    targetPlan: 'starter',
    headline: 'Co-founder post limit reached.',
    body: 'Starter doubles your monthly co-founder posts and unlocks structured validation tools.',
    ctaLabel: 'Upgrade to Starter',
  },
  starter_stage3_complete: {
    key: 'starter_stage3_complete',
    targetPlan: 'rising',
    headline: 'Validation shipped. Time to build.',
    body: 'Rising opens all 5 stages in parallel — MVP Builder, Tech Stack, GTM Strategist, and Directories are waiting.',
    ctaLabel: 'Unlock Rising',
  },
  starter_quota_discovery: {
    key: 'starter_quota_discovery',
    targetPlan: 'rising',
    headline: 'Monthly discovery calls used up.',
    body: 'Rising includes 3 calls per month plus broader investor research tools.',
    ctaLabel: 'Upgrade to Rising',
  },
  starter_quota_cofounder: {
    key: 'starter_quota_cofounder',
    targetPlan: 'rising',
    headline: 'Co-founder post limit reached.',
    body: 'Rising gives you unlimited co-founder posts and the full product cockpit.',
    ctaLabel: 'Upgrade to Rising',
  },
  starter_tool_mvp: {
    key: 'starter_tool_mvp',
    targetPlan: 'rising',
    headline: 'MVP Builder is a Rising feature.',
    body: 'Rising opens MVP Builder, Tech Stack, GTM Strategist, and Directories across all five stages.',
    ctaLabel: 'See Rising',
  },
  starter_tool_tech: {
    key: 'starter_tool_tech',
    targetPlan: 'rising',
    headline: 'Tech Stack Builder is a Rising feature.',
    body: 'Rising opens the full product cockpit so you can move from validation to building without switching tools.',
    ctaLabel: 'See Rising',
  },
  starter_tool_gtm: {
    key: 'starter_tool_gtm',
    targetPlan: 'rising',
    headline: 'GTM Strategist unlocks with Rising.',
    body: 'Get your go-to-market playbook alongside MVP Builder, Tech Stack, and Directories in one cockpit.',
    ctaLabel: 'See Rising',
  },
  starter_tool_directories: {
    key: 'starter_tool_directories',
    targetPlan: 'rising',
    headline: 'Directories unlocks with Rising.',
    body: 'Rising surfaces every launch directory alongside your full GTM and build workflow.',
    ctaLabel: 'See Rising',
  },
  rising_quota_vc: {
    key: 'rising_quota_vc',
    targetPlan: 'pro',
    headline: '10 VC profile views used this month.',
    body: 'Pro gives you unlimited VC and accelerator views plus the Angels Network for warm investor introductions.',
    ctaLabel: 'Upgrade to Pro',
  },
  rising_quota_accelerator: {
    key: 'rising_quota_accelerator',
    targetPlan: 'pro',
    headline: '10 accelerator views used this month.',
    body: 'Pro removes all research caps and opens a dedicated fundraising command layer.',
    ctaLabel: 'Upgrade to Pro',
  },
  rising_fundraising_signal: {
    key: 'rising_fundraising_signal',
    targetPlan: 'pro',
    headline: 'Ready to run investor outreach?',
    body: 'Pro opens the Angels Network and a fundraising-first War Room built for this exact phase.',
    ctaLabel: 'See Pro',
  },
  rising_pitch_deck_heavy: {
    key: 'rising_pitch_deck_heavy',
    targetPlan: 'pro',
    headline: "You're running investor prep.",
    body: 'Pro is built for this — Angels Network, unlimited research views, and a fundraising command layer.',
    ctaLabel: 'Upgrade to Pro',
  },
};

const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function getDismissKey(key: UpgradeTriggerKey): string {
  return `ct_upgrade_dismiss_${key}`;
}

function isDismissed(key: UpgradeTriggerKey): boolean {
  try {
    const raw = localStorage.getItem(getDismissKey(key));
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

function dismiss(key: UpgradeTriggerKey): void {
  try {
    localStorage.setItem(getDismissKey(key), String(Date.now()));
  } catch {
    // localStorage unavailable — silent fail
  }
}

export interface UseUpgradeTriggerReturn {
  /** The single active trigger to surface, or null if none. */
  activeTrigger: UpgradeTriggerConfig | null;
  /** Fire a trigger by key. Ignored if another surface is already active or this key was dismissed. */
  fire: (key: UpgradeTriggerKey) => void;
  /** Dismiss the current active trigger for 14 days. */
  dismissActive: () => void;
  /** Clear active trigger without persisting dismiss (e.g. after checkout navigation). */
  clearActive: () => void;
}

/**
 * useUpgradeTrigger — call once at dashboard root, pass the return value to children via prop or context.
 *
 * Example:
 *   const upgradeTrigger = useUpgradeTrigger();
 *   // in a child when the user hits their quota:
 *   upgradeTrigger.fire('rookie_quota_discovery');
 */
export function useUpgradeTrigger(): UseUpgradeTriggerReturn {
  const [activeTrigger, setActiveTrigger] = useState<UpgradeTriggerConfig | null>(null);

  const fire = useCallback((key: UpgradeTriggerKey) => {
    // Single-surface rule: don't replace an already-active prompt.
    setActiveTrigger((current) => {
      if (current !== null) return current;
      if (isDismissed(key)) return null;
      return UPGRADE_TRIGGER_CONFIGS[key];
    });
  }, []);

  const dismissActive = useCallback(() => {
    setActiveTrigger((current) => {
      if (current) dismiss(current.key);
      return null;
    });
  }, []);

  const clearActive = useCallback(() => {
    setActiveTrigger(null);
  }, []);

  return { activeTrigger, fire, dismissActive, clearActive };
}
