import { Loader2 } from 'lucide-react';

// A plain progress state. The old loader ticked through timed fake steps and
// showed "Building your GTM Brief" even when it was only opening a saved plan.

interface GTMAnalysisLoaderProps {
  mode?: 'building' | 'restoring';
}

export default function GTMAnalysisLoader({ mode = 'building' }: GTMAnalysisLoaderProps) {
  const restoring = mode === 'restoring';
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{restoring ? 'Opening your plan' : 'Building your plan'}</h2>
        <p className="text-sm text-muted-foreground">
          {restoring ? 'Loading your channels, tasks and last review.' : 'Researching your market and picking channels. This usually takes under a minute.'}
        </p>
      </div>
    </div>
  );
}
