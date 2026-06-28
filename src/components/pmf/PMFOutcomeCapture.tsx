import React, { useState } from 'react';
import { Target, CheckCircle2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  getPmfResultsTableName,
  handlePmfResultsTableError,
  isPmfResultsTableAvailable,
} from '@/lib/pmfResultsTable';

const OUTCOME_OPTIONS = [
  { value: 'launched', label: 'Launched — product is live' },
  { value: 'in_progress', label: 'In progress — still building' },
  { value: 'pivoted', label: 'Pivoted — changed direction' },
  { value: 'funded', label: 'Funded — received investment' },
  { value: 'abandoned', label: 'Abandoned — stopped working on it' },
  { value: 'unknown', label: 'Not sure yet' },
];

interface PMFOutcomeCaptureProps {
  analysisId: string;
  predictedScore?: number;
  predictedVerdict?: string;
  onSubmitted?: () => void;
}

const PMFOutcomeCapture: React.FC<PMFOutcomeCaptureProps> = ({
  analysisId,
  predictedScore,
  predictedVerdict,
  onSubmitted,
}) => {
  const [outcome, setOutcome] = useState('');
  const [accuracy, setAccuracy] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!outcome) {
      toast.error('Select what happened.');
      return;
    }
    if (!isPmfResultsTableAvailable()) {
      toast.error('Outcome tracking is unavailable in this environment.');
      return;
    }
    setSubmitting(true);
    try {
      const outcome_details: Record<string, unknown> = {};
      if (notes) outcome_details.notes = notes;
      if (predictedScore !== undefined) outcome_details.predictedScore = predictedScore;
      if (predictedVerdict) outcome_details.predictedVerdict = predictedVerdict;

      const { error } = await supabase
        .from(getPmfResultsTableName())
        .update({
          actual_outcome: outcome,
          outcome_date: new Date().toISOString(),
          outcome_details,
          user_accuracy_rating: accuracy > 0 ? accuracy : null,
          user_feedback_text: notes || null,
          feedback_submitted_at: new Date().toISOString(),
        })
        .eq('id', analysisId);

      if (error) {
        if (handlePmfResultsTableError(error)) {
          toast.error('Outcome tracking is unavailable in this environment.');
          return;
        }
        throw error;
      }

      setSubmitted(true);
      toast.success('Outcome recorded — thank you!');
      onSubmitted?.();
    } catch (e) {
      console.error('Outcome capture error:', e);
      toast.error('Could not save your outcome. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-success/25 bg-success/5 p-5 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
        <p className="text-sm text-foreground">
          Thanks — your outcome was recorded. It helps calibrate how accurate PMF Lab's scores are.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">What happened with this idea?</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Come back whenever you have an update. Telling us the real outcome is how PMF Lab learns whether its scores were right.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">Outcome</Label>
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger><SelectValue placeholder="Select what happened" /></SelectTrigger>
          <SelectContent>
            {OUTCOME_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">How accurate was your PMF score? (optional)</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setAccuracy(n)} aria-label={`${n} out of 5`}>
              <Star className={cn('h-5 w-5 transition-colors', n <= accuracy ? 'fill-warning text-warning' : 'text-muted-foreground/40')} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="outcome-notes" className="text-xs">Notes (optional)</Label>
        <Textarea id="outcome-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
          placeholder="What actually happened? Revenue, traction, why you pivoted…" />
      </div>

      <Button size="sm" onClick={submit} disabled={submitting}>
        {submitting ? 'Saving…' : 'Record outcome'}
      </Button>
    </div>
  );
};

export default PMFOutcomeCapture;
