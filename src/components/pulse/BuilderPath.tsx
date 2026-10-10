import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Loader2, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { builderPath, hasChosenIdea } from '@/lib/builderPath';
import { cn } from '@/lib/utils';

/**
 * The Builder path on the home: Explore, Define, Validate, with the next step
 * one click away. Shown to builders only; the sidebar stays the same for
 * everyone. When all three steps are done the idea is a project, and the
 * Builder is offered the move to Founder, keeping the project and its history.
 */
export function BuilderPath({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const progress = useBizMapProgress();
  const [notYet, setNotYet] = useState(false);
  const idea = useQuery({
    queryKey: ['builder-path-idea', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data } = await supabase.schema('public').from('profiles').select('user_preferences').eq('id', user!.id).maybeSingle();
      return hasChosenIdea(data?.user_preferences);
    },
  });

  const graduate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('state_founder_segment' as never, { p_segment: 'founder', p_source: 'graduation' } as never);
      if (error) throw error;
    },
    onSuccess: async () => {
      captureEvent('builder_moved_to_founder', { source: 'builder_path' });
      await queryClient.invalidateQueries({ queryKey: ['account-context', user?.id] });
      toast.success('You are a Founder now. Your project and everything you saved carry over.');
    },
    onError: () => toast.error('Could not switch your workspace. Please try again.'),
  });

  if (progress.loading || idea.isPending) return null;
  const path = builderPath({
    ideaChosen: idea.data === true,
    customerDefined: progress.stageState.IDENTITY.completed,
    validated: progress.stageState.VALIDATING.completed,
  });

  const open = (route: string, step: string) => {
    captureEvent('builder_path_step_opened', { step });
    navigate(route);
  };

  return (
    <section aria-labelledby="builder-path-title" className="mx-auto mb-8 max-w-xl text-left">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="builder-path-title" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">From idea to project</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{path.doneCount} of {path.steps.length} done</span>
      </div>
      <ol className="grid grid-cols-3 gap-2">
        {path.steps.map((step, index) => (
          <li key={step.key} aria-current={step.current ? 'step' : undefined}
            className={cn(
              'rounded-xl border px-3 py-2.5',
              step.done ? 'border-accent-teal/40 bg-accent-teal/10' : step.current ? 'border-primary/50 bg-primary/5' : 'border-border/60',
            )}>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs',
                step.done ? 'bg-accent-teal text-white' : 'border border-border text-muted-foreground',
              )}>
                {step.done ? <Check className="h-3 w-3" aria-hidden="true" /> : index + 1}
              </span>
              {step.label}
              <span className="sr-only">{step.done ? ', done' : step.current ? ', next' : ''}</span>
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">{step.title}</span>
          </li>
        ))}
      </ol>

      {path.next && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">Next: {path.next.title.toLowerCase()}</span>
            <span className="block text-xs text-muted-foreground">
              {path.next.key === 'explore' ? 'Already have an idea? Go straight to ICP Builder.' : `In ${path.next.tool}.`}
            </span>
          </p>
          <Button size="sm" onClick={() => open(path.next!.route, path.next!.key)}>
            Open {path.next.tool}<ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {path.complete && !notYet && (
        <div className="mt-3 rounded-xl border border-accent-teal/40 bg-accent-teal/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold"><Rocket className="h-4 w-4 text-accent-teal" aria-hidden="true" />Your idea is a project now</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You picked it, defined who it is for and tested it with real people. A Founder workspace focuses on building, launching and winning customers. Your project and everything you saved carry over.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => graduate.mutate()} disabled={graduate.isPending}>
              {graduate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Switch to Founder
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setNotYet(true)} disabled={graduate.isPending}>Not yet</Button>
          </div>
        </div>
      )}
    </section>
  );
}

export default BuilderPath;
