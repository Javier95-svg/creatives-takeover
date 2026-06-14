import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';

const PMF_EVIDENCE_TABLE = 'pmf_validation_evidence' as any;

const CHECKLIST_ITEMS = [
  'Problem hypothesis defined',
  'Target segment identified',
  'Validation method selected',
  'Interview script prepared',
  'Success criteria documented',
];

interface PMFValidationTrackerProps {
  onSaved?: () => Promise<void> | void;
}

export default function PMFValidationTracker({ onSaved }: PMFValidationTrackerProps) {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<string[]>([]);
  const [interviewCount, setInterviewCount] = useState(0);
  const [surveyCount, setSurveyCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadEvidence = async () => {
      if (!user) return;

      const { data } = await supabase
        .from(PMF_EVIDENCE_TABLE)
        .select('validation_checklist, interview_notes_count, survey_results_count')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data) return;
      const row = data as {
        validation_checklist: string[];
        interview_notes_count: number;
        survey_results_count: number;
      };

      setChecklist(row.validation_checklist || []);
      setInterviewCount(Number(row.interview_notes_count || 0));
      setSurveyCount(Number(row.survey_results_count || 0));
    };

    void loadEvidence();
  }, [user]);

  const toggleChecklist = (value: string) => {
    setChecklist((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
    );
  };

  const saveEvidence = async () => {
    if (!user) {
      toast.error('Sign in to save PMF validation evidence.');
      return;
    }

    setIsSaving(true);

    const payload = {
      user_id: user.id,
      validation_checklist: checklist,
      checklist_saved_at: new Date().toISOString(),
      interview_notes_count: Math.max(0, interviewCount),
      survey_results_count: Math.max(0, surveyCount),
      required_signals: PMF_REQUIRED_SIGNALS,
    };

    const { error } = await supabase
      .from(PMF_EVIDENCE_TABLE)
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to save PMF evidence:', error);
      toast.error('Unable to save PMF evidence right now.');
      setIsSaving(false);
      return;
    }

    toast.success('PMF validation evidence saved.');
    if (onSaved) {
      await onSaved();
    }
    setIsSaving(false);
  };

  const totalSignals = interviewCount + surveyCount;

  return (
    <Card className="border-primary/20 bg-card/90">
      <CardHeader>
        <CardTitle>Stage III Completion Tracker</CardTitle>
        <CardDescription>
          Save the validation checklist and at least {PMF_REQUIRED_SIGNALS} interview/survey signals to unlock Stage IV.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => (
            <Label key={item} className="flex items-center space-x-2 rounded-lg border border-border/60 p-2">
              <Checkbox checked={checklist.includes(item)} onCheckedChange={() => toggleChecklist(item)} />
              <span className="text-sm">{item}</span>
            </Label>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pmf-interviews">Interview notes count</Label>
            <Input
              id="pmf-interviews"
              type="number"
              min={0}
              value={interviewCount}
              onChange={(event) => setInterviewCount(Number(event.target.value || 0))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pmf-surveys">Survey results count</Label>
            <Input
              id="pmf-surveys"
              type="number"
              min={0}
              value={surveyCount}
              onChange={(event) => setSurveyCount(Number(event.target.value || 0))}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Current validation signals: {totalSignals}/{PMF_REQUIRED_SIGNALS}
        </p>

        <Button onClick={saveEvidence} disabled={isSaving}>
          Save Validation Evidence
        </Button>
      </CardContent>
    </Card>
  );
}
