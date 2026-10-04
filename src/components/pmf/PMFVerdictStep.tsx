import { useMemo, useState } from 'react';

import { CreditCostNotice } from '@/components/CreditCostNotice';
import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import type { PMFEvidenceAnswers, PMFInterviewLog } from '@/hooks/usePMFLab';
import { PMF_SIGNAL_THRESHOLDS } from '@/lib/pmfConfidence';
import { buildPmfAnswers } from '@/lib/pmfNextStep';
import { cn } from '@/lib/utils';
import { TEST_TYPES } from './pmfInterviewModel';

// The few questions the scorer needs that the conversations do not already
// answer. Counts such as "asked about price" come from the logged conversations.

interface PMFVerdictStepProps {
  interviews: PMFInterviewLog[];
  surveyResponses: number;
  signalCount: number;
  onSubmit: (answers: PMFEvidenceAnswers) => void;
}

export function PMFVerdictStep({ interviews, surveyResponses, signalCount, onSubmit }: PMFVerdictStepProps) {
  const [testTypes, setTestTypes] = useState<string[]>(() => [
    ...(interviews.length > 0 ? ['Problem interview'] : []),
    ...(surveyResponses > 0 ? ['Survey'] : []),
  ]);
  const [peopleReached, setPeopleReached] = useState(0);
  const [quote, setQuote] = useState('');
  const [changeMind, setChangeMind] = useState('');
  const [confidence, setConfidence] = useState(5);
  const [payDetail, setPayDetail] = useState('');
  const [urgency, setUrgency] = useState('');
  const [consistency, setConsistency] = useState('');
  const [uncertainties, setUncertainties] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const quoteSuggestions = useMemo(
    () => interviews.map((item) => item.mainFeedback.trim()).filter((text) => text.length > 20).slice(0, 3),
    [interviews],
  );
  const enoughEvidence = signalCount >= PMF_SIGNAL_THRESHOLDS.decisionGrade;
  const canSubmit = testTypes.length > 0 && (enoughEvidence || acknowledged);

  const toggleType = (type: string) =>
    setTestTypes((current) => (current.includes(type) ? current.filter((item) => item !== type) : [...current, type]));

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(buildPmfAnswers(interviews, {
      testTypes,
      peopleReached,
      mostPainfulQuote: quote,
      willingnessToPayDetail: payDetail,
      urgencyProxy: urgency,
      consistencyNote: consistency,
      founderUncertainties: uncertainties,
      whatWouldChangeMind: changeMind,
      confidenceLevel: confidence,
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Get your verdict</h2>
        <p className="text-sm text-muted-foreground">
          Based on {interviews.length} conversation{interviews.length === 1 ? '' : 's'} and {surveyResponses} survey answer{surveyResponses === 1 ? '' : 's'}.
          A few more questions and PMF Lab tells you whether to build, narrow, pivot or stop.
        </p>
      </div>

      <div className="space-y-5 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
        <div className="space-y-2">
          <Label>How did you reach people?</Label>
          <div className="flex flex-wrap gap-2">
            {TEST_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                aria-pressed={testTypes.includes(type)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  testTypes.includes(type) ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:border-primary/40',
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pmf-reached">How many people did you reach in total?</Label>
          <Input id="pmf-reached" type="number" min={0} className="max-w-40" value={peopleReached || ''} placeholder={String(interviews.length)} onChange={(e) => setPeopleReached(Math.max(0, Number(e.target.value || 0)))} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pmf-quote">The strongest thing someone said about the problem</Label>
          <Textarea id="pmf-quote" rows={2} value={quote} onChange={(e) => setQuote(e.target.value)} />
          {quoteSuggestions.length > 0 && !quote && (
            <div className="flex flex-wrap gap-2 pt-1">
              {quoteSuggestions.map((text) => (
                <button key={text} type="button" onClick={() => setQuote(text)} className="max-w-full truncate rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/40">
                  Use: {text}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pmf-change">What would change your mind about this idea?</Label>
          <Textarea id="pmf-change" rows={2} value={changeMind} onChange={(e) => setChangeMind(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>How confident are you right now? {confidence}/10</Label>
          <Slider min={1} max={10} step={1} value={[confidence]} onValueChange={([value]) => setConfidence(value)} className="max-w-sm" />
        </div>

        <DashboardDisclosure title="Add more context (optional)">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pmf-pay">What did people say about paying?</Label>
              <Textarea id="pmf-pay" rows={2} value={payDetail} onChange={(e) => setPayDetail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pmf-urgency">How urgent is the problem for them?</Label>
              <Textarea id="pmf-urgency" rows={2} value={urgency} onChange={(e) => setUrgency(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pmf-consistency">What kept coming up across conversations?</Label>
              <Textarea id="pmf-consistency" rows={2} value={consistency} onChange={(e) => setConsistency(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pmf-unsure">What are you still unsure about?</Label>
              <Textarea id="pmf-unsure" rows={2} value={uncertainties} onChange={(e) => setUncertainties(e.target.value)} />
            </div>
          </div>
        </DashboardDisclosure>

        {!enoughEvidence && (
          <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-foreground">
            <Checkbox checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked === true)} className="mt-0.5" />
            <span>
              I understand this is an early read. With {signalCount} of {PMF_SIGNAL_THRESHOLDS.decisionGrade} signals, the verdict is provisional.
            </span>
          </label>
        )}

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <CreditCostNotice feature="PMF_SCORING" featureName="PMF verdict" />
          <Button type="button" onClick={submit} disabled={!canSubmit}>Get my verdict</Button>
        </div>
        {testTypes.length === 0 && <p className="text-xs text-muted-foreground">Choose at least one way you reached people.</p>}
      </div>
    </div>
  );
}
