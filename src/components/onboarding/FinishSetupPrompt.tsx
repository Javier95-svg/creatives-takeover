import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Sparkles, X } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { trackFinishSetupPrompt, type FinishSetupSurface } from '@/lib/analytics';
import { shouldOfferOnboardingTopUp } from '@/lib/guidedOnboarding';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'ct_finish_setup_dismissed';

function readDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * "Finish setting up your workspace" for accounts that started from a free
 * tool. They are never forced into onboarding at the moment they got value;
 * this offers the short, pre-filled quiz and brings them back afterwards.
 * Renders nothing for anyone else, including while the profile is loading.
 */
export function FinishSetupPrompt({ surface, className }: { surface: FinishSetupSurface; className?: string }) {
  const { user } = useAuth();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(readDismissed);
  const shownRef = useRef(false);

  const profile = useQuery({
    queryKey: ['finish-setup-prompt', user?.id],
    enabled: Boolean(user),
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.schema('public').from('profiles')
        .select('onboarding_completed, dashboard_bootstrap_source, user_preferences, user_type')
        .eq('id', user!.id).abortSignal(signal).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const visible = !dismissed && Boolean(profile.data) && shouldOfferOnboardingTopUp(profile.data);

  useEffect(() => {
    if (!visible || shownRef.current) return;
    shownRef.current = true;
    trackFinishSetupPrompt('shown', { surface });
  }, [surface, visible]);

  if (!visible) return null;

  const returnPath = `${location.pathname}${location.search}`;
  const href = `/onboarding?source=tool_claim&return=${encodeURIComponent(returnPath)}`;

  return (
    <div
      role="region"
      aria-label="Finish setting up your workspace"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-accent-teal/30 bg-accent-teal/10 p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-teal/15 text-accent-teal">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Finish setting up your workspace</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            About 2 minutes. We have already filled in what you told us, so your missions and advice fit your project.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:pl-4">
        <Link
          to={href}
          onClick={() => trackFinishSetupPrompt('clicked', { surface })}
          className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Continue <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          aria-label="Dismiss for now"
          onClick={() => {
            try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage unavailable */ }
            setDismissed(true);
            trackFinishSetupPrompt('dismissed', { surface });
          }}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent-teal/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default FinishSetupPrompt;
