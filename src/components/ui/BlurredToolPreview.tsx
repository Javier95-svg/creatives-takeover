/**
 * BlurredToolPreview — wraps tool content with a blur overlay when locked.
 *
 * Shows the actual tool UI underneath (blurred + pointer-events disabled) and
 * displays a centered card explaining how to unlock it.
 */

import type { ReactNode } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { normalizePlanId, trackUpgradeClicked } from '@/lib/analytics';

interface BlurredToolPreviewProps {
  /** Content to render underneath (blurred when locked, normal when accessible) */
  children: ReactNode;
  /** Whether to show the blur + lock overlay */
  locked: boolean;
  /** Short title for the lock overlay card */
  featureName: string;
  /** What the user needs to do to unlock this tool */
  unlockCondition: string;
  /** Plan to show on the upgrade CTA when the tool is tier-gated */
  requiredPlan?: 'starter' | 'rising' | 'pro';
}

export function BlurredToolPreview({
  children,
  locked,
  featureName,
  unlockCondition,
  requiredPlan,
}: BlurredToolPreviewProps) {
  const navigate = useNavigate();
  const { subscriptionData } = useSubscription();

  if (!locked) return <>{children}</>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* FIX(dead-click): shared-gated-ui — replaced blurred live content with a static locked-state card so users do not click unusable controls underneath. */}
      <div className="rounded-3xl border border-border/60 bg-card/95 p-8 text-center shadow-xl backdrop-blur-md sm:p-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>

        <div className="mt-5 space-y-2">
          <h3 className="text-xl font-bold text-foreground">{featureName}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{unlockCondition}</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {requiredPlan ? (
            <Button
              onClick={() => {
                trackUpgradeClicked({
                  from_plan: normalizePlanId(subscriptionData?.subscription_tier),
                  to_plan: normalizePlanId(requiredPlan),
                  location: 'feature_gate',
                });
                navigate('/pricing');
              }}
              className="gap-2"
            >
              Upgrade to {requiredPlan === 'pro' ? 'Pro' : requiredPlan === 'rising' ? 'Rising' : 'Starter'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Go Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
