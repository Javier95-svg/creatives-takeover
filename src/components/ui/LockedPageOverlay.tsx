/**
 * Pattern A — Locked Page Overlay
 *
 * Use this for whole-page features that are gated by plan:
 * - /community/angels (Pro only)
 * - Email Templates (Rising+)
 * - Pitch Deck Analyzer (Rising+)
 *
 * The page shell/header renders normally above this overlay.
 * This component replaces only the main content area.
 */

import { Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PLAN_LABELS, Plan } from '@/config/planPermissions';

interface LockedPageOverlayProps {
  /** The minimum plan needed to unlock this feature */
  requiredPlan: 'rising' | 'pro';
  /** Display name of the feature being locked */
  featureName: string;
  /** One or two sentences describing what the user would get */
  description: string;
  /** Optional list of benefit bullet points */
  benefits?: string[];
}

export function LockedPageOverlay({
  requiredPlan,
  featureName,
  description,
  benefits,
}: LockedPageOverlayProps) {
  const planLabel = PLAN_LABELS[requiredPlan];

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-16 text-center">
      {/* Lock icon */}
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
        <Lock className="w-6 h-6 text-muted-foreground" />
      </div>

      {/* Plan badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-4">
        <span className="text-xs font-semibold tracking-widest uppercase text-primary">
          {planLabel} Plan
        </span>
      </div>

      {/* Headline */}
      <h2 className="text-xl font-bold text-foreground mb-3">
        {featureName} is a {planLabel} feature
      </h2>

      {/* Description */}
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {/* Optional benefits list */}
      {benefits && benefits.length > 0 && (
        <ul className="text-sm text-muted-foreground mb-8 space-y-1 text-left max-w-xs">
          {benefits.map((benefit, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
        <Link to="/pricing">
          Upgrade to {planLabel}
          <ArrowRight className="ml-2 w-4 h-4" />
        </Link>
      </Button>

      <p className="text-xs text-muted-foreground mt-4">
        No credit card required to explore · Upgrade anytime
      </p>
    </div>
  );
}
