import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { findLaunchDirectory } from '@/data/launchDirectories';
import { captureEvent } from '@/lib/analytics';
import type { GTMKillRule, GTMPlanV2, GTMPlay } from '@/lib/gtmV2';
import { buildGTMActionPacket } from '@/lib/marketExperiment';

const STATUS_TEXT: Record<GTMPlay['status'], string> = {
  active: 'Running',
  backlog: 'Not started',
  paused: 'Paused',
  completed: 'Finished',
};

const DIRECTORY_STEPS = ['recommended', 'visited', 'submitted', 'live', 'skipped'] as const;
const DIRECTORY_TEXT: Record<(typeof DIRECTORY_STEPS)[number], string> = {
  recommended: 'Not visited',
  visited: 'Visited',
  submitted: 'Submitted',
  live: 'Live',
  skipped: 'Skipped',
};

const OPERATOR_TEXT: Record<GTMKillRule['operator'], string> = { lt: 'below', lte: 'at or below', gt: 'above', gte: 'at or above' };

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

interface GTMPlayCardProps {
  play: GTMPlay;
  plan: GTMPlanV2;
  planId: string;
  onSave: (play: GTMPlay) => Promise<void>;
  onStartSprint: (play: GTMPlay) => Promise<void>;
}

/** One channel play: who, what you offer, what you expect and when you stop. Details sit in a disclosure. */
export default function GTMPlayCard({ play, plan, planId, onSave, onStartSprint }: GTMPlayCardProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(play);
  useEffect(() => setDraft(play), [play]);
  const directories = play.recommendedDirectoryIds.map(findLaunchDirectory).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const packet = buildGTMActionPacket(plan, play);
  const rule = play.structuredKillRule;

  const updateRule = (patch: Partial<GTMKillRule>) => setDraft((current) => ({
    ...current,
    structuredKillRule: {
      metric: current.structuredKillRule?.metric || current.metric,
      operator: current.structuredKillRule?.operator || 'lt',
      threshold: current.structuredKillRule?.threshold ?? current.target,
      observationWindowWeeks: current.structuredKillRule?.observationWindowWeeks || 3,
      minSampleSize: current.structuredKillRule?.minSampleSize || 3,
      ...patch,
    },
  }));

  const advanceDirectory = (directoryId: string) => {
    const current = play.directoryProgress?.[directoryId] ?? 'recommended';
    const next = DIRECTORY_STEPS[Math.min(DIRECTORY_STEPS.length - 1, DIRECTORY_STEPS.indexOf(current) + 1)];
    captureEvent('gtm_directory_progress_changed', { plan_id: planId, play_id: play.id, directory_id: directoryId, status: next });
    void onSave({ ...play, directoryProgress: { ...play.directoryProgress, [directoryId]: next } });
  };

  const startSprint = () => {
    captureEvent('gtm_play_activated', { plan_id: planId, play_id: play.id, channel_id: play.channelId, destination: 'embedded_traction_sprint' });
    void onStartSprint(play);
  };

  const openDirectories = () => {
    captureEvent('gtm_play_activated', { plan_id: planId, play_id: play.id, channel_id: play.channelId, destination: 'directories' });
    navigate(`/directories?planId=${encodeURIComponent(planId)}&playId=${encodeURIComponent(play.id)}`);
  };

  return (
    <article className="space-y-5 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{play.channelName}</h3>
          <p className="text-sm text-muted-foreground">
            {STATUS_TEXT[play.status]} · aiming for {play.target} {play.metric.toLowerCase()} a week
          </p>
        </div>
        {!editing ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Edit
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`${play.id}-audience`}>Who you are reaching</Label><Input id={`${play.id}-audience`} value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor={`${play.id}-trigger`}>When they are ready to buy</Label><Textarea id={`${play.id}-trigger`} rows={3} value={draft.buyingTrigger} onChange={(event) => setDraft({ ...draft, buyingTrigger: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor={`${play.id}-offer`}>What you offer</Label><Textarea id={`${play.id}-offer`} rows={3} value={draft.offer} onChange={(event) => setDraft({ ...draft, offer: event.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`${play.id}-message`}>Message</Label><Textarea id={`${play.id}-message`} rows={3} value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`${play.id}-hypothesis`}>What you expect to happen</Label><Textarea id={`${play.id}-hypothesis`} rows={2} value={draft.hypothesis} onChange={(event) => setDraft({ ...draft, hypothesis: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor={`${play.id}-metric`}>Number to move</Label><Input id={`${play.id}-metric`} value={draft.metric} onChange={(event) => setDraft({ ...draft, metric: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor={`${play.id}-target`}>Weekly target</Label><Input id={`${play.id}-target`} type="number" min="0" value={draft.target} onChange={(event) => setDraft({ ...draft, target: Number(event.target.value) || 0 })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`${play.id}-kill`}>When you stop</Label><Textarea id={`${play.id}-kill`} rows={2} value={draft.killRule ?? ''} onChange={(event) => setDraft({ ...draft, killRule: event.target.value })} placeholder="Stop if fewer than 2 replies a week for 3 weeks." /></div>
          <div className="space-y-1.5"><Label htmlFor={`${play.id}-threshold`}>Stop below</Label><Input id={`${play.id}-threshold`} type="number" min="0" value={draft.structuredKillRule?.threshold ?? draft.target} onChange={(event) => updateRule({ threshold: Number(event.target.value) || 0 })} /></div>
          <div className="space-y-1.5"><Label htmlFor={`${play.id}-window`}>For how many weeks</Label><Input id={`${play.id}-window`} type="number" min="1" max="6" value={draft.structuredKillRule?.observationWindowWeeks ?? 3} onChange={(event) => updateRule({ observationWindowWeeks: Math.max(1, Number(event.target.value) || 1) })} /></div>
          <div className="space-y-1.5"><Label htmlFor={`${play.id}-sample`}>After reaching at least</Label><Input id={`${play.id}-sample`} type="number" min="1" value={draft.structuredKillRule?.minSampleSize ?? 3} onChange={(event) => updateRule({ minSampleSize: Math.max(1, Number(event.target.value) || 1) })} /><p className="text-xs text-muted-foreground">People, so a slow week alone does not stop the channel.</p></div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => { setDraft(play); setEditing(false); }}>Cancel</Button>
            <Button type="button" variant="outline" onClick={() => void onSave(draft).then(() => setEditing(false))}>Save changes</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Who you are reaching">
            {play.audience}
            {play.buyingTrigger ? <p className="mt-1 text-muted-foreground">{play.buyingTrigger}</p> : null}
          </Field>
          <Field label="What you offer">{play.offer}</Field>
          <Field label="What you expect to happen">{play.hypothesis}</Field>
          <Field label="When you stop">
            {play.killRule || 'Not set yet. Add a stop rule before you start.'}
            {rule ? (
              <p className="mt-1 text-muted-foreground">
                {rule.metric} {OPERATOR_TEXT[rule.operator]} {rule.threshold} for {rule.observationWindowWeeks} weeks, once at least {rule.minSampleSize} people are reached.
              </p>
            ) : null}
          </Field>
        </div>
      )}

      {!editing ? (
        <DashboardDisclosure title="Message, steps and outreach details" summary={`${play.actions.length} steps, ${packet.weeklyQuota} people to reach a week`}>
          <div className="space-y-4 text-sm">
            <Field label="Message">{play.message}</Field>
            <Field label="Steps">
              <ol className="list-decimal space-y-1 pl-5">
                {play.actions.map((action) => <li key={action}>{action}</li>)}
              </ol>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Who qualifies">{packet.prospectCriteria}</Field>
              <Field label="How to build the list">{packet.listBuildingInstruction}</Field>
              <Field label="Message to send">{packet.approvedMessage}</Field>
              <Field label="Pace">{packet.dailyQuota} a day, {packet.weeklyQuota} a week. Ask: {packet.cta}</Field>
            </div>
            <p className="text-muted-foreground">Reach at least {packet.minimumSampleSize} people before reading the result. Change one thing at a time.</p>
            {directories.length > 0 ? (
              <Field label="Directories to list on">
                <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                  {directories.map((directory) => (
                    <li key={directory.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                      <span>
                        <span className="block font-medium">{directory.name}</span>
                        <span className="block text-xs text-muted-foreground">{directory.cost}</span>
                      </span>
                      <Button type="button" size="sm" variant="outline" onClick={() => advanceDirectory(directory.id)}>
                        {DIRECTORY_TEXT[play.directoryProgress?.[directory.id] ?? 'recommended']}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button type="button" variant="link" className="h-auto px-0" onClick={openDirectories}>Open all {directories.length} directories</Button>
              </Field>
            ) : null}
          </div>
        </DashboardDisclosure>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-4">
        {play.tractionSprintId ? (
          <p className="text-sm text-muted-foreground">Running in Traction Engine{typeof play.actual === 'number' ? `. Last result: ${play.actual} of ${play.target}.` : '. No result logged yet.'}</p>
        ) : (
          <Button type="button" variant="outline" onClick={startSprint}>Start this experiment</Button>
        )}
        <Link
          to={`/traction-engine?step=sprint&planId=${encodeURIComponent(planId)}&playId=${encodeURIComponent(play.id)}`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Open Traction Engine
        </Link>
      </div>
    </article>
  );
}
