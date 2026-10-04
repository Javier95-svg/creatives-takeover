import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DECISION_LABELS } from '@/components/traction/TractionExperimentCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { buildQuickLogPayload, readinessForQuickLog } from '@/lib/gtmQuickLog';
import type { GTMPlanV2, GTMPlay } from '@/lib/gtmV2';
import { buildGTMActionPacket, normalizeAcquisitionMetric } from '@/lib/marketExperiment';
import { evaluateMarketExperiment, recordExperimentDecision, recordFounderObservation } from '@/lib/marketExperimentClient';
import { getCurrentWeekStart, type TractionDecision } from '@/lib/tractionEngine';

// Log this week's result for the running play without leaving GTM Strategist.
// Founders had 0 weekly logs: the log lived in another tool. This writes the
// same Traction Engine week (see gtmQuickLog.ts), and only when the week is
// not logged yet, because the weekly save replaces the whole week.

interface GTMQuickLogProps {
  plan: GTMPlanV2;
  planId: string;
  play: GTMPlay;
  onUpdatePlay: (play: GTMPlay) => Promise<void>;
  onLogged: () => void;
}

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export default function GTMQuickLog({ plan, planId, play, onUpdatePlay, onLogged }: GTMQuickLogProps) {
  const { user } = useAuth();
  const packet = buildGTMActionPacket(plan, play);
  const [reached, setReached] = useState('');
  const [result, setResult] = useState('');
  const [hours, setHours] = useState('');
  const [decision, setDecision] = useState<TractionDecision | null>(null);
  const [saving, setSaving] = useState(false);
  const [alreadyLogged, setAlreadyLogged] = useState(false);
  const [saved, setSaved] = useState(false);

  const readiness = readinessForQuickLog({ target: play.target, result: toNumber(result), minimumSampleSize: packet.minimumSampleSize, reached: toNumber(reached) });
  const chosen = decision ?? readiness.recommendedDecision;
  const metric = play.metric.toLowerCase();

  const save = async () => {
    if (!user || !play.tractionSprintId) return;
    setSaving(true);
    try {
      const weekStart = getCurrentWeekStart();
      const { data: existing } = await (supabase as any)
        .from('traction_engine_weekly_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStart)
        .maybeSingle();
      if (existing) {
        setAlreadyLogged(true);
        return;
      }
      const [{ data: previous }, { data: sprint }] = await Promise.all([
        (supabase as any).from('traction_engine_weekly_logs').select('week_start_date, combined_score').eq('user_id', user.id)
          .order('week_start_date', { ascending: false }).limit(12),
        (supabase as any).from('traction_engine_sprints').select('activation_payload').eq('id', play.tractionSprintId).maybeSingle(),
      ]);
      const payload = buildQuickLogPayload({
        weekStart,
        sprintId: play.tractionSprintId,
        channel: play.channelName,
        hypothesis: play.hypothesis,
        metric: play.metric,
        target: play.target,
        minimumSampleSize: packet.minimumSampleSize,
        reached: toNumber(reached),
        result: toNumber(result),
        hours: toNumber(hours),
        decision: chosen,
        previousLogs: (previous ?? []) as Array<{ week_start_date: string; combined_score: number | null }>,
      });
      const { data: logId, error } = await supabase.rpc('save_traction_week' as never, {
        p_log: payload.logPayload,
        p_experiments: payload.experimentRows,
      } as never);
      if (error || !logId) throw error ?? new Error('Could not save this week.');

      // Same evidence trail as a week logged in Traction Engine. Best effort:
      // the week is saved even if this part fails.
      const marketExperimentId = (sprint as { activation_payload?: { marketExperimentId?: string } } | null)?.activation_payload?.marketExperimentId;
      if (marketExperimentId) {
        try {
          const metricKey = normalizeAcquisitionMetric(play.metric);
          await recordFounderObservation({
            userId: user.id,
            experimentId: marketExperimentId,
            metric: metricKey,
            value: toNumber(result),
            denominator: toNumber(reached),
            sourceType: 'traction_weekly_log',
            sourceId: String(logId),
            verificationMode: 'founder_reported',
            provenance: { weekStartDate: weekStart, channel: play.channelName, loggedFrom: 'gtm_strategist' },
            capturedAt: `${weekStart}T00:00:00.000Z`,
            idempotencyKey: `traction:${logId}:${marketExperimentId}:${metricKey}`,
          });
          await recordExperimentDecision({
            userId: user.id,
            experimentId: marketExperimentId,
            decision: chosen,
            result: payload.readiness.result,
            changedVariable: null,
            rationale: `${play.channelName}: ${toNumber(result)} ${metric} from ${toNumber(reached)} people reached.`,
          });
          await evaluateMarketExperiment(marketExperimentId);
        } catch (evidenceError) {
          console.warn('Week saved; the experiment evidence will catch up on the next log.', evidenceError);
        }
      }

      await onUpdatePlay({ ...play, actual: toNumber(result) });
      captureEvent('gtm_week_logged_inline', { plan_id: planId, play_id: play.id, decision: chosen, result: payload.readiness.result });
      setSaved(true);
      toast.success('This week is logged.');
    } catch (saveError) {
      console.error('Quick log failed:', saveError);
      toast.error('Could not save this week. Try again, or log it in Traction Engine.');
    } finally {
      setSaving(false);
    }
  };

  if (!play.tractionSprintId) return null;

  if (saved) {
    return (
      <section className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">This week is logged</h2>
        <p className="mt-1 text-sm text-muted-foreground">See what the review proposes for next week before anything in your plan changes.</p>
        <Button type="button" variant="outline" className="mt-3" onClick={onLogged}>See next week&apos;s changes</Button>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4 sm:p-5" aria-labelledby="gtm-quick-log-heading">
      <div>
        <h2 id="gtm-quick-log-heading" className="text-base font-semibold text-foreground">Log this week&apos;s result</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {play.channelName}, aiming for {play.target} {metric}. Saved to Traction Engine too.
        </p>
      </div>
      {alreadyLogged ? (
        <p className="text-sm text-muted-foreground">
          You already logged this week in Traction Engine.{' '}
          <Link to={`/traction-engine?planId=${encodeURIComponent(planId)}&playId=${encodeURIComponent(play.id)}`} className="font-medium text-primary underline-offset-4 hover:underline">
            Edit it there
          </Link>{' '}
          so no channel is overwritten.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="gtm-log-reached">People reached</Label>
              <Input id="gtm-log-reached" type="number" min="0" inputMode="numeric" value={reached} onChange={(event) => setReached(event.target.value)} />
              <p className="text-xs text-muted-foreground">Aim for at least {packet.minimumSampleSize}.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gtm-log-result">{play.metric}</Label>
              <Input id="gtm-log-result" type="number" min="0" inputMode="numeric" value={result} onChange={(event) => setResult(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gtm-log-hours">Hours spent</Label>
              <Input id="gtm-log-hours" type="number" min="0" step="0.5" inputMode="decimal" value={hours} onChange={(event) => setHours(event.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label>Your decision</Label>
              <Select value={chosen} onValueChange={(value) => setDecision(value as TractionDecision)}>
                <SelectTrigger aria-label="Your decision"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DECISION_LABELS) as TractionDecision[]).map((key) => (
                    <SelectItem key={key} value={key}>{DECISION_LABELS[key]}{key === readiness.recommendedDecision ? ' (suggested)' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" disabled={saving || reached === '' || result === ''} onClick={() => void save()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Save this week
            </Button>
          </div>
          {!readiness.sampleReached && reached !== '' ? (
            <p className="text-xs text-muted-foreground">Fewer than {packet.minimumSampleSize} people reached, so this week counts as too early to call.</p>
          ) : null}
        </>
      )}
    </section>
  );
}
