import { useEffect, useState } from 'react';
import { AlertTriangle, Check, CircleDashed, Loader2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ANALYSIS_STEPS, RESEARCH_STEPS, STEP_TITLES, type ResearchStepKey } from '@/lib/gtmResearch';
import type { ResearchRunRow, ResearchStepRow } from '@/hooks/useGtmResearch';
import { cn } from '@/lib/utils';

type RowState = 'queued' | 'running' | 'done' | 'partial' | 'failed';

/** One line per step: its latest state and the newest log line across its batches. */
export function summarizeSteps(steps: readonly ResearchStepRow[], keys: readonly ResearchStepKey[]) {
  return keys.map((key) => {
    const rows = steps.filter((step) => step.key === key);
    const latest = [...rows].sort((a, b) => (b.finished_at ?? b.started_at ?? b.created_at).localeCompare(a.finished_at ?? a.started_at ?? a.created_at))[0];
    let state: RowState = 'queued';
    if (rows.some((row) => row.status === 'running') || rows.some((row) => row.status === 'queued' && row.started_at)) state = 'running';
    else if (rows.length && rows.every((row) => row.status === 'failed')) state = 'failed';
    else if (rows.some((row) => row.status === 'queued')) state = 'running';
    else if (rows.some((row) => row.status === 'partial') && !rows.some((row) => row.status === 'done')) state = 'partial';
    else if (rows.some((row) => row.status === 'done' || row.status === 'partial')) state = 'done';
    return { key, title: STEP_TITLES[key], state, log: latest?.log ?? null };
  });
}

const ICON: Record<RowState, JSX.Element> = {
  queued: <CircleDashed className="h-4 w-4 text-muted-foreground" aria-hidden="true" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />,
  done: <Check className="h-4 w-4 text-primary" aria-hidden="true" />,
  partial: <Check className="h-4 w-4 text-muted-foreground" aria-hidden="true" />,
  failed: <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />,
};

const STATE_LABEL: Record<RowState, string> = { queued: 'Waiting', running: 'Working', done: 'Done', partial: 'Done, with gaps', failed: 'Could not finish' };

/** Seconds since the work started, ticking once a second while shown. */
function useElapsed(since: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  return since ? Math.max(0, Math.floor((now - Date.parse(since)) / 1_000)) : 0;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function ResearchTimeline({ run, steps, phase, onStop, stopping }: {
  run: ResearchRunRow; steps: readonly ResearchStepRow[]; phase: 'analysis' | 'research'; onStop?: () => void; stopping?: boolean;
}) {
  const rows = summarizeSteps(steps, phase === 'analysis' ? ANALYSIS_STEPS : RESEARCH_STEPS);
  const counts = run.counts ?? {};
  const elapsed = useElapsed(phase === 'analysis' ? run.created_at : run.started_at ?? run.created_at);
  const finished = rows.filter((row) => row.state === 'done' || row.state === 'partial').length;
  // A running step counts as half done, so the bar moves while it works.
  const progress = Math.round(((finished + (rows.some((row) => row.state === 'running') ? 0.5 : 0)) / rows.length) * 100);
  return (
    <section aria-label="What the agent is doing" className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{phase === 'analysis' ? 'Reading your business' : 'Researching companies for you'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {phase === 'analysis'
              ? 'This is free and usually takes under a minute.'
              : 'This usually takes 3 to 6 minutes. You can leave this page; the research keeps going.'}
            <span className="ml-2 tabular-nums text-foreground" aria-label={`Elapsed ${clock(elapsed)}`}>{clock(elapsed)}</span>
          </p>
        </div>
        {onStop ? (
          <Button type="button" size="sm" variant="outline" onClick={onStop} disabled={stopping}>
            {stopping ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Square className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
            Stop and keep results
          </Button>
        ) : null}
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.max(4, progress)}%` }} />
      </div>
      <ol className="mt-4 space-y-1">
        {rows.map((row, index) => (
          <li key={row.key} className={cn('flex gap-3 rounded-lg px-3 py-2', row.state === 'running' && 'bg-primary/5')}>
            <span className="mt-0.5 shrink-0">{ICON[row.state]}</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-2">
                <span className={cn('text-sm font-medium', row.state === 'queued' ? 'text-muted-foreground' : 'text-foreground')}>{index + 1}. {row.title}</span>
                <span className="text-xs text-muted-foreground">{STATE_LABEL[row.state]}</span>
              </span>
              {row.log ? <span className="mt-0.5 block text-sm text-muted-foreground">{row.log}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      {phase === 'research' ? (
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border/60 pt-4 text-center">
          <div><dt className="text-xs text-muted-foreground">Found</dt><dd className="text-xl font-semibold text-foreground">{counts.candidates ?? 0}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Checked</dt><dd className="text-xl font-semibold text-foreground">{counts.checked ?? 0}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Match</dt><dd className="text-xl font-semibold text-primary">{counts.qualified ?? 0}</dd></div>
        </dl>
      ) : null}
    </section>
  );
}
