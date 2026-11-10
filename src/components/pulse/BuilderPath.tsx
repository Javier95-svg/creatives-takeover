import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ClipboardList, Loader2, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { BUILDER_STEPS, builderPath, hasChosenIdea } from '@/lib/builderPath';

type Prompt = 'sprint' | 'graduate';

// Shown at most once a day each, so the home never nags.
const promptKey = (userId: string, prompt: Prompt) => `ct-builder-prompt:${userId}:${prompt}`;
const today = () => new Date().toISOString().slice(0, 10);
function claimToday(key: string): boolean {
  try {
    if (localStorage.getItem(key) === today()) return false;
    localStorage.setItem(key, today());
  } catch { /* storage blocked: still show it, just not remembered */ }
  return true;
}

/**
 * The Builder path, as a pop-up on the home rather than a card. A Builder who
 * has not picked an idea yet (so is still on Identity) is offered Decision
 * Sprint; one who has finished all three steps is offered the move to Founder,
 * keeping the project and its history. In between, today's focus leads.
 */
export function BuilderPath({ navigate }: { navigate: (path: string) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const progress = useBizMapProgress();
  const [open, setOpen] = useState(false);
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
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['account-context', user?.id] });
      toast.success('You are a Founder now. Your project and everything you saved carry over.');
    },
    onError: () => toast.error('Could not switch your workspace. Please try again.'),
  });

  const ready = !progress.loading && !idea.isPending;
  const path = ready ? builderPath({
    ideaChosen: idea.data === true,
    customerDefined: progress.stageState.IDENTITY.completed,
    validated: progress.stageState.VALIDATING.completed,
  }) : null;
  const prompt: Prompt | null = path?.next?.key === 'explore' ? 'sprint' : path?.complete ? 'graduate' : null;

  useEffect(() => {
    if (!prompt || !user?.id || !claimToday(promptKey(user.id, prompt))) return;
    setOpen(true);
    captureEvent('builder_path_prompt_shown', { prompt });
  }, [prompt, user?.id]);

  const go = (route: string, step: string) => {
    captureEvent('builder_path_step_opened', { step, source: 'prompt' });
    setOpen(false);
    navigate(route);
  };

  if (!prompt) return null;
  const [explore, define] = BUILDER_STEPS;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        {prompt === 'sprint' ? <>
          <DialogHeader>
            <span className="mb-1 grid h-10 w-10 place-items-center rounded-xl bg-accent-teal/10 text-accent-teal"><ClipboardList className="h-5 w-5" aria-hidden="true" /></span>
            <DialogTitle>Pick the idea worth testing</DialogTitle>
            <DialogDescription>
              Decision Sprint is a focused 7-day sprint to narrow your ideas, test demand signals and choose what to build, with a task for each day.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="ghost" onClick={() => go(define.route, 'define')}>I already have an idea</Button>
            <Button onClick={() => go(explore.route, 'explore')}>Open {explore.tool}<ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" /></Button>
          </DialogFooter>
        </> : <>
          <DialogHeader>
            <span className="mb-1 grid h-10 w-10 place-items-center rounded-xl bg-accent-teal/10 text-accent-teal"><Rocket className="h-5 w-5" aria-hidden="true" /></span>
            <DialogTitle>Your idea is a project now</DialogTitle>
            <DialogDescription>
              You picked it, defined who it is for and tested it with real people. A Founder workspace focuses on building, launching and winning customers. Your project and everything you saved carry over.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={graduate.isPending}>Not yet</Button>
            <Button onClick={() => graduate.mutate()} disabled={graduate.isPending}>
              {graduate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Switch to Founder
            </Button>
          </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  );
}

export default BuilderPath;
