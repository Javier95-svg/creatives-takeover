import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountContext } from '@/hooks/useAccountContext';
import { useProjectSetup } from '@/hooks/useProjectSetup';
import { supabase } from '@/integrations/supabase/client';
import { ONBOARDING_SITUATIONS } from '@/lib/onboardingClassification';
import { cn } from '@/lib/utils';

type Segment = 'founder' | 'builder';

// The same statements onboarding asks with, so both answers mean the same thing.
const CHOICES: Array<{ segment: Segment; title: string; description: string }> = [
  { segment: 'founder', situation: 'existing_project' },
  { segment: 'builder', situation: 'starting_project' },
].map(({ segment, situation }) => {
  const [, title, description] = ONBOARDING_SITUATIONS.find(([key]) => key === situation)!;
  return { segment: segment as Segment, title, description };
});

/**
 * Asks founders and builders whose label was inferred, not chosen, which one
 * they are. Most Founder and Builder labels predate the onboarding question
 * (a backfill from business_stage, or the column default), so the two
 * segments cannot be compared until people state it. One click, asked once;
 * "Ask me later" brings it back on the next workspace load, like the project
 * prompt. It waits while the project prompt is open, so they never stack.
 */
export function SegmentCheckGate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { userType } = useAccountContext();
  const { needsSetup, isLoading: setupLoading } = useProjectSetup();
  const [dismissed, setDismissed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const selfServe = userType === 'founder' || userType === 'builder';

  const check = useQuery({
    queryKey: ['segment-check', user?.id],
    enabled: Boolean(user?.id) && selfServe,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('segment_check_needed' as never);
      // Never ask on an error (such as the migration not being applied yet).
      if (error) return false;
      return (data as unknown) === true;
    },
  });

  const state = useMutation({
    mutationFn: async (segment: Segment) => {
      const { error } = await supabase.rpc('state_founder_segment' as never, { p_segment: segment, p_source: 'prompt' } as never);
      if (error) throw error;
      return segment;
    },
    onSuccess: async (segment) => {
      queryClient.setQueryData(['segment-check', user?.id], false);
      await queryClient.invalidateQueries({ queryKey: ['account-context', user?.id] });
      toast.success(segment === 'founder' ? 'Thanks. Your workspace is set up for your project.' : 'Thanks. Your workspace is set up for starting from scratch.');
    },
    onError: () => toast.error('Could not save your answer. Please try again.'),
  });

  const open = selfServe && check.data === true && !dismissed && !setupLoading && !needsSetup;

  return <Dialog open={open} onOpenChange={(next) => { if (!next) setDismissed(true); }}>
    {/* Focus the dialog, not the first answer: a focus ring on "I already have
        a project" reads as a default and would bias the label. */}
    <DialogContent ref={contentRef} tabIndex={-1} className="max-w-md focus:outline-none"
      onOpenAutoFocus={(event) => { event.preventDefault(); contentRef.current?.focus(); }}>
      <DialogHeader>
        <DialogTitle>Which describes you best?</DialogTitle>
        <DialogDescription>One question, so your workspace suggests the right next steps.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3">
        {CHOICES.map((choice) => <button
          key={choice.segment}
          type="button"
          disabled={state.isPending}
          onClick={() => state.mutate(choice.segment)}
          className={cn(
            'flex items-start justify-between gap-3 rounded-xl border border-border/60 p-4 text-left transition-colors',
            'hover:border-accent-teal/60 hover:bg-accent-teal/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
          )}
        >
          <span>
            <span className="block font-semibold">{choice.title}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{choice.description}</span>
          </span>
          {state.isPending && state.variables === choice.segment && <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
        </button>)}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={() => setDismissed(true)} disabled={state.isPending}>Ask me later</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

export default SegmentCheckGate;
