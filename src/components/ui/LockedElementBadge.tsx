/**
 * Pattern B — Locked Element Badge
 *
 * Use this for in-page elements that are gated by plan or stage progression:
 * - Stage tool cards on the Dashboard (Rookie: locked_progressive)
 * - "View Profile" buttons on VC Search / Accelerator Hunt
 * - Prompt Library category tabs (Rookie: non-Business-Case categories)
 *
 * The child element is rendered but overlaid with a lock badge.
 * Clicking anywhere on the wrapper opens a small upgrade modal.
 */

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { PLAN_LABELS } from '@/config/planPermissions';
import { useSubscription } from '@/hooks/useSubscription';
import { normalizePlanId, trackUpgradeClicked } from '@/lib/analytics';

interface LockedElementBadgeProps {
  /** Children are rendered but overlaid / intercepted */
  children: React.ReactNode;
  /**
   * 'plan'        — locked because the user's tier is too low
   * 'progressive' — locked until a prior stage is completed (Rookie only)
   */
  reason: 'plan' | 'progressive';
  /** Required plan (only used when reason === 'plan') */
  requiredPlan?: 'rising' | 'pro';
  /** Name of the feature being locked (shown in modal headline) */
  featureName?: string;
  /**
   * Only used when reason === 'progressive'.
   * E.g. "PMF Lab" → "Complete PMF Lab to unlock this tool."
   */
  previousStage?: string;
  /** Optional extra class names on the wrapper div */
  className?: string;
}

export function LockedElementBadge({
  children,
  reason,
  requiredPlan = 'rising',
  featureName = 'This feature',
  previousStage,
  className = '',
}: LockedElementBadgeProps) {
  const [open, setOpen] = useState(false);
  const { subscriptionData } = useSubscription();
  const planLabel = PLAN_LABELS[requiredPlan];

  const modalTitle =
    reason === 'progressive'
      ? `Complete ${previousStage ?? 'the previous stage'} first`
      : `${planLabel} Plan Required`;

  const modalBody =
    reason === 'progressive'
      ? `${featureName} unlocks after you complete ${previousStage ?? 'the previous stage'}. Finish it first to continue your journey.`
      : `${featureName} is available on the ${planLabel} plan and above. Upgrade to unlock it.`;

  return (
    <>
      {/* Wrapper intercepts clicks and shows lock badge */}
      <div
        className={`relative group ${className}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        style={{ cursor: 'pointer' }}
      >
        {/* Greyed-out children */}
        <div className="pointer-events-none select-none opacity-50 grayscale">
          {children}
        </div>

        {/* Lock badge — top-right corner */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/90 border border-border shadow-sm">
          <Lock className="w-3 h-3 text-muted-foreground" />
          <span className="text-caption font-semibold uppercase tracking-wider text-muted-foreground">
            {reason === 'progressive' ? 'Locked' : planLabel}
          </span>
        </div>
      </div>

      {/* Upgrade / unlock modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm text-center p-8">
          <DialogTitle className="sr-only">{modalTitle}</DialogTitle>

          {/* Icon */}
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Plan badge (plan locks only) */}
          {reason === 'plan' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-primary">
                {planLabel} Plan
              </span>
            </div>
          )}

          {/* Headline */}
          <h3 className="text-base font-bold text-foreground mb-2">
            {modalTitle}
          </h3>

          {/* Body */}
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {modalBody}
          </p>

          {/* CTA */}
          {reason === 'plan' ? (
            <Button
              asChild
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Link
                to="/pricing"
                onClick={() => {
                  trackUpgradeClicked({
                    from_plan: normalizePlanId(subscriptionData?.subscription_tier),
                    to_plan: normalizePlanId(requiredPlan),
                    location: 'feature_gate',
                  });
                  setOpen(false);
                }}
              >
                Upgrade to {planLabel}
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full font-semibold"
              onClick={() => setOpen(false)}
            >
              Got it
            </Button>
          )}

          <button
            onClick={() => setOpen(false)}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
