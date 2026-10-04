import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { JourneyAssumption } from '@/lib/journeyOutcomes';
import type { ChangedExperimentVariable, DecisionReadiness } from '@/lib/marketExperiment';
import type { TractionDecision, TractionExperimentInput } from '@/lib/tractionEngine';

export type TractionExperimentDraft = TractionExperimentInput & {
  localId: string;
  decisionRationale: string;
  assumptionFingerprint?: string;
  assumptionStatus?: 'confirmed' | 'rejected';
  sampleSize: number;
  minimumSampleSize: number;
  marketExperimentId?: string;
  changedVariable?: ChangedExperimentVariable;
  nextVariableValue: string;
};

export const DECISION_LABELS: Record<TractionDecision, string> = {
  double_down: 'Double down',
  iterate: 'Iterate',
  narrow: 'Narrow the audience',
  pivot: 'Pivot',
  kill: 'Kill',
};

export const METRIC_OPTIONS = [
  'Prospects', 'Sent', 'Delivered', 'Replies', 'Positive replies', 'Meetings',
  'Attended', 'Offers', 'Commitments', 'Payments', 'Qualified views',
  'Demo completions', 'CTA clicks', 'Signups', 'Activations', 'D7 retained', 'D30 retained',
];

const CHANGEABLE: Record<ChangedExperimentVariable, string> = {
  audience: 'Audience',
  problem: 'Problem',
  offer: 'Offer',
  message: 'Message',
  channel: 'Channel',
  asset: 'Asset',
  cta: 'Call to action',
  target: 'Target',
};

const RESULT_TEXT: Record<DecisionReadiness['result'], string> = {
  passed: 'Target reached',
  failed: 'Target missed',
  inconclusive: 'Not enough people reached yet',
};

const numberFromInput = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

interface TractionExperimentCardProps {
  experiment: TractionExperimentDraft;
  index: number;
  canRemove: boolean;
  readiness: DecisionReadiness;
  assumptions: JourneyAssumption[];
  /** Locked fields came from a GTM play and must stay as planned. */
  fromPlan: boolean;
  channelInputId?: string;
  onChange: (patch: Partial<TractionExperimentDraft>) => void;
  onRemove: () => void;
}

