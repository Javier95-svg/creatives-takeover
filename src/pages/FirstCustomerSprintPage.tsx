import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, CheckCircle2, ClipboardCopy, Loader2, Pause, Printer, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import CustomerEvidenceWorkspace from '@/components/founder-cycle/CustomerEvidenceWorkspace';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useFirstCustomerSprint } from '@/hooks/useFirstCustomerSprint';
import { useFounderCycle } from '@/hooks/useFounderCycle';
import { resolveIcpSource } from '@/lib/icpHandoffSource';
import { icpArtifactToFirstCustomerSprint } from '@/lib/icpToFirstCustomerSprint';
import { useMentorRecommendations } from '@/hooks/useMentorRecommendations';
import { useSubscription } from '@/hooks/useSubscription';
import { trackFirstCustomerSprint } from '@/lib/analytics';
import {
  FIRST_CUSTOMER_TARGETS,
  buildFirstCustomerMentorBrief,
  canCompleteFirstCustomerSprint,
  mentorBriefText,
  validateFirstCustomerIntake,
} from '@/lib/firstCustomerSprint';
import type {
  FirstCustomerDecision,
  FirstCustomerMessageVariant,
  FirstCustomerPrimaryFriction,
  FirstCustomerPrimaryValue,
} from '@/types/firstCustomerSprint';

const DECISIONS: Array<{ value: FirstCustomerDecision; label: string }> = [
  { value: 'continue', label: 'Continue this approach' },
  { value: 'narrow_segment', label: 'Narrow the customer segment' },
  { value: 'change_offer', label: 'Change the offer' },
  { value: 'change_message', label: 'Change the message' },
  { value: 'change_channel', label: 'Change the channel' },
  { value: 'pivot', label: 'Pivot based on the evidence' },
  { value: 'pause', label: 'Pause this direction' },
];

function SectionHeading({ number, title, description, state }: { number: number; title: string; description: string; state?: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step {number}</p>
        <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {state ? <Badge variant="outline">{state.replaceAll('_', ' ')}</Badge> : null}
    </div>
  );
}

