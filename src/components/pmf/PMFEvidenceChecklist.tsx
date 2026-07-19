import React, { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PMFValidationEvidence } from '@/hooks/usePMFLab';
import { getPmfConfidence } from '@/lib/pmfConfidence';

// Canonical qualitative validation signals (persisted by label in validation_checklist).
const PMF_CHECKLIST_ITEMS = [
  'Problem hypothesis written down',
  'Target segment identified',
  'Ran customer interviews',
  'Documented recurring objections',
  'Captured a willingness-to-pay signal',
  'Ran the Sean Ellis 40% survey',
];

interface PMFEvidenceChecklistProps {
  evidence: PMFValidationEvidence | null;
  requiredSignals: number;
  onSaveChecklist: (items: string[]) => Promise<boolean>;
}

const PMFEvidenceChecklist: React.FC<PMFEvidenceChecklistProps> = ({
  evidence,
  requiredSignals,
  onSaveChecklist,
}) => {
  const [checked, setChecked] = useState<string[]>(evidence?.validation_checklist ?? []);

  useEffect(() => {
    setChecked(evidence?.validation_checklist ?? []);
  }, [evidence?.validation_checklist]);

  const signals = (evidence?.interview_notes_count ?? 0) + (evidence?.survey_results_count ?? 0);
  const pct = requiredSignals > 0 ? Math.min(100, Math.round((signals / requiredSignals) * 100)) : 0;
  const meetsSignals = signals >= requiredSignals;
  const confidence = getPmfConfidence(signals);

  const toggle = async (item: string, next: boolean) => {
    const updated = next
      ? Array.from(new Set([...checked, item]))
      : checked.filter((i) => i !== item);
    setChecked(updated); // optimistic
    const ok = await onSaveChecklist(updated);
    if (!ok) setChecked(checked); // revert on failure
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
          Validation evidence
        </p>
      </div>

      {/* Signals progress (interviews + survey responses) */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-foreground">
            {signals} / {requiredSignals} validation signals
          </p>
          <span className={cn('text-xs font-medium', meetsSignals ? 'text-success' : 'text-muted-foreground')}>
            {meetsSignals ? 'Target reached' : `${requiredSignals - signals} to go`}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{confidence.label}.</span> {confidence.description}
        </p>
      </div>

      {/* Qualitative checklist */}
      <div className="space-y-2.5">
        {PMF_CHECKLIST_ITEMS.map((item) => {
          const isChecked = checked.includes(item);
          return (
            <label key={item} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={isChecked}
                onCheckedChange={(value) => void toggle(item, value === true)}
              />
              <span className={cn(
                'text-sm transition-colors',
                isChecked ? 'text-muted-foreground line-through' : 'text-foreground group-hover:text-foreground',
              )}>
                {item}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default PMFEvidenceChecklist;
