import { useMemo, useState } from 'react';
import { Check, Clock3, Copy, FileText, ShieldCheck, Swords, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { captureEvent } from '@/lib/analytics';
import {
  buildCompetitorBriefs,
  buildGTMAssets,
  buildGTMTasks,
  calculateGTMHealth,
  type GTMPlanV2,
  type GTMPlayAsset,
  type GTMTask,
} from '@/lib/gtmV2';
import { cn } from '@/lib/utils';

interface GTMExecutionOSProps {
  plan: GTMPlanV2;
  planId: string;
  mode: 'overview' | 'execute' | 'competitors';
  onUpdatePlan: (plan: GTMPlanV2) => Promise<void>;
}

const scoreRows = [
  ['Positioning', 'positioningConfidence'],
  ['Channel evidence', 'channelEvidence'],
  ['Execution', 'executionConsistency'],
  ['Outcome progress', 'outcomeProgress'],
] as const;

function currentWeek(plan: GTMPlanV2) {
  const elapsed = Math.max(0, Date.now() - new Date(plan.generatedAt).getTime());
  return Math.min(6, Math.max(1, Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1));
}

function AssetEditor({ asset, onSave }: { asset: GTMPlayAsset; onSave: (asset: GTMPlayAsset) => Promise<void> }) {
  const [draft, setDraft] = useState(asset.content);
  const copy = async () => {
    await navigator.clipboard.writeText(draft);
    toast.success('Asset copied.');
  };
  return (
    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-medium">{asset.title}</p><p className="text-xs text-muted-foreground">{asset.type.replaceAll('_', ' ')}</p></div>
        <Badge variant="outline" className={asset.status === 'approved' ? 'border-success/30 text-success' : ''}>{asset.status}</Badge>
      </div>
      <Textarea rows={7} value={draft} onChange={(event) => setDraft(event.target.value)} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => void copy()}><Copy className="mr-2 h-3.5 w-3.5" />Copy</Button>
        <Button size="sm" variant="outline" onClick={() => void onSave({ ...asset, content: draft, status: 'draft', updatedAt: new Date().toISOString() })}>Save draft</Button>
        <Button size="sm" onClick={() => void onSave({ ...asset, content: draft, status: 'approved', updatedAt: new Date().toISOString() })}><ShieldCheck className="mr-2 h-3.5 w-3.5" />Approve</Button>
      </div>
    </div>
  );
}

