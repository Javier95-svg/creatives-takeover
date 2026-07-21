import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, BookOpen, Check, ExternalLink, FileDown, FolderSearch, Loader2, Pencil, RefreshCw, Rocket, Save, Share2, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { findLaunchDirectory } from '@/data/launchDirectories';
import { gtmGenerationLabel } from '@/config/gtmStrategist';
import { captureEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import type { GTMPlanV2, GTMPlay, GTMWeeklyReview, GTMWeeklyReviewInput } from '@/lib/gtmV2';
import { evaluateGTMOutcome } from '@/lib/gtmOutcome';
import GTMExecutionOS from './GTMExecutionOS';
import GTMEvidenceManager from './GTMEvidenceManager';
import GTMPipelineBoard from './GTMPipelineBoard';

interface GTMWorkspaceProps {
  plan: GTMPlanV2;
  planId: string;
  weeklyReview: GTMWeeklyReview | null;
  isSaving: boolean;
  isExporting: boolean;
  isReviewing: boolean;
  onSave: () => void;
  onExport: () => void;
  onShare: () => void;
  onRegenerate: () => void;
  onUpdatePlay: (play: GTMPlay) => Promise<void>;
  onUpdatePlan: (plan: GTMPlanV2) => Promise<void>;
  onStartSprint: (play: GTMPlay) => Promise<void>;
  onWeeklyReview: (input: GTMWeeklyReviewInput) => Promise<void>;
}

const roleStyles = {
  primary: 'border-success/30 bg-success/10 text-success',
  secondary: 'border-info/30 bg-info/10 text-info',
  deferred: 'border-border bg-muted text-muted-foreground',
};

const decisionStyles: Record<string, string> = {
  collect_evidence: 'border-info/30 bg-info/5 text-info',
  double_down: 'border-success/30 bg-success/5 text-success',
  iterate: 'border-warning/30 bg-warning/5 text-warning',
  kill: 'border-destructive/30 bg-destructive/5 text-destructive',
};

function PlayEditor({ play, planId, onSave, onStartSprint }: { play: GTMPlay; planId: string; onSave: (play: GTMPlay) => Promise<void>; onStartSprint: (play: GTMPlay) => Promise<void> }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(play);
  useEffect(() => setDraft(play), [play]);
  const directories = play.recommendedDirectoryIds.map(findLaunchDirectory).filter(Boolean);
  const directoryStates = ['recommended', 'visited', 'submitted', 'live', 'skipped'] as const;

  const advanceDirectory = (directoryId: string) => {
    const current = play.directoryProgress?.[directoryId] ?? 'recommended';
    const next = directoryStates[Math.min(directoryStates.length - 1, directoryStates.indexOf(current) + 1)];
    captureEvent('gtm_directory_progress_changed', { plan_id: planId, play_id: play.id, directory_id: directoryId, status: next });
    void onSave({ ...play, directoryProgress: { ...play.directoryProgress, [directoryId]: next } });
  };

  const startSprint = () => {
    captureEvent('gtm_play_activated', { plan_id: planId, play_id: play.id, channel_id: play.channelId, destination: 'embedded_traction_sprint' });
    return onStartSprint(play);
  };
  const openDirectories = () => {
    captureEvent('gtm_play_activated', { plan_id: planId, play_id: play.id, channel_id: play.channelId, destination: 'directories' });
    navigate(`/directories?planId=${encodeURIComponent(planId)}&playId=${encodeURIComponent(play.id)}`);
  };

  return (
    <Card className={cn('border-2', play.status === 'active' ? 'border-primary/30' : 'border-border/60')}>
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><CardTitle className="text-lg">{play.channelName}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{play.metric} target: {play.target}/week</p></div>
          <div className="flex items-center gap-2"><Badge variant="outline">{play.status}</Badge><Button size="sm" variant="ghost" onClick={() => setEditing((value) => !value)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2"><Label>Audience</Label><Input value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} /></div>
            <div className="space-y-2"><Label>Buying trigger</Label><Textarea rows={3} value={draft.buyingTrigger} onChange={(event) => setDraft({ ...draft, buyingTrigger: event.target.value })} /></div>
            <div className="space-y-2"><Label>Offer</Label><Textarea rows={3} value={draft.offer} onChange={(event) => setDraft({ ...draft, offer: event.target.value })} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Message</Label><Textarea rows={3} value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Experiment hypothesis</Label><Textarea rows={3} value={draft.hypothesis} onChange={(event) => setDraft({ ...draft, hypothesis: event.target.value })} /></div>
            <div className="md:col-span-2 space-y-2"><Label>Kill rule</Label><Textarea rows={3} value={draft.killRule ?? ''} onChange={(event) => setDraft({ ...draft, killRule: event.target.value })} placeholder="Stop or replace this play when the measured threshold is missed for a defined period." /></div>
            <div className="space-y-2"><Label>Kill threshold</Label><Input type="number" min="0" value={draft.structuredKillRule?.threshold ?? draft.target} onChange={(event) => setDraft({ ...draft, structuredKillRule: { metric: draft.structuredKillRule?.metric || draft.metric, operator: draft.structuredKillRule?.operator || 'lt', threshold: Number(event.target.value) || 0, observationWindowWeeks: draft.structuredKillRule?.observationWindowWeeks || 3, minSampleSize: draft.structuredKillRule?.minSampleSize || 3 } })} /></div>
            <div className="space-y-2"><Label>Observation window (weeks)</Label><Input type="number" min="1" max="6" value={draft.structuredKillRule?.observationWindowWeeks ?? 3} onChange={(event) => setDraft({ ...draft, structuredKillRule: { metric: draft.structuredKillRule?.metric || draft.metric, operator: draft.structuredKillRule?.operator || 'lt', threshold: draft.structuredKillRule?.threshold ?? draft.target, observationWindowWeeks: Math.max(1, Number(event.target.value) || 1), minSampleSize: draft.structuredKillRule?.minSampleSize || 3 } })} /></div>
            <div className="space-y-2"><Label>Minimum sample size</Label><Input type="number" min="1" value={draft.structuredKillRule?.minSampleSize ?? 3} onChange={(event) => setDraft({ ...draft, structuredKillRule: { metric: draft.structuredKillRule?.metric || draft.metric, operator: draft.structuredKillRule?.operator || 'lt', threshold: draft.structuredKillRule?.threshold ?? draft.target, observationWindowWeeks: draft.structuredKillRule?.observationWindowWeeks || 3, minSampleSize: Math.max(1, Number(event.target.value) || 1) } })} /></div>
            <div className="space-y-2"><Label>Metric</Label><Input value={draft.metric} onChange={(event) => setDraft({ ...draft, metric: event.target.value })} /></div>
            <div className="space-y-2"><Label>Weekly target</Label><Input type="number" min="0" value={draft.target} onChange={(event) => setDraft({ ...draft, target: Number(event.target.value) || 0 })} /></div>
            <div className="md:col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={() => { setDraft(play); setEditing(false); }}>Cancel</Button><Button onClick={() => void onSave(draft).then(() => setEditing(false))}><Save className="mr-2 h-4 w-4" />Save free edit</Button></div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-muted/30 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audience + trigger</p><p className="mt-2 text-sm">{play.audience}</p><p className="mt-1 text-xs text-muted-foreground">{play.buyingTrigger}</p></div><div className="rounded-xl bg-muted/30 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Offer + message</p><p className="mt-2 text-sm">{play.offer}</p><p className="mt-1 text-xs text-muted-foreground">{play.message}</p></div></div>
            <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Experiment</p><p className="mt-2 text-sm">{play.hypothesis}</p></div>
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-warning">Kill rule</p><p className="mt-2 text-sm">{play.killRule || 'Add a measurable kill rule before activating this play.'}</p></div>
            {play.structuredKillRule ? <p className="text-xs text-muted-foreground">Measured rule: {play.structuredKillRule.metric} {play.structuredKillRule.operator} {play.structuredKillRule.threshold} for {play.structuredKillRule.observationWindowWeeks} weeks after at least {play.structuredKillRule.minSampleSize} observations.</p> : null}
            <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</p><ul className="mt-2 space-y-2">{play.actions.map((action) => <li key={action} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{action}</li>)}</ul></div>
          </>
        )}
        <div className="grid gap-3 border-t border-border/60 pt-4 md:grid-cols-2">
          <div className="rounded-xl bg-muted/30 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Traction evidence</p><div className="mt-2 flex items-end justify-between"><div><p className="text-2xl font-bold">{play.actual ?? '—'}</p><p className="text-xs text-muted-foreground">actual {play.metric.toLowerCase()}</p></div><div className="text-right"><p className="text-lg font-semibold">{play.target}</p><p className="text-xs text-muted-foreground">weekly target</p></div></div></div>
          <div className="rounded-xl bg-muted/30 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sprint state</p><p className="mt-2 font-medium">{play.tractionSprintId ? 'Linked to Traction Engine' : 'Ready to activate'}</p><p className="mt-1 text-xs text-muted-foreground">Metric and target stay attached to this play.</p></div>
        </div>
        {directories.length > 0 ? <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Directory activation</p>{directories.map((directory) => directory ? <div key={directory.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 p-3"><div><p className="text-sm font-medium">{directory.name}</p><p className="mt-1 text-xs text-muted-foreground">{directory.cost} · verified {directory.lastVerifiedAt}</p></div><Button size="sm" variant="outline" onClick={() => advanceDirectory(directory.id)}>{(play.directoryProgress?.[directory.id] ?? 'recommended').replace('_', ' ')}<ArrowRight className="ml-2 h-3.5 w-3.5" /></Button></div> : null)}</div> : null}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          {directories.length > 0 ? <Button variant="outline" onClick={openDirectories}><FolderSearch className="mr-2 h-4 w-4" />Open {directories.length} recommended directories</Button> : null}
          <Button disabled={Boolean(play.tractionSprintId)} onClick={() => void startSprint()}><BarChart3 className="mr-2 h-4 w-4" />{play.tractionSprintId ? 'Traction sprint active' : 'Start sprint here'}</Button>
          <Button variant="ghost" onClick={() => navigate(`/traction-engine?step=sprint&planId=${encodeURIComponent(planId)}&playId=${encodeURIComponent(play.id)}`)}>Open full Traction Engine<ExternalLink className="ml-2 h-4 w-4" /></Button>
          {directories.length > 0 ? <p className="w-full text-xs text-muted-foreground">Recommended: {directories.map((directory) => directory?.name).join(', ')}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function GTMWorkspace({ plan, planId, weeklyReview, isSaving, isExporting, isReviewing, onSave, onExport, onShare, onRegenerate, onUpdatePlay, onUpdatePlan, onStartSprint, onWeeklyReview }: GTMWorkspaceProps) {
  const [tab, setTab] = useState('overview');
  const [reviewInput, setReviewInput] = useState<GTMWeeklyReviewInput>(weeklyReview?.reviewInput ?? { wins: '', misses: '', objections: '', customerLanguage: '', blockers: '', notes: '' });
  const primaryPlay = plan.plays.find((play) => play.status === 'active') ?? plan.plays[0];
  const outcome = evaluateGTMOutcome(plan);
  const outcomeLabels: Record<keyof typeof outcome.checks, string> = {
    primaryChannel: 'Primary channel', fallbackChannel: 'Fallback channel', evidenceBackedMessaging: 'Evidence backed messaging',
    usableCampaignAssets: 'Usable assets', sixWeekTargets: 'Six week targets', budgetAndTimeConstraints: 'Budget and time constraints',
    structuredKillRule: 'Structured kill rule', tractionSprintCreated: 'Attributed Traction sprint',
  };
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-background/85 p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Version {plan.version ?? 1}</Badge><Badge variant="outline" className={plan.researchStatus === 'complete' ? 'border-success/30 text-success' : 'border-warning/30 text-warning'}>{plan.researchStatus} research</Badge></div><h1 className="text-2xl font-bold sm:text-3xl">{plan.planTitle}</h1><p className="leading-relaxed text-muted-foreground">{plan.summaryInsight}</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={isSaving} onClick={onSave}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button><Button variant="outline" onClick={onShare}><Share2 className="mr-2 h-4 w-4" />Share</Button><Button variant="outline" disabled={isExporting} onClick={onExport}>{isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}PDF</Button><Button variant="outline" onClick={onRegenerate}><RefreshCw className="mr-2 h-4 w-4" />{gtmGenerationLabel()}</Button></div>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="text-base">GTM outcome contract</CardTitle><p className="mt-1 text-sm text-muted-foreground">Begin one measurable acquisition play with every execution constraint attached.</p></div><Badge variant="outline">{outcome.completionScore}% {outcome.status}</Badge></div></CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(outcome.checks).map(([key, complete]) => <div key={key} className="flex items-center gap-2 text-xs"><Check className={cn('h-3.5 w-3.5', complete ? 'text-success' : 'text-muted-foreground/40')} /><span className={complete ? 'text-foreground' : 'text-muted-foreground'}>{outcomeLabels[key as keyof typeof outcome.checks]}</span></div>)}</CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl p-1 md:grid-cols-4">
          <TabsTrigger value="overview" className="gap-2"><Target className="h-4 w-4" />Command center</TabsTrigger>
          <TabsTrigger value="strategy" className="gap-2"><BookOpen className="h-4 w-4" />Strategy</TabsTrigger>
          <TabsTrigger value="activate" className="gap-2"><Rocket className="h-4 w-4" />Activate</TabsTrigger>
          <TabsTrigger value="review" className="gap-2"><BarChart3 className="h-4 w-4" />Weekly review</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-5">
          <GTMExecutionOS plan={plan} planId={planId} mode="overview" onUpdatePlan={onUpdatePlan} />
          <Card><CardHeader><CardTitle>Confirmed founder context</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm md:grid-cols-2"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Product and lifecycle</p><p className="mt-1 font-medium">{plan.intake.productName} · {plan.intake.lifecycle.replace('_', ' ')}</p></div><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Business model</p><p className="mt-1 font-medium">{plan.intake.businessModel.replaceAll('_', ' ')}</p></div><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Target segment</p><p className="mt-1">{plan.intake.targetSegment}</p></div><div><p className="text-xs uppercase tracking-wider text-muted-foreground">Six-week outcome</p><p className="mt-1">{plan.intake.sixWeekOutcome}</p></div></CardContent></Card>
          <GTMEvidenceManager plan={plan} onUpdatePlan={onUpdatePlan} />
          <Card><CardHeader><CardTitle>Research evidence</CardTitle></CardHeader><CardContent className="space-y-3">{plan.researchSources.length > 0 ? plan.researchSources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-3 text-sm hover:border-primary/40"><div><p className="font-medium">{source.title}</p>{source.snippet ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{source.snippet}</p> : null}</div><ExternalLink className="h-4 w-4 shrink-0" /></a>) : <p className="text-sm text-muted-foreground">Live research was unavailable. All external market claims are treated as assumptions until validated.</p>}{plan.assumptions.length > 0 ? <div className="rounded-xl border border-warning/30 bg-warning/5 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-warning">Assumptions to validate</p><ul className="mt-2 space-y-1 text-sm">{plan.assumptions.map((item) => <li key={item}>• {item}</li>)}</ul></div> : null}</CardContent></Card>
          {(plan.claimAttributions ?? []).length > 0 ? <Card><CardHeader><CardTitle>Claim-level provenance</CardTitle></CardHeader><CardContent className="space-y-2">{plan.claimAttributions?.map((claim) => <div key={claim.id} className={cn('rounded-xl border p-3 text-sm', claim.assumption ? 'border-warning/30 bg-warning/5' : 'border-border/60')}><div className="flex flex-wrap items-start justify-between gap-2"><p className="font-medium">{claim.claim}</p><div className="flex gap-2"><Badge variant="outline">{claim.area}</Badge><Badge variant="outline">{claim.assumption ? 'assumption' : claim.confidence}</Badge></div></div><p className="mt-2 text-xs text-muted-foreground">{claim.sourceIds.length > 0 ? `Sources: ${claim.sourceIds.join(', ')}` : 'No supporting source attached.'}</p></div>)}</CardContent></Card> : null}
        </TabsContent>

        <TabsContent value="strategy" className="mt-6 space-y-6">
          <Card><CardHeader><CardTitle>{plan.thesis.motion.replaceAll('_', ' ')} motion</CardTitle></CardHeader><CardContent className="space-y-4"><p>{plan.thesis.rationale}</p><div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-muted/30 p-3"><p className="text-xs uppercase tracking-wider text-muted-foreground">Buying trigger</p><p className="mt-2 text-sm">{plan.thesis.buyingTrigger}</p></div><div className="rounded-xl bg-muted/30 p-3"><p className="text-xs uppercase tracking-wider text-muted-foreground">Alternative</p><p className="mt-2 text-sm">{plan.thesis.competitiveAlternative}</p></div><div className="rounded-xl bg-muted/30 p-3"><p className="text-xs uppercase tracking-wider text-muted-foreground">Value</p><p className="mt-2 text-sm">{plan.thesis.value}</p></div></div></CardContent></Card>
          <div className="space-y-3"><h2 className="text-lg font-semibold">Explainable channel bets</h2>{plan.channels.map((channel) => <Card key={channel.id}><CardContent className="space-y-4 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-2"><h3 className="font-semibold">{channel.name}</h3><Badge variant="outline" className={roleStyles[channel.role]}>{channel.role}</Badge></div><div className="text-right"><p className="text-lg font-bold">{channel.score}/100</p><p className="text-xs text-muted-foreground">{channel.confidence} confidence</p></div></div><p className="text-sm text-muted-foreground">{channel.rationale}</p><div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-5">{Object.entries(channel.scoreBreakdown).map(([key, value]) => <div key={key} className="rounded-lg bg-muted/30 p-2"><p className="truncate text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div>{channel.scoreEvidence ? <div className="space-y-2 rounded-xl border border-border/60 p-3">{Object.entries(channel.scoreEvidence).map(([key, evidence]) => evidence ? <div key={key} className="text-xs"><span className="font-medium">{key.replace(/([A-Z])/g, ' $1')}:</span> <span className="text-muted-foreground">{evidence.explanation}</span>{evidence.sourceIds.length > 0 ? <span className="ml-1 text-primary">[{evidence.sourceIds.join(', ')}]</span> : null}</div> : null)}</div> : null}<p className="text-xs text-muted-foreground">Prerequisites: {channel.prerequisites.join(' · ')}</p></CardContent></Card>)}</div>
          {(plan.excludedChannels ?? []).length > 0 ? <Card><CardHeader><CardTitle>Channels excluded by constraints</CardTitle></CardHeader><CardContent className="space-y-2">{plan.excludedChannels.map((channel) => <div key={channel.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/60 p-3"><div><p className="text-sm font-medium">{channel.name}</p><p className="mt-1 text-xs text-muted-foreground">{channel.rejectionReason}</p></div><Badge variant="outline">{channel.score}/100</Badge></div>)}</CardContent></Card> : null}
          <Card><CardHeader><CardTitle>Positioning and message</CardTitle></CardHeader><CardContent className="space-y-4"><blockquote className="border-l-2 border-primary pl-4 text-lg">{plan.positioning.positioningStatement}</blockquote><div className="grid gap-3 md:grid-cols-2"><div className="rounded-xl bg-muted/30 p-3"><p className="text-xs uppercase tracking-wider text-muted-foreground">Headline</p><p className="mt-2 font-semibold">{plan.messaging.headline}</p><p className="mt-1 text-sm text-muted-foreground">{plan.messaging.hookLine}</p></div><div className="rounded-xl bg-muted/30 p-3"><p className="text-xs uppercase tracking-wider text-muted-foreground">Proof + CTA</p><p className="mt-2 text-sm">{plan.messaging.proofPoint}</p><p className="mt-1 font-medium text-primary">{plan.messaging.ctaCopy}</p></div></div></CardContent></Card>
          <GTMExecutionOS plan={plan} planId={planId} mode="competitors" onUpdatePlan={onUpdatePlan} />
          <Card><CardHeader><CardTitle>Six-week execution cycle</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{plan.sixWeekPlan.map((week) => <div key={week.week} className="rounded-xl border border-border/60 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Week {week.week}</p><p className="mt-1 font-medium">{week.objective}</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{week.actions.map((action) => <li key={action}>• {action}</li>)}</ul></div>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="activate" className="mt-6 space-y-4">
          <div><h2 className="text-lg font-semibold">Runnable GTM plays</h2><p className="text-sm text-muted-foreground">Edit the founder-controlled play, then activate it through the right platform. Manual changes are free.</p></div>
          <GTMExecutionOS plan={plan} planId={planId} mode="execute" onUpdatePlan={onUpdatePlan} />
          {plan.plays.map((play) => <PlayEditor key={play.id} play={play} planId={planId} onSave={onUpdatePlay} onStartSprint={onStartSprint} />)}
        </TabsContent>

        <TabsContent value="review" className="mt-6 space-y-5">
          <Card><CardHeader><CardTitle>Two-minute founder check-in</CardTitle><p className="text-sm text-muted-foreground">Traction decides whether to double down, iterate, or stop. Your qualitative evidence explains what should change next.</p></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">{([
            ['wins', 'What worked?', 'Responses, messages, audiences, or actions that produced signal.'],
            ['misses', 'What missed?', 'Activity that produced weak or no evidence.'],
            ['objections', 'Buyer objections', 'Exact reasons buyers hesitated or declined.'],
            ['customerLanguage', 'Exact customer language', 'Words customers used for the problem, trigger, or desired outcome.'],
            ['blockers', 'Execution blockers', 'Time, assets, product, access, tracking, or delivery constraints.'],
            ['notes', 'Other learning', 'Anything the metrics do not explain.'],
          ] as const).map(([key, label, placeholder]) => <div key={key} className="space-y-2"><Label>{label}</Label><Textarea rows={3} value={reviewInput[key]} onChange={(event) => setReviewInput((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} /></div>)}</CardContent></Card>
          <Card className={cn('border-2', weeklyReview ? decisionStyles[weeklyReview.decision] : 'border-border/60')}>
            <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Weekly GTM decision</CardTitle><p className="mt-1 text-sm text-muted-foreground">Traction Engine remains the decision source. The adaptive review is included and never invents performance.</p></div><Button disabled={isReviewing} onClick={() => void onWeeklyReview(reviewInput)}>{isReviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}{weeklyReview ? 'Refresh review' : 'Run weekly review'}</Button></div></CardHeader>
            <CardContent>{weeklyReview ? <div className="space-y-4"><Badge variant="outline" className={decisionStyles[weeklyReview.decision]}>{weeklyReview.decision.replace('_', ' ')}</Badge><h3 className="text-xl font-semibold">{weeklyReview.nextBestAction}</h3><p className="text-sm text-muted-foreground">{weeklyReview.evidenceSummary}</p>{weeklyReview.signals?.length ? <div className="rounded-xl border border-border/60 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signals extracted</p><ul className="mt-2 space-y-1 text-sm">{weeklyReview.signals.map((signal) => <li key={signal}>• {signal}</li>)}</ul></div> : null}{weeklyReview.adaptation ? <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Week {weeklyReview.adaptation.week} rewritten</p>{weeklyReview.adaptation.previousObjective ? <p className="mt-2 text-xs text-muted-foreground line-through">{weeklyReview.adaptation.previousObjective}</p> : null}<p className="mt-2 font-semibold">{weeklyReview.adaptation.nextObjective}</p>{weeklyReview.adaptation.rationale ? <p className="mt-2 text-sm text-muted-foreground">{weeklyReview.adaptation.rationale}</p> : null}{weeklyReview.adaptation.changedVariables?.length ? <p className="mt-2 text-xs text-primary">Changed: {weeklyReview.adaptation.changedVariables.join(', ')}</p> : null}<ul className="mt-3 space-y-2 text-sm">{weeklyReview.adaptation.nextActions.map((action) => <li key={action} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{action}</li>)}</ul></div> : null}{weeklyReview.changeLog?.length ? <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Change log</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{weeklyReview.changeLog.map((change) => <li key={change}>• {change}</li>)}</ul></div> : null}</div> : <div className="rounded-xl bg-muted/30 p-4"><p className="font-medium">Next best action</p><p className="mt-1 text-sm text-muted-foreground">{primaryPlay ? `Run and log the first ${primaryPlay.channelName} experiment.` : 'Activate one focused play.'}</p></div>}</CardContent>
          </Card>
          <Card><CardHeader><CardTitle>{plan.growthLoop.name}</CardTitle></CardHeader><CardContent><div className="grid gap-2 text-sm md:grid-cols-4">{[['Input', plan.growthLoop.input], ['Action', plan.growthLoop.action], ['Output', plan.growthLoop.output], ['Reinvest', plan.growthLoop.reinvestment]].map(([label, value]) => <div key={label} className="rounded-xl bg-muted/30 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2">{value}</p></div>)}</div><div className="mt-4 rounded-xl border border-border/60 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary six-week outcome</p><p className="mt-1 font-medium">{plan.metrics.primaryOutcome}</p></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Motion funnel</CardTitle></CardHeader><CardContent className="space-y-2">{plan.funnel.map((stage, index) => <div key={stage.stage} className="flex items-start gap-3 rounded-xl border border-border/60 p-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span><div><p className="font-medium">{stage.stage}</p><p className="text-xs text-muted-foreground">Exit: {stage.exitCriteria} · Measure: {stage.metric}</p></div></div>)}</CardContent></Card>
          <GTMPipelineBoard plan={plan} onUpdatePlan={onUpdatePlan} />
          <Button variant="outline" onClick={() => setTab('activate')}>Review active plays<ArrowRight className="ml-2 h-4 w-4" /></Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