export function TractionExperimentCard({
  experiment,
  index,
  canRemove,
  readiness,
  assumptions,
  fromPlan,
  channelInputId,
  onChange,
  onRemove,
}: TractionExperimentCardProps) {
  const id = (name: string) => `traction-${experiment.localId}-${name}`;
  const recommended = readiness.recommendedDecision;
  const overriding = experiment.decision !== recommended;

  return (
    <article className="space-y-5 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {experiment.channel.trim() || `Experiment ${index + 1}`}
          </h3>
          <p className="text-sm text-muted-foreground">
            {fromPlan ? 'From your GTM plan. The channel, metric and target stay as planned.' : 'One channel, one number to move.'}
          </p>
        </div>
        {canRemove && (
          <Button type="button" size="icon" variant="ghost" aria-label="Remove experiment" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Channel" htmlFor={channelInputId ?? id('channel')}>
          <Input
            id={channelInputId ?? id('channel')}
            value={experiment.channel}
            disabled={fromPlan}
            onChange={(event) => onChange({ channel: event.target.value })}
            placeholder="e.g. LinkedIn posts"
          />
        </Field>
        <Field label="Number you want to move">
          <Select value={experiment.targetMetric} disabled={fromPlan} onValueChange={(value) => onChange({ targetMetric: value })}>
            <SelectTrigger aria-label="Number you want to move"><SelectValue /></SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.map((metric) => <SelectItem key={metric} value={metric}>{metric}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="What you expect to happen" htmlFor={id('hypothesis')}>
        <Textarea
          id={id('hypothesis')}
          rows={2}
          value={experiment.hypothesis}
          disabled={fromPlan}
          onChange={(event) => onChange({ hypothesis: event.target.value })}
          placeholder="A post about the receipt problem gets 10 signups from fleet owners."
        />
      </Field>
      <Field label="What you did this week" htmlFor={id('action')} hint="Specific enough that you could repeat it next week.">
        <Textarea
          id={id('action')}
          rows={2}
          value={experiment.actionTaken}
          onChange={(event) => onChange({ actionTaken: event.target.value })}
          placeholder="Posted twice, sent 20 direct messages to fleet owners."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Target" htmlFor={id('target')}>
          <Input id={id('target')} type="number" min="0" value={experiment.targetValue} disabled={fromPlan}
            onChange={(event) => onChange({ targetValue: numberFromInput(event.target.value) })} />
        </Field>
        <Field label="Result" htmlFor={id('result')}>
          <Input id={id('result')} type="number" min="0" value={experiment.resultValue}
            onChange={(event) => onChange({ resultValue: numberFromInput(event.target.value) })} />
        </Field>
        <Field label="People reached" htmlFor={id('sample')} hint={`Aim for at least ${experiment.minimumSampleSize}.`}>
          <Input id={id('sample')} type="number" min="0" value={experiment.sampleSize}
            onChange={(event) => onChange({ sampleSize: numberFromInput(event.target.value) })} />
        </Field>
        <Field label="Hours spent" htmlFor={id('hours')}>
          <Input id={id('hours')} type="number" min="0" step="0.25" value={experiment.timeInvestedHours}
            onChange={(event) => onChange({ timeInvestedHours: numberFromInput(event.target.value) })} />
        </Field>
      </div>

      {assumptions.length > 0 && (
        <div className="grid gap-4 rounded-lg border border-border p-3 sm:grid-cols-2">
          <Field label="ICP assumption tested">
            <Select
              value={experiment.assumptionFingerprint ?? 'none'}
              onValueChange={(value) => onChange({
                assumptionFingerprint: value === 'none' ? undefined : value,
                assumptionStatus: value === 'none' ? undefined : experiment.assumptionStatus,
              })}
            >
              <SelectTrigger aria-label="ICP assumption tested"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No ICP assumption linked</SelectItem>
                {assumptions.map((assumption) => (
                  <SelectItem key={assumption.id} value={assumption.fingerprint}>{assumption.statement}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="What this week showed">
            <Select
              value={experiment.assumptionStatus ?? ''}
              disabled={!experiment.assumptionFingerprint}
              onValueChange={(value) => onChange({ assumptionStatus: value as 'confirmed' | 'rejected' })}
            >
              <SelectTrigger aria-label="What this week showed"><SelectValue placeholder="Confirmed or proved wrong" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed it</SelectItem>
                <SelectItem value="rejected">Proved it wrong</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            The weekly result is added to the ICP confidence history. It never rewrites the original customer decision.
          </p>
        </div>
      )}

      <div className="space-y-3 border-t border-border/60 pt-4">
        <p className="text-sm text-foreground">
          <span className="font-medium">{RESULT_TEXT[readiness.result]}.</span>{' '}
          <span className="text-muted-foreground">Based on the numbers: {DECISION_LABELS[recommended].toLowerCase()}.</span>
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your decision">
            <Select value={experiment.decision} onValueChange={(value) => onChange({ decision: value as TractionDecision })}>
              <SelectTrigger aria-label="Your decision"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(DECISION_LABELS) as TractionDecision[]).map((decision) => (
                  <SelectItem key={decision} value={decision}>{DECISION_LABELS[decision]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {overriding && (
            <Field label="Why you chose differently" htmlFor={id('why')}>
              <Textarea id={id('why')} rows={2} value={experiment.decisionRationale}
                onChange={(event) => onChange({ decisionRationale: event.target.value })} />
            </Field>
          )}
        </div>

        {['iterate', 'narrow', 'pivot'].includes(experiment.decision) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="The one thing you will change next" hint="Keep everything else the same so you can tell what worked.">
              <Select value={experiment.changedVariable ?? 'message'} onValueChange={(value) => onChange({ changedVariable: value as ChangedExperimentVariable })}>
                <SelectTrigger aria-label="The one thing you will change next"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CHANGEABLE) as ChangedExperimentVariable[]).map((variable) => (
                    <SelectItem key={variable} value={variable}>{CHANGEABLE[variable]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="What it changes to" htmlFor={id('next')}>
              <Input id={id('next')} value={experiment.nextVariableValue}
                onChange={(event) => onChange({ nextVariableValue: event.target.value })}
                placeholder={experiment.changedVariable === 'target' ? 'New target number' : `New ${CHANGEABLE[experiment.changedVariable ?? 'message'].toLowerCase()}`} />
            </Field>
          </div>
        )}

        {!readiness.sampleReached && (
          <p className="text-xs text-muted-foreground">
            Reach at least {experiment.minimumSampleSize} people before treating the result as a real answer.
          </p>
        )}
      </div>
    </article>
  );
}
