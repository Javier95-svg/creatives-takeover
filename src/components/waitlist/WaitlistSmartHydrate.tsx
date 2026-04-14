import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { normalizeStoredArtifact } from '@/lib/icpDraftArtifacts';
import { icpArtifactToWaitlistContent, type IcpToWaitlistResult } from '@/lib/icpToWaitlist';

export interface WaitlistSmartHydrateProps {
  draftId: string;
  userId: string;
  onReady: (result: IcpToWaitlistResult) => void;
  onCancel: () => void;
}

type State = 'loading' | 'error';

export default function WaitlistSmartHydrate({ draftId, userId, onReady, onCancel }: WaitlistSmartHydrateProps) {
  const [state, setState] = useState<State>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const minDelayRef = useRef<number>(Date.now());

  useEffect(() => {
    const run = async () => {
      try {
        const { data, error } = await supabase
          .from('icp_analysis_results')
          .select('id, analysis_data, target_audience, business_description, verdict')
          .eq('id', draftId)
          .eq('user_id', userId)
          .maybeSingle();

        if (error || !data) {
          throw error || new Error('ICP Draft not found.');
        }

        const normalized = normalizeStoredArtifact(data);
        if (!normalized.artifact) {
          throw new Error('This ICP Draft is missing structured data.');
        }

        const result = icpArtifactToWaitlistContent(normalized.artifact);

        const elapsed = Date.now() - minDelayRef.current;
        const remaining = Math.max(0, 900 - elapsed);
        window.setTimeout(() => onReady(result), remaining);
      } catch (error) {
        console.error('Failed to hydrate waitlist from ICP', error);
        const message = error instanceof Error ? error.message : 'Could not load your ICP Draft.';
        setErrorMessage(message);
        setState('error');
        toast.error(message);
      }
    };

    void run();
  }, [draftId, userId, onReady]);

  if (state === 'error') {
    return (
      <div className="mx-auto w-full max-w-lg px-2">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold">We couldn’t load your ICP</h3>
              <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={onCancel}>Start manually instead</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-2">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="relative">
            <Sparkles className="h-10 w-10 text-primary" />
            <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-primary/70" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">Drafting your waitlist page…</h3>
            <p className="text-sm text-muted-foreground">
              Pulling your persona, pain points, and value props from your ICP.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
