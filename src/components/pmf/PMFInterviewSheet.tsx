import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { PMFInterviewLog } from '@/hooks/usePMFLab';
import type { JourneyAssumption } from '@/lib/journeyOutcomes';
import { cn } from '@/lib/utils';
import { BUYING_INTENT_OPTIONS, CONVERSATION_SIGNALS, isInterviewComplete } from './pmfInterviewModel';

interface PMFInterviewSheetProps {
  open: boolean;
  /** The conversation being added or edited; null closes the dialog. */
  interview: PMFInterviewLog | null;
  isNew: boolean;
  assumptions: JourneyAssumption[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (interview: PMFInterviewLog) => void;
}

export function PMFInterviewSheet({ open, interview, isNew, assumptions, saving, onOpenChange, onSave }: PMFInterviewSheetProps) {
  const [draft, setDraft] = useState<PMFInterviewLog | null>(interview);
  useEffect(() => setDraft(interview), [interview]);

  if (!draft) return null;
  const set = <K extends keyof PMFInterviewLog>(key: K, value: PMFInterviewLog[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  const needsAssumption = assumptions.length > 0;
  const complete = isInterviewComplete(draft, needsAssumption);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add a conversation' : 'Edit conversation'}</DialogTitle>
          <DialogDescription>Write down what this person told you, in their words where you can.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pmf-name">Who did you talk to?</Label>
              <Input id="pmf-name" value={draft.intervieweeName} onChange={(e) => set('intervieweeName', e.target.value)} placeholder="Name or initials" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pmf-segment">Customer group (optional)</Label>
              <Input id="pmf-segment" value={draft.segment} onChange={(e) => set('segment', e.target.value)} placeholder="e.g. small agencies" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pmf-profile">What do they do?</Label>
            <Input id="pmf-profile" value={draft.basicProfile} onChange={(e) => set('basicProfile', e.target.value)} placeholder="e.g. Runs a 6-person design studio" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pmf-feedback">What did they tell you?</Label>
            <Textarea id="pmf-feedback" rows={3} value={draft.mainFeedback} onChange={(e) => set('mainFeedback', e.target.value)} placeholder="The problem, how they handle it today, what they said about your idea" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pmf-objections">Doubts or objections (optional)</Label>
              <Textarea id="pmf-objections" rows={2} value={draft.objections} onChange={(e) => set('objections', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pmf-missing">What they wished it did (optional)</Label>
              <Textarea id="pmf-missing" rows={2} value={draft.missingFeatures} onChange={(e) => set('missingFeatures', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>How interested were they?</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BUYING_INTENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    set('buyingIntent', option.value);
                    set('interestLevel', { low: 2, medium: 3, high: 4, ready_to_pay: 5 }[option.value]);
                  }}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm transition-colors',
                    draft.buyingIntent === option.value ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:border-primary/40',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">During the conversation</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CONVERSATION_SIGNALS.map((signal) => (
                <label key={signal.key} className="flex items-center gap-2 text-sm text-foreground">
                  <Checkbox checked={Boolean(draft[signal.key])} onCheckedChange={(checked) => set(signal.key, checked === true)} />
                  {signal.label}
                </label>
              ))}
            </div>
          </fieldset>

          {needsAssumption && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label htmlFor="pmf-assumption">Which ICP assumption did this interview test?</Label>
              <select
                id="pmf-assumption"
                value={draft.assumptionFingerprint ?? ''}
                onChange={(event) => {
                  const selected = assumptions.find((item) => item.fingerprint === event.target.value);
                  setDraft((current) => current ? {
                    ...current,
                    assumptionFingerprint: selected?.fingerprint,
                    assumptionStatement: selected?.statement,
                    assumptionStatus: selected ? current.assumptionStatus : undefined,
                  } : current);
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">Choose the assumption</option>
                {assumptions.map((assumption) => (
                  <option key={assumption.id} value={assumption.fingerprint}>{assumption.statement}</option>
                ))}
              </select>
              <div className="flex gap-2">
                {(['confirmed', 'rejected'] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={draft.assumptionStatus === status ? 'default' : 'outline'}
                    disabled={!draft.assumptionFingerprint}
                    onClick={() => set('assumptionStatus', status)}
                  >
                    {status === 'confirmed' ? 'Confirmed it' : 'Proved it wrong'}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" disabled={!complete || saving} onClick={() => onSave(draft)}>
            {saving ? 'Saving…' : 'Save conversation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
