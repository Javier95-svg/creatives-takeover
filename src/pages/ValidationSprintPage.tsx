import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  FlaskConical,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import Footer from '@/components/Footer';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';
import { CreditCostNotice } from '@/components/CreditCostNotice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { OUTCOME_FEATURE_FLAGS } from '@/lib/outcomeFeatureFlags';
import {
  EMPTY_CUSTOMER_BRIEF,
  buildEvidenceBuildBrief,
  buildFiveInterviewPlan,
  buildOutreachScript,
  buildUntestedAssumptions,
  buildValidationHypothesis,
  clearGuestValidationBrief,
  downloadTextFile,
  fingerprintParticipant,
  loadGuestValidationBrief,
  nextEvidenceThreshold,
  resolveEvidenceGrade,
  saveGuestValidationBrief,
  type CustomerDecisionBrief,
  type ValidationDecision,
  type ValidationDecisionResult,
  type ValidationEvidenceRow,
  type ValidationSprintRow,
} from '@/lib/validationSprint';

const STEPS = [
  { title: 'Choose the customer', description: 'Define one customer and one decision.' },
  { title: 'Find people', description: 'Create an unbiased learning plan.' },
  { title: 'Add real evidence', description: 'Log interviews and import verified behavior.' },
  { title: 'Make the decision', description: 'Build, Narrow, Pivot, Stop, or keep testing.' },
];

function signalLabel(signal: ValidationEvidenceRow['signal']) {
  if (signal === 'supports') return 'Supports';
  if (signal === 'contradicts') return 'Contradicts';
  return 'Neutral';
}

