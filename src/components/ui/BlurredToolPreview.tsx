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

interface BlurredToolPreviewProps {
  /** Content to render underneath (blurred when locked, normal when accessible) */
  children: ReactNode;
  /** Whether to show the blur + lock overlay */
  locked: boolean;
  /** Short title for the lock overlay card */
  featureName: string;
  /** What the user needs to do to unlock this tool */
  unlockCondition: string;
  /** 'rising' | 'pro' — if set, shows an Upgrade CTA instead of a completion message */
  requiredPlan?: 'rising' | 'pro';
}

export function BlurredToolPreview({
  children,
  locked,
  featureName,
  unlockCondition,
  requiredPlan,
}: BlurredToolPreviewProps) {
  const navigate = useNavigate();

  if (!locked) return <>{children}</>;

  return (
    <div className="relative overflow-hidden">
      {/* Blurred, non-interactive tool content */}
      <div
        className="pointer-events-none select-none"
        style={{ filter: 'blur(6px)', opacity: 0.45 }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Lock overlay — centered over the blurred content */}
      <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/30 backdrop-blur-[2px]">
        <div className="mx-4 max-w-sm w-full rounded-2xl border border-border/60 bg-card/90 backdrop-blur-md shadow-2xl p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/20 mx-auto">
            <Lock className="w-6 h-6 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">{featureName}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{unlockCondition}</p>
          </div>

          {requiredPlan ? (
            <Button
              onClick={() => navigate('/pricing')}
              className="w-full gap-2"
            >
              Upgrade to {requiredPlan === 'pro' ? 'Pro' : 'Rising'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="w-full"
            >
              Go Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
