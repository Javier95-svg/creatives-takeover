import { useMemo, useState } from 'react';
import { Check, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DocToggle } from '@/components/dashboard/DocBlocks';
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
        className="mt-4"
        aria-labelledby="founder-stage-title"
        title="We use this stage to tune your journey, missions and next actions."
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 text-sm text-muted-foreground">
            <span id="founder-stage-title" className="font-medium text-foreground">
              Operating stage {state.current_stage}: {STAGES[state.current_stage].name}
            </span>
            {' · '}{confidenceLabel(state.confidence_band)}
            {state.capital_motion !== 'inactive' ? ` · Fundraising ${state.capital_motion}` : ''}
          </p>

          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {isConfirmed ? (
              <span className="inline-flex items-center gap-1.5 px-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                Stage confirmed
              </span>
            ) : (
              <Button
                type="button"
                size="sm"
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
              size="sm"
              variant="ghost"
              disabled={!available || saving}
              onClick={openCorrection}
            >
              Not quite
            </Button>
          </div>
        </div>

        <DocToggle title="Why this stage">
          <ul className="space-y-1" aria-label="Why you are at this stage">
            {explanations.map((explanation) => (
              <li key={explanation} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {explanation}
              </li>
            ))}
          </ul>
        </DocToggle>

        {boundaryQuestion ? (
          <div className="mt-3 rounded-xl bg-muted/50 p-4">
            <p className="text-xs font-medium text-muted-foreground">
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
                variant="outline"
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
