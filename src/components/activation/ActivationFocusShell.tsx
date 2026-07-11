import { useEffect, useRef } from 'react';
import { Check, Clock3, LogOut } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ACTIVATION_CATALOG } from '@/lib/activationJourneyV2';
import type { ActivationIntent } from '@/lib/retentionSystem';
import { useActivationJourneyV2 } from '@/hooks/useActivationJourneyV2';

export function ActivationFocusShell() {
  const activation = useActivationJourneyV2();
  const inputTracked = useRef(false);

  useEffect(() => {
    if (!activation.active || activation.journey?.firstInputAt) return;
    const handleFirstInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
      if (!target.value.trim() || inputTracked.current) return;
      inputTracked.current = true;
      void activation.track('activation_first_input_submitted', {
        intent: activation.journey?.selectedIntent,
        destination: window.location.pathname,
        interaction_type: target.tagName.toLowerCase(),
      });
    };
    document.addEventListener('change', handleFirstInput, true);
    document.addEventListener('blur', handleFirstInput, true);
    return () => {
      document.removeEventListener('change', handleFirstInput, true);
      document.removeEventListener('blur', handleFirstInput, true);
    };
  }, [activation]);

  useEffect(() => {
    if (!activation.active) return;
    document.body.classList.add('activation-focus-mode');
    return () => document.body.classList.remove('activation-focus-mode');
  }, [activation.active]);
  if (!activation.active || !activation.journey || !activation.catalog) return null;

  const eligibleAlternatives = (Object.keys(ACTIVATION_CATALOG) as ActivationIntent[])
    .filter((intent) => ['find_mentor', 'build_demo', 'run_icp', 'start_validation', 'build_mvp', 'plan_gtm', 'log_traction', 'analyze_pitch_deck'].includes(intent))
    .filter((intent) => intent !== activation.journey?.selectedIntent);
  const currentStep = activation.journey.firstOutputAt ? 3 : activation.journey.firstInputAt ? 2 : 1;

  return (
    <section className="sticky top-0 z-[70] border-b border-accent-teal/30 bg-background/95 shadow-sm backdrop-blur" aria-label="Your first-win journey">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-accent-teal text-white hover:bg-accent-teal">Your first win</Badge>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> About {activation.catalog.estimatedMinutes} min</span>
          </div>
          <h1 data-activation-focus-title className="mt-1 truncate font-space-grotesk text-lg font-semibold sm:text-xl">{activation.catalog.label}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {activation.catalog.steps.map((step, index) => (
              <span key={step} className={`inline-flex items-center gap-1.5 ${index + 1 < currentStep ? 'text-foreground' : ''}`}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-teal/15 font-semibold text-accent-teal">{index + 1 < currentStep ? <Check className="h-3 w-3" /> : index + 1}</span>
                {step}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <details className="relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Change goal</summary>
            <div className="absolute right-0 top-12 z-10 grid w-72 gap-1 rounded-xl border bg-popover p-2 shadow-xl">
              {eligibleAlternatives.map((intent) => (
                <button key={intent} type="button" className="min-h-11 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => void activation.changeGoal(intent)}>
                  <span className="block font-semibold">{ACTIVATION_CATALOG[intent].label}</span>
                  <span className="text-xs text-muted-foreground">{ACTIVATION_CATALOG[intent].output}</span>
                </button>
              ))}
            </div>
          </details>
          <Button variant="ghost" className="min-h-11 gap-2 rounded-full" onClick={() => void activation.exit()}>
            <LogOut className="h-4 w-4" /> Exit to dashboard
          </Button>
        </div>
      </div>
      <div className="sr-only" aria-live="polite">Step {currentStep} of 3. {activation.catalog.output}</div>
    </section>
  );
}
