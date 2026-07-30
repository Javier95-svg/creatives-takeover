import { useMemo, useState } from 'react';
import { CheckCircle2, Gauge, Landmark, Loader2, PencilLine } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStageIntelligence } from '@/hooks/useStageIntelligence';
import {
  getStageExplanation,
  type StageCorrectionReason,
} from '@/lib/stageIntelligence';
import {
  STAGES,
  type FounderOperatingStageId,
} from '@/lib/stageDiagnostic';

const OPERATING_STAGES: FounderOperatingStageId[] = [1, 2, 3, 4, 5, 6];

const CORRECTION_REASONS: Array<[StageCorrectionReason, string]> = [
  ['product_state', 'My product is at a different point'],
  ['customer_evidence', 'My customer evidence is different'],
  ['traction_evidence', 'My traction or revenue evidence is different'],
  ['stage_definition', 'Another stage description fits better'],
  ['capital_is_separate', 'Fundraising does not reflect my operating stage'],
];

function confidenceLabel(value: 'low' | 'medium' | 'high') {
  if (value === 'high') return 'High evidence confidence';
  if (value === 'medium') return 'Moderate evidence confidence';
  return 'Needs one more signal';
}

export default function FounderStageIntelligenceCard() {
  const {
    state,
    boundaryQuestion,
    loading,
    saving,
    available,
    confirm,
    answerBoundary,
  } = useStageIntelligence();
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctedStage, setCorrectedStage] = useState<FounderOperatingStageId>(1);
  const [correctionReason, setCorrectionReason] = useState<StageCorrectionReason>('stage_definition');

  const explanations = useMemo(
    () => state ? getStageExplanation(state) : [],
    [state],
  );

  if (loading || !state) return null;

  const isConfirmed = state.user_confirmed_stage === state.current_stage
    && Boolean(state.user_confirmed_at);

  const openCorrection = () => {
    setCorrectedStage(state.current_stage);
    setCorrectionReason('stage_definition');
    setCorrectionOpen(true);
  };

  const saveCorrection = async () => {
    try {
      const result = await confirm(correctedStage, correctionReason);
      if (!result) return;
      setCorrectionOpen(false);
      toast.success('Your operating stage has been updated.');
    } catch (error) {
      console.error('Unable to correct founder stage', error);
      toast.error('We could not save your stage correction. Please try again.');
    }
  };

  const confirmCurrent = async () => {
    try {
      const result = await confirm(state.current_stage, 'stage_definition');
      if (result) toast.success('Stage confirmed. This improves future recommendations.');
    } catch (error) {
      console.error('Unable to confirm founder stage', error);
      toast.error('We could not confirm your stage. Please try again.');
    }
  };

  const resolveBoundary = async (answer: 'lower' | 'upper') => {
    try {
      const result = await answerBoundary(answer);
      if (result) toast.success('Thanks — your dashboard focus has been refined.');
    } catch (error) {
      console.error('Unable to save boundary answer', error);
      toast.error('We could not save that answer. Please try again.');
    }
  };

  return (
    <>
      <section
        className="mb-6 rounded-2xl border border-border bg-card/70 p-5"
        aria-labelledby="founder-stage-title"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Gauge className="h-3.5 w-3.5" />
                Operating stage {state.current_stage}
              </span>
              <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                {confidenceLabel(state.confidence_band)}
              </span>
              {state.capital_motion !== 'inactive' ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                  <Landmark className="h-3.5 w-3.5" />
                  Fundraising {state.capital_motion}
                </span>
              ) : null}
            </div>
            <h2 id="founder-stage-title" className="mt-3 text-xl font-semibold text-foreground">
              {STAGES[state.current_stage].name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We use this evidence-backed stage to tune your journey, missions, and next actions.
            </p>
            <div className="mt-4 grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                We placed you here because
              </p>
              {explanations.map((explanation) => (
                <p key={explanation} className="flex items-start gap-2 text-sm text-foreground/90">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {explanation}
                </p>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {isConfirmed ? (
              <span className="inline-flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Stage confirmed
              </span>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={!available || saving}
                onClick={() => void confirmCurrent()}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Looks right
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={!available || saving}
              onClick={openCorrection}
            >
              <PencilLine className="h-4 w-4" />
              Not quite
            </Button>
          </div>
        </div>

        {boundaryQuestion ? (
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              One detail will improve your dashboard
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">{boundaryQuestion.question}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void resolveBoundary('lower')}
              >
                {boundaryQuestion.lowerLabel}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saving}
                onClick={() => void resolveBoundary('upper')}
              >
                {boundaryQuestion.upperLabel}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Correct your operating stage</DialogTitle>
            <DialogDescription>
              Choose the stage that describes what exists today. Your goal and fundraising activity remain separate.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid gap-2">
              <Label>Current operating reality</Label>
              <Select
                value={String(correctedStage)}
                onValueChange={(value) => setCorrectedStage(Number(value) as FounderOperatingStageId)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPERATING_STAGES.map((stage) => (
                    <SelectItem key={stage} value={String(stage)}>
                      {stage}. {STAGES[stage].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">
                {STAGES[correctedStage].description}
              </p>
            </div>
            <div className="grid gap-2">
              <Label>What was different?</Label>
              <Select
                value={correctionReason}
                onValueChange={(value) => setCorrectionReason(value as StageCorrectionReason)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CORRECTION_REASONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCorrectionOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveCorrection()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
