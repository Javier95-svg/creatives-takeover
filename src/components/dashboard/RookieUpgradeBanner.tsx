/**
 * Dismissible upgrade banner shown to Rookie-plan users at the top of the dashboard.
 * Only renders for 'rookie' tier — hidden for Rising and Pro.
 */

import { useState } from 'react';
import { X, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { usePlanAccess } from '@/hooks/usePlanAccess';

export function RookieUpgradeBanner() {
  const { plan } = usePlanAccess('dashboard_mode');
  const [dismissed, setDismissed] = useState(false);

  if (plan !== 'rookie' || dismissed) return null;

  return (
    <div className="relative flex items-center justify-between gap-4 px-5 py-3 rounded-xl border border-primary/30 bg-primary/8 backdrop-blur-sm animate-fade-in-up">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-primary" />
        </div>
        <p className="text-sm text-foreground/90 leading-snug">
          <span className="font-semibold">You're on the Rookie plan.</span>{' '}
          Unlock PMF Lab, Email Templates, extra monthly limits, and more investor access by upgrading to Starter.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          asChild
          size="sm"
          className="h-7 px-3 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Link to="/pricing">
            Upgrade
            <ArrowRight className="ml-1 w-3 h-3" />
          </Link>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss upgrade banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