function decisionLabel(decision: ValidationDecision | null | undefined) {
  return (decision || 'collect_more_evidence')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ValidationSprintPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [brief, setBrief] = useState<CustomerDecisionBrief>(() => loadGuestValidationBrief());
  const [sprint, setSprint] = useState<ValidationSprintRow | null>(null);
  const [evidence, setEvidence] = useState<ValidationEvidenceRow[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [guestBriefReady, setGuestBriefReady] = useState(false);
  const [participantKey, setParticipantKey] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [evidenceSignal, setEvidenceSignal] = useState<ValidationEvidenceRow['signal']>('neutral');
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(null);
  const [editingEvidenceSummary, setEditingEvidenceSummary] = useState('');
  const [editingEvidenceSignal, setEditingEvidenceSignal] = useState<ValidationEvidenceRow['signal']>('neutral');
  const [overrideDecision, setOverrideDecision] = useState<ValidationDecision | ''>('');
  const [overrideRationale, setOverrideRationale] = useState('');
  const [decisionResult, setDecisionResult] = useState<ValidationDecisionResult | null>(null);

  const loadEvidence = useCallback(async (sprintId: string) => {
    const { data, error } = await supabase
      .from('validation_sprint_evidence' as never)
      .select('*')
      .eq('sprint_id', sprintId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    setEvidence((data ?? []) as unknown as ValidationEvidenceRow[]);
  }, []);

  const loadSprint = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('validation_sprints' as never)
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'abandoned')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      let row = data as unknown as ValidationSprintRow | null;
      const guest = loadGuestValidationBrief();
      const hasGuestBrief = Object.values(guest).some((value) => value.trim());
      if (!row && hasGuestBrief) {
        const assumptions = buildUntestedAssumptions(guest);
        const interviewPlan = buildFiveInterviewPlan(guest);
        const { data: inserted, error: insertError } = await supabase
          .from('validation_sprints' as never)
          .insert({
            user_id: user.id,
            status: 'customer_defined',
            hypothesis: buildValidationHypothesis(guest),
            primary_segment: guest.primarySegment,
            current_step: 2,
            customer_brief: guest,
            assumptions,
            interview_plan: interviewPlan,
            outreach_script: buildOutreachScript(guest),
          } as never)
          .select('*')
          .single();
        if (insertError) throw insertError;
        row = inserted as unknown as ValidationSprintRow;
        clearGuestValidationBrief();
        captureEvent('validation_sprint_started', {
          source: 'guest_brief_restored',
          current_step: 2,
        });
      }
      if (row) {
        setSprint(row);
        setBrief({ ...EMPTY_CUSTOMER_BRIEF, ...(row.customer_brief ?? {}) });
        setCurrentStep(row.current_step || 1);
        await loadEvidence(row.id);
      }
    } catch (error) {
      console.error('Could not load Validation Sprint', error);
      toast.error('Could not load your Validation Sprint.');
    } finally {
      setLoading(false);
    }
  }, [loadEvidence, user?.id]);

  useEffect(() => {
    void loadSprint();
  }, [loadSprint]);

  const signalCount = evidence.length;
  const evidenceGrade = resolveEvidenceGrade(signalCount);
  const nextThreshold = nextEvidenceThreshold(signalCount);
  const progress = Math.min(100, Math.round((signalCount / 25) * 100));
  const briefIsValid = Object.values(brief).every((value) => value.trim().length >= 3);

  const persistSprint = async (step: number, patch: Record<string, unknown>) => {
    if (!user?.id) return null;
    setSaving(true);
    try {
      if (!sprint) {
        const { data, error } = await supabase
          .from('validation_sprints' as never)
          .insert({
            user_id: user.id,
            status: 'started',
            current_step: step,
            ...patch,
          } as never)
          .select('*')
          .single();
        if (error) throw error;
        const row = data as unknown as ValidationSprintRow;
        setSprint(row);
        return row;
      }

      const { data, error } = await supabase
        .from('validation_sprints' as never)
        .update({ current_step: step, last_resumed_at: new Date().toISOString(), ...patch } as never)
        .eq('id', sprint.id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (error) throw error;
      const row = data as unknown as ValidationSprintRow;
      setSprint(row);
      return row;
    } finally {
      setSaving(false);
    }
  };

  const completeCustomerStep = async () => {
    if (!briefIsValid) {
      toast.error('Complete all five fields so the decision brief is specific enough to test.');
      return;
    }
    saveGuestValidationBrief(brief);
    if (!isAuthenticated) {
      setGuestBriefReady(true);
      captureEvent('validation_sprint_started', { source: 'homepage_or_direct', current_step: 1 });
      captureEvent('validation_sprint_step_completed', { source: 'guest', step: 1, step_name: 'choose_customer' });
      return;
    }

    const isNewSprint = !sprint;
    const assumptions = buildUntestedAssumptions(brief);
    const interviewPlan = buildFiveInterviewPlan(brief);
    await persistSprint(2, {
      status: 'customer_defined',
      hypothesis: buildValidationHypothesis(brief),
      primary_segment: brief.primarySegment,
      customer_brief: brief,
      assumptions,
      interview_plan: interviewPlan,
      outreach_script: buildOutreachScript(brief),
    });
    clearGuestValidationBrief();
    setCurrentStep(2);
    if (isNewSprint) {
      captureEvent('validation_sprint_started', {
        source: 'validation_sprint',
        current_step: 1,
      });
    }
    captureEvent('validation_sprint_step_completed', {
      source: 'validation_sprint',
      step: 1,
      step_name: 'choose_customer',
    });
  };

  const completeSourcingStep = async () => {
    await persistSprint(3, {
      status: 'sourcing',
      outreach_script: sprint?.outreach_script || buildOutreachScript(brief),
    });
    setCurrentStep(3);
    captureEvent('validation_sprint_step_completed', {
      source: 'validation_sprint',
      step: 2,
      step_name: 'find_people',
    });
  };

  const addEvidence = async () => {
    if (!user?.id || !sprint) return;
    if (participantKey.trim().length < 2 || evidenceSummary.trim().length < 12) {
      toast.error('Add a participant label and a specific evidence summary.');
      return;
    }
    setSaving(true);
    try {
      const fingerprint = await fingerprintParticipant(participantKey);
      const { error } = await supabase
        .from('validation_sprint_evidence' as never)
        .insert({
          sprint_id: sprint.id,
          user_id: user.id,
          source_type: 'interview',
          source_id: crypto.randomUUID(),
          source_label: 'Founder-entered interview',
          participant_fingerprint: fingerprint,
          summary: evidenceSummary.trim(),
          signal: evidenceSignal,
          weight: 1,
          verification_mode: 'founder_reported',
          occurred_at: new Date().toISOString(),
        } as never);
      if (error) {
        if (error.code === '23505') {
          toast.error('This participant is already counted. Edit the existing signal instead of adding a duplicate.');
          return;
        }
        throw error;
      }
      await persistSprint(3, { status: 'gathering_evidence' });
      await loadEvidence(sprint.id);
      setParticipantKey('');
      setEvidenceSummary('');
      setEvidenceSignal('neutral');
      captureEvent('evidence_signal_added', {
        tool: 'validation_sprint',
        artifact_type: 'customer_evidence_signal',
        source: 'manual_interview',
        verification_mode: 'founder_reported',
        credits_used: 0,
      });
      toast.success('Evidence added without using credits.');
    } catch (error) {
      console.error('Could not add evidence', error);
      toast.error('Could not add this evidence signal.');
    } finally {
      setSaving(false);
    }
  };

  const importVerifiedEvidence = async () => {
    if (!sprint) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('sync_validation_sprint_evidence_v1' as never, {
        p_sprint_id: sprint.id,
      } as never);
      if (error) throw error;
      await loadEvidence(sprint.id);
      const imported = Number((data as { imported?: number } | null)?.imported ?? 0);
      if (imported > 0) {
        captureEvent('evidence_signal_added', {
          tool: 'validation_sprint',
          artifact_type: 'customer_evidence_signal',
          source: 'verified_import',
          verification_mode: 'platform_verified',
          credits_used: 0,
          signal_count: imported,
        });
      }
      toast.success(imported > 0 ? `Imported ${imported} verified signal${imported === 1 ? '' : 's'}.` : 'No new survey or demo signals were found.');
    } catch (error) {
      console.error('Could not import evidence', error);
      toast.error('Could not import verified evidence.');
    } finally {
      setSaving(false);
    }
  };

  const beginEvidenceEdit = (item: ValidationEvidenceRow) => {
    setEditingEvidenceId(item.id);
    setEditingEvidenceSummary(item.summary || '');
    setEditingEvidenceSignal(item.signal);
  };

  const saveEvidenceEdit = async () => {
    if (!user?.id || !sprint || !editingEvidenceId) return;
    if (editingEvidenceSummary.trim().length < 12) {
      toast.error('Keep a specific evidence summary of at least 12 characters.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('validation_sprint_evidence' as never)
        .update({
          summary: editingEvidenceSummary.trim(),
          signal: editingEvidenceSignal,
        } as never)
        .eq('id', editingEvidenceId)
        .eq('sprint_id', sprint.id)
        .eq('user_id', user.id);
      if (error) throw error;
      setEditingEvidenceId(null);
      setDecisionResult(null);
      await loadSprint();
      toast.success('Evidence updated for free. Re-evaluate before acting on the prior decision.');
    } catch (error) {
      console.error('Could not update evidence', error);
      toast.error('Could not update this evidence signal.');
    } finally {
      setSaving(false);
    }
  };

  const makeDecision = async () => {
    if (!sprint || signalCount < 5) {
      toast.error('Add five independent signals before producing a directional decision.');
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('evaluate_validation_sprint_v1' as never, {
        p_sprint_id: sprint.id,
        p_override_decision: overrideDecision || null,
        p_override_rationale: overrideRationale || null,
      } as never);
      if (error) throw error;
      const result = data as unknown as ValidationDecisionResult;
      setDecisionResult(result);
      await loadSprint();
      captureEvent('journey_outcome_evaluated', {
        tool: 'pmf_lab',
        artifact_type: 'pmf_decision_report',
        previous_status: sprint.pmf_outcome_id ? 'draft' : 'not_started',
        new_status: result.status,
        verification_mode: result.verificationMode,
        completion_score: Math.min(100, Math.round((result.signalCount / 25) * 100)),
        evidence_grade: result.evidenceGrade,
        source: 'validation_sprint',
        credits_used: 0,
      });
      captureEvent('journey_outcome_status_changed', {
        tool: 'pmf_lab',
        artifact_type: 'pmf_decision_report',
        previous_status: sprint.pmf_outcome_id ? 'draft' : 'not_started',
        new_status: result.status,
        verification_mode: result.verificationMode,
        completion_score: Math.min(100, Math.round((result.signalCount / 25) * 100)),
        evidence_grade: result.evidenceGrade,
        source: 'validation_sprint',
        credits_used: 0,
      });
      captureEvent('validation_sprint_step_completed', {
        source: 'validation_sprint',
        step: 4,
        step_name: 'make_decision',
      });
      if (result.status === 'verified' && result.decision === 'build') {
        captureEvent('validation_sprint_completed', {
          source: 'validation_sprint',
          evidence_grade: result.evidenceGrade,
          decision: result.decision,
        });
      }
      toast.success(`${decisionLabel(result.decision)} decision created.`);
    } catch (error) {
      console.error('Could not evaluate sprint', error);
      toast.error(error instanceof Error ? error.message : 'Could not evaluate this sprint.');
    } finally {
      setSaving(false);
    }
  };

  const exportBrief = () => {
    if (!sprint) return;
    downloadTextFile(
      `validation-sprint-${sprint.id.slice(0, 8)}.md`,
      buildEvidenceBuildBrief(sprint, evidence, decisionResult),
    );
  };

  const copyOutreach = async () => {
    await navigator.clipboard.writeText(sprint?.outreach_script || buildOutreachScript(brief));
    toast.success('Outreach script copied.');
  };

  const openDecisionStep = async () => {
    if (!sprint || signalCount < 5) return;
    await persistSprint(4, { status: 'gathering_evidence' });
    setCurrentStep(4);
    captureEvent('validation_sprint_step_completed', {
      source: 'validation_sprint',
      step: 3,
      step_name: 'add_evidence',
    });
  };

  const persistedWeightedScore = useMemo(() => {
    const total = evidence.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    if (total <= 0) return 0;
    const support = evidence
      .filter((item) => item.signal === 'supports')
      .reduce((sum, item) => sum + Number(item.weight || 0), 0);
    return (support / total) * 100;
  }, [evidence]);

  const result = decisionResult ?? (sprint?.decision ? {
    decision: sprint.decision,
    recommendation: sprint.recommendation ?? sprint.decision,
    evidenceGrade: sprint.evidence_grade,
    signalCount,
    weightedScore: persistedWeightedScore,
    status: sprint.evidence_grade === 'decision_grade' && !sprint.override_rationale ? 'verified' : 'ready',
    verificationMode: sprint.override_rationale ? 'founder_reported' : 'corroborated',
    wasOverridden: Boolean(sprint.override_rationale),
    nextExperiment: sprint.next_experiment || '',
    recommendedNextRoute: sprint.decision === 'build' && sprint.evidence_grade === 'decision_grade' ? '/mvp-builder' : '/validation-sprint',
    sprintId: sprint.id,
    outcomeId: sprint.pmf_outcome_id || '',
  } satisfies ValidationDecisionResult : null);

  const generatedHypothesis = buildValidationHypothesis(brief);
  const generatedAssumptions = sprint?.assumptions?.length ? sprint.assumptions : buildUntestedAssumptions(brief);
  const generatedPlan = sprint?.interview_plan?.length ? sprint.interview_plan : buildFiveInterviewPlan(brief);

  if (!OUTCOME_FEATURE_FLAGS.validationSprint()) return <Navigate to="/icp-builder" replace />;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Validation Sprint | Founders Compass"
        description="Turn real customer evidence into a clear Build, Narrow, Pivot, Stop, or keep-testing decision."
        url="/validation-sprint"
      />
      <Navigation />
      <main className="container mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            Founders Compass · Validation Sprint
          </Badge>
          <h1 className="mt-5 font-space-grotesk text-4xl font-semibold tracking-tight sm:text-5xl">
            Stop guessing what to build.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Turn real customer evidence into a clear Build, Narrow, Pivot, Stop, or keep-testing decision—then carry that evidence into your MVP.
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-4">
          {STEPS.map((step, index) => {
            const number = index + 1;
            const active = number === currentStep;
            const complete = number < currentStep;
            return (
              <button
                key={step.title}
                type="button"
                disabled={number > currentStep || (!isAuthenticated && number > 1)}
                onClick={() => number <= currentStep && setCurrentStep(number)}
                className={`rounded-xl border p-4 text-left transition ${
                  active ? 'border-primary bg-primary/10' : complete ? 'border-success/30 bg-success/5' : 'border-border/60 bg-card/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    complete ? 'bg-success text-success-foreground' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {complete ? <Check className="h-4 w-4" /> : number}
                  </span>
                  <span className="text-sm font-semibold">{step.title}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-8">
            {currentStep === 1 ? (
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>Choose one customer and one decision</CardTitle>
                  <CardDescription>Your first deterministic Customer Decision Brief is free. These are assumptions until customer evidence supports them.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="idea">Idea or problem</Label>
                      <Textarea id="idea" value={brief.idea} onChange={(event) => setBrief((value) => ({ ...value, idea: event.target.value }))} placeholder="What are you considering building, and what problem should it solve?" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="segment">Primary customer</Label>
                      <Input id="segment" value={brief.primarySegment} onChange={(event) => setBrief((value) => ({ ...value, primarySegment: event.target.value }))} placeholder="e.g. freelance designers with 3–10 clients" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alternative">Current alternative</Label>
                      <Input id="alternative" value={brief.currentAlternative} onChange={(event) => setBrief((value) => ({ ...value, currentAlternative: event.target.value }))} placeholder="Spreadsheets, an agency, doing nothing…" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trigger">Urgency trigger</Label>
                      <Input id="trigger" value={brief.urgencyTrigger} onChange={(event) => setBrief((value) => ({ ...value, urgencyTrigger: event.target.value }))} placeholder="What event makes them act now?" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="decision">Decision you need to make</Label>
                      <Input id="decision" value={brief.decisionNeeded} onChange={(event) => setBrief((value) => ({ ...value, decisionNeeded: event.target.value }))} placeholder="Should I build this in the next 30 days?" />
                    </div>
                  </div>

                  {(guestBriefReady || sprint) && briefIsValid ? (
                    <div className="rounded-xl border border-primary/25 bg-primary/[0.05] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Customer Decision Brief</p>
                      <p className="mt-3 text-sm leading-6">{generatedHypothesis}</p>
                      <div className="mt-4 grid gap-2">
                        {generatedAssumptions.map((assumption) => (
                          <div key={assumption} className="flex gap-2 text-sm text-muted-foreground">
                            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                            {assumption}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-end gap-3">
                    {!isAuthenticated && guestBriefReady ? (
                      <Button asChild size="lg">
                        <Link to="/signup?source=validation-sprint&return=/validation-sprint">
                          Save and continue <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button size="lg" onClick={() => void completeCustomerStep()} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Create my free brief <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {currentStep === 2 && sprint ? (
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Five conversations—not five leads</CardTitle>
                    <CardDescription>Potential candidates are not confirmed interviewees. Use this plan to reach real people without pitching the solution.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {generatedPlan.map((item, index) => (
                      <div key={item} className="flex gap-3 rounded-lg border border-border/60 p-3 text-sm leading-6">
                        <span className="font-semibold text-primary">{index + 1}</span>
                        <span>{item}</span>
                      </div>
                    ))}
                    <Button asChild variant="outline" className="mt-2">
                      <Link to="/pmf-lab">
                        Find potential conversations in PMF Lab <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Unbiased outreach script</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-muted/50 p-4 text-sm leading-6">
                      {sprint.outreach_script || buildOutreachScript(brief)}
                    </div>
                    <Button variant="outline" className="mt-4 w-full" onClick={() => void copyOutreach()}>
                      <Clipboard className="mr-2 h-4 w-4" /> Copy script
                    </Button>
                    <Button className="mt-3 w-full" onClick={() => void completeSourcingStep()} disabled={saving}>
                      I’m ready to gather evidence <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {currentStep === 3 && sprint ? (
              <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Add one independent signal</CardTitle>
                      <CardDescription>Manual evidence entry and editing use no credits. Participant labels are hashed for deduplication.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="participant">Participant label</Label>
                        <Input id="participant" value={participantKey} onChange={(event) => setParticipantKey(event.target.value)} placeholder="Initials or your own private identifier" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="evidence">What happened?</Label>
                        <Textarea id="evidence" value={evidenceSummary} onChange={(event) => setEvidenceSummary(event.target.value)} placeholder="Describe observed behavior, current workaround, cost, urgency, or a contradiction." />
                      </div>
                      <RadioGroup value={evidenceSignal} onValueChange={(value) => setEvidenceSignal(value as ValidationEvidenceRow['signal'])} className="grid grid-cols-3 gap-2">
                        {(['supports', 'neutral', 'contradicts'] as const).map((signal) => (
                          <Label key={signal} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-xs">
                            <RadioGroupItem value={signal} /> {signalLabel(signal)}
                          </Label>
                        ))}
                      </RadioGroup>
                      <Button className="w-full" onClick={() => void addEvidence()} disabled={saving}>
                        <Plus className="mr-2 h-4 w-4" /> Add evidence · Free
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Import verified behavior</CardTitle>
                      <CardDescription>Bring in hosted survey responses, Demo Studio completions, CTA clicks, and signups automatically.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button variant="outline" className="w-full" onClick={() => void importVerifiedEvidence()} disabled={saving}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${saving ? 'animate-spin' : ''}`} /> Import from PMF Lab & Demo Studio
                      </Button>
                      <CreditCostNotice feature="PMF_SCORING" featureName="AI transcript extraction or a new generative PMF report" />
                      <Button asChild variant="ghost" className="w-full">
                        <Link to="/pmf-lab">Open AI evidence tools <ExternalLink className="ml-2 h-4 w-4" /></Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>Evidence ledger</CardTitle>
                        <CardDescription>{signalCount} independent weighted signal{signalCount === 1 ? '' : 's'} · {evidenceGrade.replaceAll('_', ' ')}</CardDescription>
                      </div>
                      <Badge variant={evidenceGrade === 'decision_grade' ? 'default' : 'secondary'}>
                        {signalCount >= 25 ? '25+' : signalCount < 5 ? `${signalCount}/5` : signalCount < 10 ? `${signalCount}/10` : `${signalCount}/25`}
                      </Badge>
                    </div>
                    <Progress value={progress} className="mt-3" />
                    <p className="text-xs text-muted-foreground">
                      {nextThreshold ? `${nextThreshold - signalCount} more signal${nextThreshold - signalCount === 1 ? '' : 's'} to the next evidence threshold.` : 'Decision-grade threshold reached.'}
                    </p>
                  </CardHeader>
                  <CardContent>
                    {evidence.length === 0 ? (
                      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                        Add a real interview, import a hosted survey response, or publish a Demo Studio experiment.
                      </div>
                    ) : (
                      <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                        {evidence.map((item) => (
                          <div key={item.id} className="rounded-xl border border-border/60 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={item.signal === 'supports' ? 'default' : item.signal === 'contradicts' ? 'destructive' : 'secondary'}>
                                {signalLabel(item.signal)}
                              </Badge>
                              <Badge variant="outline">{item.source_type.replaceAll('_', ' ')}</Badge>
                              {item.verification_mode === 'platform_verified' ? (
                                <span className="ml-auto inline-flex items-center gap-1 text-xs text-success">
                                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                                </span>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="ml-auto h-7 px-2 text-xs"
                                  onClick={() => beginEvidenceEdit(item)}
                                >
                                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                                </Button>
                              )}
                            </div>
                            {editingEvidenceId === item.id ? (
                              <div className="mt-3 space-y-3">
                                <Textarea
                                  value={editingEvidenceSummary}
                                  onChange={(event) => setEditingEvidenceSummary(event.target.value)}
                                />
                                <RadioGroup
                                  value={editingEvidenceSignal}
                                  onValueChange={(value) => setEditingEvidenceSignal(value as ValidationEvidenceRow['signal'])}
                                  className="grid grid-cols-3 gap-2"
                                >
                                  {(['supports', 'neutral', 'contradicts'] as const).map((signal) => (
                                    <Label key={signal} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs">
                                      <RadioGroupItem value={signal} /> {signalLabel(signal)}
                                    </Label>
                                  ))}
                                </RadioGroup>
                                <div className="flex justify-end gap-2">
                                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingEvidenceId(null)}>
                                    Cancel
                                  </Button>
                                  <Button type="button" size="sm" onClick={() => void saveEvidenceEdit()} disabled={saving}>
                                    Save free edit
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-3 text-sm leading-6">{item.summary || item.source_label}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <Button className="mt-5 w-full" disabled={signalCount < 5 || saving} onClick={() => void openDecisionStep()}>
                      {signalCount < 5 ? `Add ${5 - signalCount} more to make a directional decision` : 'Make the decision'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {currentStep === 4 && sprint ? (
              <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Decision settings</CardTitle>
                    <CardDescription>The recommendation is deterministic and free. A new AI synthesis in PMF Lab is credit-metered.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="rounded-xl border border-border/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Evidence grade</span>
                        <Badge>{evidenceGrade.replaceAll('_', ' ')}</Badge>
                      </div>
                      <Progress value={progress} className="mt-3" />
                      <p className="mt-2 text-xs text-muted-foreground">
                        Five signals are directional. Only 25 independent weighted signals can become decision-grade.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Manual override (optional)</Label>
                      <RadioGroup value={overrideDecision} onValueChange={(value) => setOverrideDecision(value as ValidationDecision)} className="grid grid-cols-2 gap-2">
                        {(['build', 'narrow', 'pivot', 'stop', 'collect_more_evidence'] as const).map((decision) => (
                          <Label key={decision} className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-xs">
                            <RadioGroupItem value={decision} /> {decisionLabel(decision)}
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>
                    {overrideDecision ? (
                      <div className="space-y-2">
                        <Label htmlFor="rationale">Override rationale</Label>
                        <Textarea id="rationale" value={overrideRationale} onChange={(event) => setOverrideRationale(event.target.value)} placeholder="Explain why you are choosing a different action. An override remains founder-reported." />
                      </div>
                    ) : null}
                    <Button className="w-full" onClick={() => void makeDecision()} disabled={saving || signalCount < 5}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Evaluate evidence · Free deterministic score
                    </Button>
                    <CreditCostNotice feature="PMF_SCORING" featureName="New AI PMF synthesis" />
                  </CardContent>
                </Card>
                <Card className={result ? 'border-primary/30' : ''}>
                  <CardHeader>
                    <CardTitle>{result ? `${decisionLabel(result.decision)} decision` : 'Your decision report'}</CardTitle>
                    <CardDescription>
                      {result ? `${result.signalCount} signals · ${result.evidenceGrade.replaceAll('_', ' ')} · ${result.verificationMode.replaceAll('_', ' ')}` : 'Evaluate the evidence to generate the report.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {result ? (
                      <div className="space-y-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-xl bg-muted/50 p-4">
                            <p className="text-xs text-muted-foreground">Decision</p>
                            <p className="mt-1 font-semibold">{decisionLabel(result.decision)}</p>
                          </div>
                          <div className="rounded-xl bg-muted/50 p-4">
                            <p className="text-xs text-muted-foreground">Confidence</p>
                            <p className="mt-1 font-semibold">{result.evidenceGrade.replaceAll('_', ' ')}</p>
                          </div>
                          <div className="rounded-xl bg-muted/50 p-4">
                            <p className="text-xs text-muted-foreground">Weighted support</p>
                            <p className="mt-1 font-semibold">{Math.round(result.weightedScore)}%</p>
                          </div>
                        </div>
                        {result.wasOverridden ? (
                          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
                            This is a founder-reported override, not an evidence-verified Build decision.
                          </div>
                        ) : null}
                        <div>
                          <p className="text-sm font-semibold">Single next experiment</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.nextExperiment}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button variant="outline" onClick={exportBrief}>
                            <Download className="mr-2 h-4 w-4" /> Export evidence build brief
                          </Button>
                          <Button variant="outline" onClick={() => window.print()}>
                            <FileText className="mr-2 h-4 w-4" /> Print / PDF
                          </Button>
                          {result.status === 'verified' && result.decision === 'build' ? (
                            <Button onClick={() => {
                              captureEvent('journey_handoff_consumed', {
                                tool: 'mvp_builder',
                                artifact_type: 'evidence_backed_mvp',
                                previous_status: 'not_started',
                                new_status: 'not_started',
                                verification_mode: result.verificationMode,
                                completion_score: 0,
                                evidence_grade: result.evidenceGrade,
                                source: 'validation_sprint',
                                credits_used: 0,
                              });
                              navigate('/mvp-builder?source=validation-sprint');
                            }}>
                              Open evidence-prefilled MVP Builder <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                        {result.decision !== 'build' || result.status !== 'verified' ? (
                          <Button variant="secondary" onClick={() => setCurrentStep(3)}>
                            Continue gathering evidence <Users className="ml-2 h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
                        <CheckCircle2 className="h-9 w-9 text-muted-foreground" />
                        <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
                          The report will show supporting evidence, contradictions, confidence, and one next experiment. It never promises demand, PMF, customers, or funding.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
