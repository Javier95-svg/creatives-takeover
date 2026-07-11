import { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ACTIVATION_CATALOG, buildActivationJourneyUrl, parseActivationJourney, type ActivationJourneyV2 } from '@/lib/activationJourneyV2';
import { isActivationV2Enabled } from '@/lib/activationRollout';

export function ActivationResumeBanner() {
  const { user } = useAuth();
  const location = useLocation();
  const flag = useFeatureFlagEnabled('onboarding-activation-v2');
  const [journey, setJourney] = useState<ActivationJourneyV2 | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!user || !isActivationV2Enabled(flag) || new URLSearchParams(location.search).get('activation') === '1') {
      setJourney(null);
      return;
    }
    let cancelled = false;
    void supabase.from('profiles').select('user_preferences').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (cancelled) return;
      const preferences = data?.user_preferences && typeof data.user_preferences === 'object' ? data.user_preferences as Record<string, unknown> : null;
      const candidate = parseActivationJourney(preferences?.activationJourney);
      setJourney(candidate?.status === 'active' ? candidate : null);
    });
    return () => { cancelled = true; };
  }, [flag, location.pathname, location.search, user]);

  if (!journey || hidden) return null;
  const entry = ACTIVATION_CATALOG[journey.selectedIntent];
  const href = buildActivationJourneyUrl(journey.selectedIntent, journey.journeyId, journey.resumeUrl);

  return (
    <aside className="fixed inset-x-3 bottom-20 z-[65] mx-auto max-w-2xl rounded-xl border border-accent-teal/30 bg-card p-3 shadow-2xl md:bottom-4" aria-label="Continue onboarding">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-teal">Continue your first win</p>
          <p className="truncate text-sm font-semibold">{entry.label} · {entry.output}</p>
        </div>
        <Button asChild size="sm" className="min-h-11 shrink-0 gap-2 rounded-full">
          <Link to={href}>Continue <ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-full" aria-label="Hide first-win reminder" onClick={() => setHidden(true)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