export default function FirstCustomerSprintPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const icpParam = searchParams.get('icp');
  const { user, loading: authLoading } = useAuth();
  const cycle = useFounderCycle();
  const sprintApi = useFirstCustomerSprint();
  const subscription = useSubscription();
  const snapshot = sprintApi.snapshot;
  const sprint = snapshot?.sprint ?? null;
  const evidence = snapshot?.evidence ?? { attachedProspects: 0, contactedProspects: 0, replies: 0, conversations: 0, commitments: 0, payments: 0 };
  const [intake, setIntake] = useState({
    offer: '', targetSegment: '', problemHypothesis: '', proofUrl: '', proofDescription: '',
    estimatedCustomerValueUsd: '', weeklyCapacityHours: '', mentorDecisionQuestion: '',
  });
  const [icpSeeded, setIcpSeeded] = useState(false);
  /** Set once the ICP fills at least one intake field, which is what makes the provenance line appear. */
  const [icpSeedSummary, setIcpSeedSummary] = useState<
    { count: number; personaName: string; origin: 'param' | 'latest' | 'session'; draftId: string | null } | null
  >(null);
  const [variants, setVariants] = useState<FirstCustomerMessageVariant[]>([]);
  const [existingContactId, setExistingContactId] = useState('');
  const [decision, setDecision] = useState<FirstCustomerDecision>('continue');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [valueScore, setValueScore] = useState('8');
  const [primaryValue, setPrimaryValue] = useState<FirstCustomerPrimaryValue>('structure');
  const [primaryFriction, setPrimaryFriction] = useState<FirstCustomerPrimaryFriction>('none');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [reviewNote, setReviewNote] = useState('');
  const viewedRef = useRef<string | null>(null);
  const intakeSprintRef = useRef<string | null>(null);
  const milestonesRef = useRef({ prospects: false, outreach: false, conversation: false });

  const mentorContext = useMemo(() => ({
    track: 'gtm' as const,
    summaryInsight: sprint?.problem_hypothesis ?? null,
    targetAudience: sprint?.target_segment ?? null,
    extraKeywords: ['first customer', 'outbound', 'sales', sprint?.offer ?? ''].filter(Boolean),
  }), [sprint?.offer, sprint?.problem_hypothesis, sprint?.target_segment]);
  const mentors = useMentorRecommendations(mentorContext, { limit: 2, source: 'first_customer_sprint' });

  useEffect(() => {
    if (!authLoading && !user) navigate(`/signup?source=first-customer-sprint&return=${encodeURIComponent('/first-customer-sprint')}`);
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (sprint || !cycle.snapshot) return;
    setIntake((current) => ({
      ...current,
      weeklyCapacityHours: current.weeklyCapacityHours || String(snapshot?.cycleDefaults?.weeklyCapacityHours ?? 4),
      mentorDecisionQuestion: current.mentorDecisionQuestion || snapshot?.cycleDefaults?.primaryGoal || cycle.snapshot?.primaryGoal || '',
    }));
  }, [cycle.snapshot, snapshot?.cycleDefaults?.primaryGoal, snapshot?.cycleDefaults?.weeklyCapacityHours, sprint]);

  /*
   * Seed the intake from the founder's ICP draft.
   *
   * The sprint asks for a segment, an offer and a problem hypothesis, which is
   * exactly what the ICP already produced and what a founder would otherwise
   * retype from memory into an empty form, usually less precisely than the draft
   * states it. `icpArtifactToFirstCustomerSprint` refuses to pass along anything
   * the generator backfilled, so an empty box here means the draft genuinely does
   * not know, not that the handoff dropped it.
   *
   * Guarded the same way as the Demo Studio handoff: runs once, never while a
   * sprint exists (the hydrate effect below owns the fields then), and never
   * overwrites a field the founder has already typed into.
   */
  useEffect(() => {
    if (icpSeeded || sprint || authLoading || !user?.id) return;
    let active = true;
    void (async () => {
      const icp = await resolveIcpSource({ userId: user.id, draftId: icpParam });
      if (!active || !icp) return;
      const mapped = icpArtifactToFirstCustomerSprint(icp.artifact);
      if (mapped.seededFieldCount === 0) return;
      setIcpSeeded(true);
      setIcpSeedSummary({
        count: mapped.seededFieldCount,
        personaName: mapped.personaName,
        origin: icp.origin,
        draftId: icp.draftId,
      });
      setIntake((current) => ({
        ...current,
        offer: current.offer.trim() || mapped.intake.offer,
        targetSegment: current.targetSegment.trim() || mapped.intake.targetSegment,
        problemHypothesis: current.problemHypothesis.trim() || mapped.intake.problemHypothesis,
        mentorDecisionQuestion: current.mentorDecisionQuestion.trim() || mapped.intake.mentorDecisionQuestion,
        estimatedCustomerValueUsd:
          current.estimatedCustomerValueUsd.trim() || mapped.intake.estimatedCustomerValueUsd,
      }));
      trackFirstCustomerSprint('first_customer_sprint_icp_seeded', {
        seeded_field_count: mapped.seededFieldCount,
        icp_origin: icp.origin,
        icp_draft_id: icp.draftId,
      });
    })();
    return () => {
      active = false;
    };
    // The intake is read through the setState updater rather than as a dependency,
    // so this runs once per entry instead of re-firing on every keystroke.
  }, [icpSeeded, sprint, authLoading, user?.id, icpParam]);

  useEffect(() => {
    if (!sprint) return;
    if (evidence.attachedProspects >= 10 && !milestonesRef.current.prospects) {
      milestonesRef.current.prospects = true;
      trackFirstCustomerSprint('first_customer_sprint_prospect_target_reached', { sprint_id: sprint.id, attached_count: evidence.attachedProspects, status: sprint.status });
    }
    if (intakeSprintRef.current !== sprint.id) {
      intakeSprintRef.current = sprint.id;
      setIntake({
        offer: sprint.offer ?? '', targetSegment: sprint.target_segment ?? '',
        problemHypothesis: sprint.problem_hypothesis ?? '', proofUrl: sprint.proof_url ?? '',
        proofDescription: sprint.proof_description ?? '',
        estimatedCustomerValueUsd: String(sprint.estimated_customer_value_usd ?? ''),
        weeklyCapacityHours: String(sprint.weekly_capacity_hours ?? ''),
        mentorDecisionQuestion: sprint.mentor_decision_question ?? '',
      });
    }
    setVariants(sprint.message_variants);
    setDecision(sprint.final_decision ?? 'continue');
    setDecisionNotes(sprint.final_notes ?? '');
    if (viewedRef.current !== sprint.id) {
      viewedRef.current = sprint.id;
      trackFirstCustomerSprint('first_customer_sprint_viewed', {
        sprint_id: sprint.id, status: sprint.status, business_model: sprint.business_model_snapshot,
        attached_count: evidence.attachedProspects, outreach_count: evidence.contactedProspects,
        conversation_count: evidence.conversations,
      });
    }
  }, [evidence.attachedProspects, evidence.contactedProspects, evidence.conversations, sprint]);

  useEffect(() => {
    if (!sprint) return;
    if (evidence.contactedProspects >= 10 && !milestonesRef.current.outreach) {
      milestonesRef.current.outreach = true;
      trackFirstCustomerSprint('first_customer_sprint_outreach_target_reached', { sprint_id: sprint.id, outreach_count: evidence.contactedProspects, status: sprint.status });
    }
    if (evidence.conversations >= 1 && !milestonesRef.current.conversation) {
      milestonesRef.current.conversation = true;
      trackFirstCustomerSprint('first_customer_sprint_first_conversation', { sprint_id: sprint.id, conversation_count: evidence.conversations, status: sprint.status });
    }
  }, [evidence.attachedProspects, evidence.contactedProspects, evidence.conversations, sprint]);

  const safely = async (work: () => Promise<unknown>, success?: string) => {
    try { await work(); if (success) toast.success(success); }
    catch (error) { console.error(error); toast.error(error instanceof Error ? error.message : 'That change could not be saved.'); }
  };

  const startSprint = () => void safely(async () => {
    const normalized = {
      ...intake,
      estimatedCustomerValueUsd: Number(intake.estimatedCustomerValueUsd),
      weeklyCapacityHours: Number(intake.weeklyCapacityHours),
    };
    const errors = validateFirstCustomerIntake(normalized);
    if (errors.length) { toast.error(errors[0]); return; }
    // Attribution only. The intake text is already normalized above and is not
    // re-read from the draft, so a founder's edits are what actually get saved.
    const created = await sprintApi.start({
      ...normalized,
      icpAnalysisId: icpSeedSummary?.draftId ?? null,
    }) as { id?: string } | undefined;
    if (created?.id) {
      trackFirstCustomerSprint('first_customer_sprint_started', {
        sprint_id: created.id, status: 'active', business_model: cycle.snapshot?.businessModel,
        seeded_field_count: icpSeedSummary?.count, icp_draft_id: icpSeedSummary?.draftId ?? null,
      });
      try { await sprintApi.generateMessages(created.id); }
      catch (generationError) { console.warn('Using deterministic message templates', generationError); }
    }
  }, 'Your 30-day sprint has started.');

  const saveMessages = () => {
    if (!sprint) return;
    void safely(() => sprintApi.update(sprint.id, { messageVariants: variants }), 'Message variants saved.');
  };

  const saveIntake = () => {
    if (!sprint) return;
    const normalized = { ...intake, estimatedCustomerValueUsd: Number(intake.estimatedCustomerValueUsd), weeklyCapacityHours: Number(intake.weeklyCapacityHours) };
    const errors = validateFirstCustomerIntake(normalized);
    if (errors.length) { toast.error(errors[0]); return; }
    void safely(() => sprintApi.update(sprint.id, {
      offer: normalized.offer, targetSegment: normalized.targetSegment,
      problemHypothesis: normalized.problemHypothesis, proofUrl: normalized.proofUrl,
      proofDescription: normalized.proofDescription,
      estimatedCustomerValueUsd: normalized.estimatedCustomerValueUsd,
      weeklyCapacityHours: normalized.weeklyCapacityHours,
      mentorDecisionQuestion: normalized.mentorDecisionQuestion,
    }), 'Sprint focus updated. Regenerate messages if the positioning changed.');
  };

  const selectMessage = (key: FirstCustomerMessageVariant['key']) => {
    if (!sprint) return;
    void safely(async () => {
      await sprintApi.update(sprint.id, { selectedMessageVariant: key, messageVariants: variants });
      trackFirstCustomerSprint('first_customer_sprint_message_selected', { sprint_id: sprint.id, status: sprint.status, message_variant_key: key });
    }, 'Primary message selected.');
  };

  const createBrief = () => {
    if (!sprint) return;
    const brief = buildFirstCustomerMentorBrief(sprint, snapshot?.contacts ?? [], evidence);
    void safely(async () => {
      await sprintApi.update(sprint.id, { mentorBriefSnapshot: brief });
      await navigator.clipboard.writeText(mentorBriefText(brief));
      trackFirstCustomerSprint('first_customer_sprint_mentor_brief_created', { sprint_id: sprint.id, status: sprint.status, attached_count: evidence.attachedProspects });
    }, 'Mentor brief created and copied.');
  };

  const requestCheckpoint = (mentorId: string) => {
    if (!sprint) return;
    const redactedBrief = buildFirstCustomerMentorBrief(sprint, snapshot?.contacts ?? [], evidence);
    void safely(async () => {
      await sprintApi.requestCheckpoint(sprint.id, mentorId, redactedBrief as unknown as Record<string, unknown>);
      trackFirstCustomerSprint('first_customer_sprint_checkpoint_requested', {
        sprint_id: sprint.id,
        mentor_id: mentorId,
        status: 'requested',
        credits_deducted: 0,
      });
    }, 'Checkpoint requested. An admin will coordinate the schedule.');
  };

  const recordCheckpoint = () => {
    if (!sprint) return;
    if (decisionNotes.trim().length < 3) { toast.error('Record what the mentor changed first.'); return; }
    void safely(async () => {
      await sprintApi.update(sprint.id, {
        mentorRecommendationSummary: decisionNotes,
        finalDecision: decision, finalNotes: decisionNotes,
      });
      trackFirstCustomerSprint('first_customer_sprint_checkpoint_recommendation_recorded', {
        sprint_id: sprint.id, status: sprint.status, decision_category: decision,
      });
    }, 'Mentor recommendation recorded. Admin verification is still required.');
  };

  const completeSprint = () => {
    if (!sprint) return;
    void safely(async () => {
      await sprintApi.complete(sprint.id, decision, decisionNotes);
      trackFirstCustomerSprint('first_customer_sprint_completed', {
        sprint_id: sprint.id, status: 'completed', decision_category: decision,
        attached_count: evidence.attachedProspects, outreach_count: evidence.contactedProspects,
        conversation_count: evidence.conversations, business_model: sprint.business_model_snapshot,
      });
    }, 'Sprint completed. Your evidence and decision are preserved.');
  };

  const submitReview = () => {
    if (!sprint) return;
    void safely(async () => {
      await sprintApi.submitReview(sprint.id, {
        valueScore: Number(valueScore), primaryValue, primaryFriction, wouldRecommend, reviewNote,
      });
      trackFirstCustomerSprint('first_customer_sprint_review_submitted', {
        sprint_id: sprint.id, status: sprint.status, value_score: Number(valueScore),
        primary_value: primaryValue, primary_friction: primaryFriction, would_recommend: wouldRecommend,
      });
    }, 'Review saved.');
  };

  const purchaseContinuation = async () => {
    if (!sprint) return;
    trackFirstCustomerSprint('first_customer_sprint_continuation_checkout_started', {
      sprint_id: sprint.id, status: sprint.status, pack_id: 'pack_20', price_cents: 800,
    });
    await subscription.createCreditPackCheckout('pack_20', 'first_customer_sprint', {
      id: sprint.id, returnPath: '/first-customer-sprint',
    });
  };

  if (authLoading || sprintApi.isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!user) return null;

  if (sprintApi.error) return (
    <><Navigation /><main className="container mx-auto min-h-screen max-w-3xl px-4 py-24"><Card><CardHeader><CardTitle>Sprint setup required</CardTitle><CardDescription>Apply the First Customer Sprint migration, then reload this page.</CardDescription></CardHeader></Card></main><Footer /></>
  );

  if (!sprintApi.enabled || !sprintApi.enrolled) return (
    <><Helmet><title>First Customer Sprint | Creatives Takeover</title></Helmet><Navigation /><main className="container mx-auto min-h-screen max-w-3xl px-4 py-24"><Card><CardHeader><Badge className="mb-3 w-fit" variant="outline">Invite-only pilot</Badge><CardTitle>{sprintApi.enabled ? 'This sprint is currently invite-only' : 'The First Customer Sprint is not open yet'}</CardTitle><CardDescription>{sprintApi.enabled ? 'We are selecting a mixed cohort of mentor referrals and public applicants under the same B2B SaaS criteria.' : 'The pilot is behind a release switch while we finish deployment checks.'}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{sprintApi.enabled ? <Button asChild><Link to="/first-customer-sprint/apply?source=current_user">Apply for the pilot</Link></Button> : null}<Button asChild variant="outline"><Link to="/dashboard">Return to dashboard</Link></Button></CardContent></Card></main><Footer /></>
  );

  if (!sprint) return (
    <><Helmet><title>Start your First Customer Sprint</title><meta name="robots" content="noindex,nofollow" /></Helmet><Navigation /><main className="container mx-auto max-w-4xl px-4 py-16 pt-28"><div className="mb-8"><Badge>Invite accepted</Badge><h1 className="mt-3 text-4xl font-bold">Reach three qualified buyer conversations in 30 days</h1><p className="mt-3 text-muted-foreground">You perform the outreach. The product keeps the evidence, messaging, and one mentor checkpoint focused; it does not guarantee a sale.</p></div><Card><CardHeader><CardTitle>Define the sprint</CardTitle><CardDescription>All fields stay editable. A beta-cohort invitation can override the normal B2B SaaS/service eligibility rule.</CardDescription></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-3"><p><strong>Business model:</strong> {snapshot?.cycleDefaults?.businessModel?.replaceAll('_', ' ') ?? cycle.snapshot?.businessModel?.replaceAll('_', ' ') ?? 'Not set'}</p><p><strong>Current customers:</strong> {snapshot?.cycleDefaults?.customerCount ?? cycle.snapshot?.customerCount ?? 0}</p><p><strong>Primary goal:</strong> {snapshot?.cycleDefaults?.primaryGoal ?? cycle.snapshot?.primaryGoal ?? 'Win the first customer'}</p></div>
      {cycle.snapshot && (!['b2b_saas', 'service'].includes(cycle.snapshot.businessModel ?? '') || cycle.snapshot.customerCount > 3) ? <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm"><strong>Beta override:</strong> your recorded model/customer count is outside the normal pilot criteria, but your admin invitation allows you to proceed.</div> : null}
      {/* Named rather than silent: a prefilled field a founder cannot account for is one they will not check. */}
      {icpSeedSummary ? <div className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm"><strong>Prefilled from your ICP draft{icpSeedSummary.personaName ? ` (${icpSeedSummary.personaName})` : ''}.</strong> {icpSeedSummary.count} field{icpSeedSummary.count === 1 ? '' : 's'} carried over{icpSeedSummary.origin === 'latest' ? ', taken from your most recent draft' : ''}. Anything your draft was still guessing about was left blank on purpose. Edit all of it before you start.</div> : null}
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>Offer *</span><Input value={intake.offer} onChange={(e) => setIntake((v) => ({ ...v, offer: e.target.value }))} placeholder="A concrete result for a defined buyer" /></label><label className="space-y-1 text-sm"><span>Target buyer *</span><Input value={intake.targetSegment} onChange={(e) => setIntake((v) => ({ ...v, targetSegment: e.target.value }))} placeholder="e.g. operations leads at 20–100 person SaaS" /></label></div>
      <label className="block space-y-1 text-sm"><span>Problem hypothesis *</span><Textarea value={intake.problemHypothesis} onChange={(e) => setIntake((v) => ({ ...v, problemHypothesis: e.target.value }))} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>Proof URL</span><Input type="url" value={intake.proofUrl} onChange={(e) => setIntake((v) => ({ ...v, proofUrl: e.target.value }))} /></label><label className="space-y-1 text-sm"><span>Or proof description *</span><Input value={intake.proofDescription} onChange={(e) => setIntake((v) => ({ ...v, proofDescription: e.target.value }))} placeholder="prototype, case study, prior result…" /></label></div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>Estimated customer value (USD) *</span><Input type="number" min="1" value={intake.estimatedCustomerValueUsd} onChange={(e) => setIntake((v) => ({ ...v, estimatedCustomerValueUsd: e.target.value }))} /></label><label className="space-y-1 text-sm"><span>Weekly capacity (hours, minimum 2) *</span><Input type="number" min="2" value={intake.weeklyCapacityHours} onChange={(e) => setIntake((v) => ({ ...v, weeklyCapacityHours: e.target.value }))} /></label></div>
      <label className="block space-y-1 text-sm"><span>Question for your mentor</span><Textarea value={intake.mentorDecisionQuestion} onChange={(e) => setIntake((v) => ({ ...v, mentorDecisionQuestion: e.target.value }))} placeholder="What decision should this checkpoint help you make?" /></label>
      <Button size="lg" disabled={sprintApi.isSaving} onClick={startSprint}>{sprintApi.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}Start the 30-day sprint</Button>
    </CardContent></Card></main><Footer /></>
  );

  if (sprint.status === 'completed') return (
    <><Helmet><title>Completed First Customer Sprint | Creatives Takeover</title><meta name="robots" content="noindex,nofollow" /></Helmet><Navigation /><main className="container mx-auto min-h-screen max-w-4xl space-y-6 px-4 py-24"><Card className="border-success/30 bg-success/5"><CardHeader><Badge className="w-fit" variant="outline">Completed {sprint.completed_at ? new Date(sprint.completed_at).toLocaleDateString() : ''}</Badge><CardTitle className="text-3xl">Your sprint evidence is preserved</CardTitle><CardDescription>You finished with a {sprint.final_decision?.replaceAll('_', ' ')} decision.</CardDescription></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border bg-background p-4"><p className="text-2xl font-bold">{evidence.contactedProspects}</p><p className="text-xs text-muted-foreground">Messages sent</p></div><div className="rounded-lg border bg-background p-4"><p className="text-2xl font-bold">{evidence.conversations}</p><p className="text-xs text-muted-foreground">Conversations</p></div><div className="rounded-lg border bg-background p-4"><p className="text-2xl font-bold">{evidence.commitments + evidence.payments}</p><p className="text-xs text-muted-foreground">Commitments/payments</p></div></div>{sprint.final_notes ? <div className="mt-4 rounded-lg border bg-background p-4 text-sm"><strong>Final notes:</strong> {sprint.final_notes}</div> : null}</CardContent></Card>
      {!sprint.review_submitted_at ? <Card><CardHeader><CardTitle>Review the execution system</CardTitle><CardDescription>This structured review determines what should change before another sprint. Notes stay private and never enter analytics.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 sm:grid-cols-3"><label className="space-y-1 text-sm"><span>Value score (1–10)</span><Input type="number" min="1" max="10" value={valueScore} onChange={(event) => setValueScore(event.target.value)} /></label><label className="space-y-1 text-sm"><span>Most valuable</span><select className="h-10 w-full rounded-md border bg-background px-3" value={primaryValue} onChange={(event) => setPrimaryValue(event.target.value as FirstCustomerPrimaryValue)}><option value="structure">Execution structure</option><option value="messaging">Messaging</option><option value="evidence">Evidence tracking</option><option value="mentor">Mentor judgment</option><option value="accountability">Accountability</option></select></label><label className="space-y-1 text-sm"><span>Biggest friction</span><select className="h-10 w-full rounded-md border bg-background px-3" value={primaryFriction} onChange={(event) => setPrimaryFriction(event.target.value as FirstCustomerPrimaryFriction)}><option value="none">No major friction</option><option value="prospect_list">Finding prospects</option><option value="messaging">Preparing messages</option><option value="sending">Actually sending</option><option value="replies">Getting replies</option><option value="conversion">Converting conversations</option><option value="time">Finding time</option><option value="not_urgent">Low urgency</option></select></label></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={wouldRecommend} onChange={(event) => setWouldRecommend(event.target.checked)} />I would recommend this sprint to another B2B SaaS founder.</label><Textarea maxLength={1000} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="What should we keep or change? Optional." /><Button disabled={sprintApi.isSaving || Number(valueScore) < 1 || Number(valueScore) > 10} onClick={submitReview}>Submit review</Button></CardContent></Card> : sprint.continuation_from_sprint_id ? <Card><CardHeader><CardTitle>Demand-validation pilot complete</CardTitle><CardDescription>You completed both 30-day cycles. Your review and customer evidence are preserved for the cohort decision.</CardDescription></CardHeader></Card> : snapshot?.continuation?.paid ? <Card className="border-primary/30 bg-primary/5"><CardHeader><CardTitle>Your second sprint is unlocked</CardTitle><CardDescription>The attributed continuation purchase was confirmed. Start another 30-day cycle using the evidence and decision you just created.</CardDescription></CardHeader><CardContent><Button size="lg" disabled={sprintApi.isSaving} onClick={startSprint}>Start the second sprint <ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent></Card> : <Card><CardHeader><CardTitle>Continue for a second 30-day sprint</CardTitle><CardDescription>Make a dedicated $8 purchase for 20 credits. This real commitment unlocks another sprint and is tracked separately from ordinary credit purchases.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button size="lg" disabled={subscription.actionLoading} onClick={() => void purchaseContinuation()}>{subscription.actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Unlock sprint two for $8</Button><Button variant="outline" onClick={() => void sprintApi.refresh()}>Refresh purchase status</Button></CardContent></Card>}
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/dashboard/referral">Invite another founder</Link></Button><Button asChild variant="ghost"><Link to="/bizmap-ai">Return to Founder Execution Cycle</Link></Button></div>
    </main><Footer /></>
  );

  const brief = sprint.mentor_brief_snapshot ?? buildFirstCustomerMentorBrief(sprint, snapshot?.contacts ?? [], evidence);
  const mentorUnlocked = Boolean(sprint.selected_message_variant)
    && (evidence.attachedProspects >= 10 || sprintApi.ctMentorUnlocked);
  const completionEligible = Boolean(sprint.mentor_checkpoint_completed_at)
    && (Boolean(snapshot?.canComplete) || canCompleteFirstCustomerSprint(evidence, decision, decisionNotes));

  return (
    <><Helmet><title>First Customer Sprint | Creatives Takeover</title><meta name="robots" content="noindex,nofollow" /></Helmet><Navigation /><main className="container mx-auto max-w-6xl space-y-8 px-4 py-16 pt-28">
      <header className="rounded-2xl border border-primary/30 bg-primary/5 p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Badge>{sprint.status}</Badge>{snapshot?.awaitingFinalReview ? <Badge variant="destructive">Awaiting final review</Badge> : null}<Badge variant="outline">Ends {new Date(sprint.ends_at).toLocaleDateString()}</Badge></div><h1 className="mt-3 text-3xl font-bold">First Customer Sprint</h1><p className="mt-2 max-w-3xl text-muted-foreground">The next action is based on your weakest target. Nothing is auto-sent and every customer signal remains founder-controlled.</p></div><div className="min-w-56 rounded-xl border bg-background/70 p-4"><p className="text-xs text-muted-foreground">Recommended next step</p><p className="mt-1 font-semibold">{snapshot?.derivedStep?.replaceAll('_', ' ')}</p></div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3"><div><div className="flex justify-between text-xs"><span>Prospects</span><span>{evidence.attachedProspects}/20</span></div><Progress className="mt-2" value={Math.min(100, evidence.attachedProspects / 20 * 100)} /></div><div><div className="flex justify-between text-xs"><span>Messages sent</span><span>{evidence.contactedProspects}/10</span></div><Progress className="mt-2" value={Math.min(100, evidence.contactedProspects / 10 * 100)} /></div><div><div className="flex justify-between text-xs"><span>Conversations</span><span>{evidence.conversations}/3</span></div><Progress className="mt-2" value={Math.min(100, evidence.conversations / 3 * 100)} /></div></div></header>

      <Card><CardHeader><SectionHeading number={1} title="Sprint focus" description="Keep the offer, buyer, hypothesis, proof, capacity, and mentor decision question current as evidence changes." state="complete" /></CardHeader><CardContent className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>Offer</span><Input value={intake.offer} onChange={(e) => setIntake((v) => ({ ...v, offer: e.target.value }))} /></label><label className="space-y-1 text-sm"><span>Target buyer</span><Input value={intake.targetSegment} onChange={(e) => setIntake((v) => ({ ...v, targetSegment: e.target.value }))} /></label></div><label className="block space-y-1 text-sm"><span>Problem hypothesis</span><Textarea value={intake.problemHypothesis} onChange={(e) => setIntake((v) => ({ ...v, problemHypothesis: e.target.value }))} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>Proof URL</span><Input type="url" value={intake.proofUrl} onChange={(e) => setIntake((v) => ({ ...v, proofUrl: e.target.value }))} /></label><label className="space-y-1 text-sm"><span>Proof description</span><Input value={intake.proofDescription} onChange={(e) => setIntake((v) => ({ ...v, proofDescription: e.target.value }))} /></label></div><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>Estimated customer value (USD)</span><Input type="number" min="1" value={intake.estimatedCustomerValueUsd} onChange={(e) => setIntake((v) => ({ ...v, estimatedCustomerValueUsd: e.target.value }))} /></label><label className="space-y-1 text-sm"><span>Weekly capacity</span><Input type="number" min="2" value={intake.weeklyCapacityHours} onChange={(e) => setIntake((v) => ({ ...v, weeklyCapacityHours: e.target.value }))} /></label></div><label className="block space-y-1 text-sm"><span>Mentor decision question</span><Textarea value={intake.mentorDecisionQuestion} onChange={(e) => setIntake((v) => ({ ...v, mentorDecisionQuestion: e.target.value }))} /></label><Button variant="outline" onClick={saveIntake}>Save sprint focus</Button></CardContent></Card>

      <Card><CardHeader><SectionHeading number={2} title="Build the target list" description="Add contacts here or attach people already in the wider evidence pipeline. Sprint progress only counts attached contacts." state={`${evidence.attachedProspects}/${FIRST_CUSTOMER_TARGETS.prospects}`} /></CardHeader><CardContent>{snapshot?.availableContacts?.length ? <div className="mb-5 flex flex-col gap-2 rounded-lg border p-3 sm:flex-row"><select aria-label="Existing pipeline contact" className="h-10 flex-1 rounded-md border bg-background px-3 text-sm" value={existingContactId} onChange={(e) => setExistingContactId(e.target.value)}><option value="">Attach an existing pipeline contact…</option>{snapshot.availableContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.display_name}{contact.company ? ` — ${contact.company}` : ''}</option>)}</select><Button variant="outline" disabled={!existingContactId || sprintApi.isSaving} onClick={() => void safely(async () => { await sprintApi.attachContact(sprint.id, existingContactId, sprint.selected_message_variant); setExistingContactId(''); }, 'Contact attached to this sprint.')}>Attach contact</Button></div> : null}
      <CustomerEvidenceWorkspace sprintContext={{ sprintId: sprint.id, contactIds: snapshot?.contacts.map((contact) => contact.id) ?? [], messageVariants: variants, selectedMessageKey: sprint.selected_message_variant, onContactAttached: (contactId) => sprintApi.attachContact(sprint.id, contactId, sprint.selected_message_variant), onEvidenceRecorded: sprintApi.refresh }} /></CardContent></Card>

      <Card id="message-preparation"><CardHeader><SectionHeading number={3} title="Prepare three messages" description="Edit the discovery-led, problem-led, and offer-led variants. Pick one primary message before outreach." state={sprint.selected_message_variant ? `${sprint.selected_message_variant} selected` : 'selection required'} /></CardHeader><CardContent className="space-y-4">{variants.map((variant, index) => <div key={variant.key} className="rounded-xl border p-4"><div className="mb-2 flex items-center justify-between gap-2"><div><p className="font-semibold">{variant.label}</p><p className="text-xs text-muted-foreground">Personalizes only the founder-provided first name field.</p></div>{sprint.selected_message_variant === variant.key ? <Badge>Primary</Badge> : null}</div><Textarea className="min-h-28" value={variant.body} onChange={(e) => setVariants((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, body: e.target.value } : item))} /><div className="mt-3 flex gap-2"><Button size="sm" variant={sprint.selected_message_variant === variant.key ? 'secondary' : 'default'} onClick={() => selectMessage(variant.key)}>Use as primary</Button></div></div>)}<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={saveMessages}>Save edits</Button><Button variant="ghost" disabled={sprint.message_generation_count >= 2 || sprintApi.isSaving} onClick={() => void safely(() => sprintApi.generateMessages(sprint.id), 'Three new variants generated.')}><RefreshCw className="mr-2 h-4 w-4" />Regenerate once {sprint.message_generation_count >= 2 ? '(used)' : ''}</Button></div></CardContent></Card>

      <Card id="mentor-checkpoint"><CardHeader><SectionHeading number={4} title="Mentor checkpoint" description="Unlock this checkpoint with 10 attached prospects or one qualifying CT Verified execution claim, plus a selected message. The mentor interprets the evidence; they do not retroactively verify the raw events." state={sprint.mentor_checkpoint_completed_at ? 'verified with recommendation' : sprintApi.ctMentorUnlocked ? 'CT Verified access unlocked' : sprint.checkpoint_status} /></CardHeader><CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={createBrief}><ClipboardCopy className="mr-2 h-4 w-4" />Create and copy brief</Button><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print brief</Button></div>
        <div className="first-customer-brief whitespace-pre-wrap rounded-xl border bg-background p-5 text-sm">{mentorBriefText(brief)}</div>
        {sprintApi.ctMentorUnlocked ? <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm"><strong>CT Verified access:</strong> a qualifying acquisition execution unlocked this mentor checkpoint.</div> : null}
        <div className="grid gap-4 md:grid-cols-2">{mentors.loading ? <Loader2 className="h-6 w-6 animate-spin" /> : mentors.recommendations.map(({ mentor, reason }) => <div key={mentor.id} className="rounded-xl border p-4"><div className="flex items-start gap-3"><Users className="mt-1 h-5 w-5 text-primary" /><div><p className="font-semibold">{mentor.name}</p><p className="mt-1 text-sm text-muted-foreground">{reason}</p><Button className="mt-3" size="sm" disabled={!mentorUnlocked || sprintApi.isSaving || ['requested','scheduled','completed'].includes(sprint.checkpoint_status)} onClick={() => requestCheckpoint(mentor.id)}>{mentorUnlocked ? (sprint.checkpoint_status === 'not_requested' || sprint.checkpoint_status === 'cancelled' ? 'Request mentor checkpoint' : `Checkpoint ${sprint.checkpoint_status}`) : 'Attach 10 prospects or earn CT Verified access, then select a message'}</Button></div></div></div>)}</div>
        {sprint.checkpoint_scheduled_for ? <div className="rounded-lg border bg-muted/30 p-3 text-sm"><strong>Scheduled:</strong> {new Date(sprint.checkpoint_scheduled_for).toLocaleString()}</div> : null}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><h3 className="font-semibold">Mentor recommendation</h3><p className="mt-1 text-sm text-muted-foreground">Record what changed after the checkpoint. Completion counts only after this recommendation and admin verification both exist.</p><div className="mt-3 grid gap-3 sm:grid-cols-[240px_minmax(0,1fr)]"><select className="h-10 rounded-md border bg-background px-3 text-sm" value={decision} onChange={(e) => setDecision(e.target.value as FirstCustomerDecision)}>{DECISIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Textarea value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} placeholder="What did the mentor change in your segment, offer, message, channel, or decision?" /></div><Button className="mt-3" variant="outline" disabled={!['scheduled','completed'].includes(sprint.checkpoint_status)} onClick={recordCheckpoint}>Record mentor recommendation</Button></div>
      </CardContent></Card>

      <Card><CardHeader><SectionHeading number={5} title="Execute and review" description="Keep sending manually, record real customer evidence above, and finish when one of the evidence paths is met." state={completionEligible ? 'eligible to complete' : 'evidence in progress'} /></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-5">{[['Contacted', evidence.contactedProspects], ['Replies', evidence.replies], ['Conversations', evidence.conversations], ['Commitments', evidence.commitments], ['Payments', evidence.payments]].map(([label, value]) => <div key={String(label)} className="rounded-lg border p-3 text-center"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div><div className="mt-5 rounded-lg border p-4 text-sm"><p className="font-semibold">Completion paths</p><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground"><li>3 completed qualified conversations; or</li><li>1 commitment or payment; or</li><li>10 messages sent plus an evidence-backed pivot/pause decision and notes.</li></ul></div><div className="mt-5 flex flex-wrap gap-2"><Button size="lg" disabled={!completionEligible || sprintApi.isSaving} onClick={completeSprint}><CheckCircle2 className="mr-2 h-4 w-4" />Complete sprint</Button>{sprint.status !== 'paused' ? <Button variant="outline" onClick={() => void safely(async () => { await sprintApi.update(sprint.id, { status: 'paused' }); trackFirstCustomerSprint('first_customer_sprint_abandoned', { sprint_id: sprint.id, status: 'paused', decision_category: 'pause' }); }, 'Sprint paused. Your work is preserved.')}><Pause className="mr-2 h-4 w-4" />Pause</Button> : <Button variant="outline" onClick={() => void safely(() => sprintApi.update(sprint.id, { status: 'active' }), 'Sprint resumed.')}>Resume sprint</Button>}</div></CardContent></Card>
    </main><Footer /><style>{`@media print { body * { visibility: hidden !important; } .first-customer-brief, .first-customer-brief * { visibility: visible !important; } .first-customer-brief { position: absolute; inset: 0; border: 0; white-space: pre-wrap; } }`}</style></>
  );
}