export default function GTMExecutionOS({ plan, planId, mode, onUpdatePlan }: GTMExecutionOSProps) {
  const tasks = useMemo(() => buildGTMTasks(plan), [plan]);
  const assets = useMemo(() => buildGTMAssets(plan), [plan]);
  const competitors = useMemo(() => buildCompetitorBriefs(plan), [plan]);
  const health = useMemo(() => calculateGTMHealth(plan, tasks), [plan, tasks]);
  const week = currentWeek(plan);
  const weekTasks = tasks.filter((task) => task.week === week);

  const updateTasks = async (nextTasks: GTMTask[]) => {
    const nextPlan = { ...plan, tasks: nextTasks, health: calculateGTMHealth(plan, nextTasks) };
    await onUpdatePlan(nextPlan);
  };

  const toggleTask = async (task: GTMTask) => {
    const nextStatus = task.status === 'done' ? 'todo' : 'done';
    const nextTasks = tasks.map((item) => item.id === task.id ? {
      ...item,
      status: nextStatus,
      completedAt: nextStatus === 'done' ? new Date().toISOString() : undefined,
    } as GTMTask : item);
    captureEvent('gtm_task_status_changed', { plan_id: planId, task_id: task.id, week: task.week, status: nextStatus });
    await updateTasks(nextTasks);
  };

  const updateAsset = async (asset: GTMPlayAsset) => {
    const nextAssets = assets.map((item) => item.id === asset.id ? asset : item);
    captureEvent('gtm_asset_updated', { plan_id: planId, play_id: asset.playId, asset_type: asset.type, status: asset.status });
    await onUpdatePlan({ ...plan, assets: nextAssets });
  };

  if (mode === 'overview') {
    const primary = plan.plays.find((play) => play.status === 'active') ?? plan.plays[0];
    return (
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-2 border-primary/20">
          <CardHeader><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">GTM health</p><CardTitle className="mt-2 text-3xl">{health.overall}/100 · {health.label}</CardTitle></div><div className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-primary/20 text-2xl font-bold text-primary">{health.overall}</div></div></CardHeader>
          <CardContent className="space-y-4">
            {scoreRows.map(([label, key]) => <div key={key}><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span>{health[key]}</span></div><Progress value={health[key]} className="h-2" /></div>)}
            {health.risks.length > 0 ? <div className="rounded-xl border border-warning/25 bg-warning/5 p-3 text-sm"><p className="font-medium text-warning">What limits the score</p><ul className="mt-2 space-y-1 text-muted-foreground">{health.risks.map((risk) => <li key={risk}>• {risk}</li>)}</ul></div> : null}
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card><CardHeader><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Next best action</p><CardTitle>{health.nextActions[0]}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Week {week} · {weekTasks.filter((task) => task.status === 'done').length}/{weekTasks.length} tasks complete</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-lg">Primary evidence target</CardTitle></CardHeader><CardContent><div className="flex items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">{primary?.metric ?? plan.metrics.primaryOutcome}</p><p className="mt-1 text-3xl font-bold">{primary?.actual ?? '—'} <span className="text-base font-normal text-muted-foreground">actual</span></p></div><div className="text-right"><p className="text-xs text-muted-foreground">Weekly target</p><p className="text-2xl font-semibold">{primary?.target ?? '—'}</p></div></div><p className="mt-3 text-xs text-muted-foreground">Actuals appear only from linked Traction evidence; the plan does not invent performance.</p></CardContent></Card>
        </div>
      </div>
    );
  }

  if (mode === 'competitors') {
    return (
      <Card><CardHeader><div className="flex items-center gap-2"><Swords className="h-5 w-5 text-primary" /><CardTitle>Competitive alternatives</CardTitle></div><p className="text-sm text-muted-foreground">Use these briefs to sharpen positioning—not to copy competitor messaging.</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{competitors.length > 0 ? competitors.map((competitor) => <div key={competitor.id} className="space-y-3 rounded-2xl border border-border/60 p-4"><div><p className="font-semibold">{competitor.name}</p><p className="text-xs text-muted-foreground">{competitor.category}</p></div><p className="text-sm">{competitor.positioning}</p><div className="grid grid-cols-2 gap-3 text-xs"><div><p className="font-medium text-success">Strengths</p>{competitor.strengths.map((item) => <p key={item} className="mt-1 text-muted-foreground">• {item}</p>)}</div><div><p className="font-medium text-primary">Your opening</p>{competitor.gaps.map((item) => <p key={item} className="mt-1 text-muted-foreground">• {item}</p>)}</div></div></div>) : <p className="text-sm text-muted-foreground">No named alternatives were found. Add competitors in Diagnose and regenerate when the market is clearer.</p>}</CardContent></Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Week {week}</p><CardTitle className="mt-1">Founder execution board</CardTitle></div><Badge variant="outline">{weekTasks.filter((task) => task.status === 'done').length}/{weekTasks.length} complete</Badge></div></CardHeader><CardContent className="space-y-3">{weekTasks.map((task) => <button key={task.id} type="button" onClick={() => void toggleTask(task)} className={cn('w-full rounded-2xl border p-4 text-left transition-colors', task.status === 'done' ? 'border-success/30 bg-success/5' : 'border-border/60 hover:border-primary/40')}><div className="flex items-start gap-3"><span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border', task.status === 'done' ? 'border-success bg-success text-success-foreground' : 'border-border')}>{task.status === 'done' ? <Check className="h-4 w-4" /> : null}</span><div className="min-w-0 flex-1"><p className={cn('font-medium', task.status === 'done' && 'line-through text-muted-foreground')}>{task.title}</p><p className="mt-1 text-sm text-muted-foreground">{task.detail}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{task.owner}</span><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{task.timeEstimateMinutes} min</span><span>Output: {task.output}</span><span>KPI: {task.metric}</span></div></div></div></button>)}</CardContent></Card>
      <Card><CardHeader><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><CardTitle>Play assets</CardTitle></div><p className="text-sm text-muted-foreground">Editable drafts only. Nothing is sent or published until you explicitly approve and use it.</p></CardHeader><CardContent className="grid gap-4 lg:grid-cols-2">{assets.slice(0, 6).map((asset) => <AssetEditor key={asset.id} asset={asset} onSave={updateAsset} />)}</CardContent></Card>
    </div>
  );
}
