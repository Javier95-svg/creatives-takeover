import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import Navigation from '@/components/Navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent, trackFirstCustomerSprint } from '@/lib/analytics';
import type { FirstCustomerSprintAdminApplication, FirstCustomerSprintAdminSnapshot } from '@/types/firstCustomerSprint';

// Generated Supabase types follow the additive migration deployment.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = supabase as any;

const SUMMARY_CARDS: Array<[string, string]> = [
  ['Applications', 'applications'], ['Qualified', 'qualifiedApplications'], ['Invited', 'invited'],
  ['Started', 'started'], ['10 prospects', 'tenProspects'], ['10 messages', 'tenMessages'],
  ['Mentor checkpoints', 'mentorCheckpoints'], ['Completion outcomes', 'completionOutcomes'],
  ['Paid continuations', 'paidContinuations'], ['Verified referrals', 'verifiedReferrals'],
];

export default function AdminFirstCustomerSprintPage() {
  const queryClient = useQueryClient();
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({});
  const [scheduledFor, setScheduledFor] = useState<Record<string, string>>({});
  const [evidenceRejectionReasons, setEvidenceRejectionReasons] = useState<Record<string, string>>({});
  const cohort = useQuery({
    queryKey: ['first-customer-sprint-cohort-admin-v1'],
    queryFn: async (): Promise<FirstCustomerSprintAdminSnapshot> => {
      const { data, error } = await client.rpc('get_first_customer_sprint_cohort_admin_v1');
      if (error) throw error;
      return data as FirstCustomerSprintAdminSnapshot;
    },
  });
  const checkpoints = useQuery({
    queryKey: ['first-customer-sprint-checkpoints-admin-v1'],
    queryFn: async () => {
      const { data, error } = await client
        .from('first_customer_sprints')
        .select('id,founder_id,mentor_id,checkpoint_status,checkpoint_requested_at,checkpoint_scheduled_for,checkpoint_verified_at,mentor_recommendation_summary')
        .neq('checkpoint_status', 'not_requested');
      if (error) throw error;
      return (data ?? []) as Array<Record<string, string | null>>;
    },
  });
  const outcomeScorecard = useQuery({
    queryKey: ['outcome-journey-pilot-scorecard-v1'],
    queryFn: async () => {
      const { data, error } = await client.rpc('get_outcome_journey_pilot_scorecard_v1');
      if (error) throw error;
      return data as { invitedDenominator: number; expansionEligible: boolean; summary: Record<string, number>; founders: Array<Record<string, string | number | boolean | null>> };
    },
  });
  const evidenceQueue = useQuery({
    queryKey: ['journey-evidence-review-queue-v1'],
    queryFn: async () => {
      const { data, error } = await client.from('journey_evidence_submissions')
        .select('id,user_id,evidence_type,object_path,safe_summary,status,submitted_at,rejection_reason')
        .order('submitted_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; user_id: string; evidence_type: string; object_path: string | null; safe_summary: string; status: 'pending' | 'approved' | 'rejected'; submitted_at: string; rejection_reason: string | null }>;
    },
  });
  const review = useMutation({
    mutationFn: async ({ application, decision }: { application: FirstCustomerSprintAdminApplication; decision: 'invited' | 'declined' }) => {
      const { error } = await client.rpc('review_first_customer_sprint_application_v1', {
        p_application_id: application.id,
        p_decision: decision,
        p_override_reason: overrideReasons[application.id]?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['first-customer-sprint-cohort-admin-v1'] });
      toast.success('Application decision saved.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const updateCheckpoint = useMutation({
    mutationFn: async ({ sprintId, status }: { sprintId: string; status: 'scheduled' | 'completed' | 'cancelled' }) => {
      const when = status === 'scheduled' ? scheduledFor[sprintId] : null;
      const { error } = await client.rpc('admin_update_first_customer_sprint_checkpoint_v1', {
        p_sprint_id: sprintId,
        p_status: status,
        p_scheduled_for: when ? new Date(when).toISOString() : null,
      });
      if (error) throw error;
      trackFirstCustomerSprint(
        status === 'scheduled'
          ? 'first_customer_sprint_checkpoint_scheduled'
          : status === 'completed'
            ? 'first_customer_sprint_checkpoint_verified'
            : 'first_customer_sprint_checkpoint_cancelled',
        { sprint_id: sprintId, status, credits_deducted: 0 },
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['first-customer-sprint-cohort-admin-v1'] }),
        queryClient.invalidateQueries({ queryKey: ['first-customer-sprint-checkpoints-admin-v1'] }),
      ]);
      toast.success('Checkpoint status updated.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const reviewEvidence = useMutation({
    mutationFn: async ({ submissionId, decision }: { submissionId: string; decision: 'approved' | 'rejected' }) => {
      const { error } = await client.rpc('review_journey_evidence_v1', {
        p_submission_id: submissionId,
        p_decision: decision,
        p_rejection_reason: decision === 'rejected' ? evidenceRejectionReasons[submissionId]?.trim() || null : null,
      });
      if (error) throw error;
      captureEvent('journey_evidence_reviewed', {
        evidence_submission_id: submissionId,
        review_status: decision,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['journey-evidence-review-queue-v1'] }),
        queryClient.invalidateQueries({ queryKey: ['outcome-journey-pilot-scorecard-v1'] }),
      ]);
      toast.success('Evidence review saved.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openEvidence = async (objectPath: string) => {
    const { data, error } = await client.storage.from('journey-evidence-private').createSignedUrl(objectPath, 300);
    if (error || !data?.signedUrl) { toast.error(error?.message || 'Could not open evidence.'); return; }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const summary = cohort.data?.summary ?? {};
  const mentorCount = summary.mentorInvited ?? 0;
  const publicCount = summary.publicInvited ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto space-y-8 px-4 pb-16 pt-28 sm:px-6">
        <header>
          <Badge variant="secondary"><ShieldAlert className="mr-2 h-4 w-4" />Admin only</Badge>
          <h1 className="mt-3 text-3xl font-bold">First Customer Sprint cohort</h1>
          <p className="mt-2 text-muted-foreground">Run the eight-founder outcome pilot and monitor acquisition execution, evidence review, the Traction handoff, repeatability, payment, and referrals.</p>
          <p className="mt-2 text-sm text-muted-foreground">Mentors share <code>/first-customer-sprint/apply?source=mentor&amp;mentorId=MENTOR_ID&amp;ref=THEIR_REFERRAL_CODE</code>. The backend verifies both values before counting the application as mentor-sourced.</p>
        </header>

        {cohort.isLoading ? <Loader2 className="mx-auto my-16 h-8 w-8 animate-spin" /> : cohort.error ? (
          <Card><CardHeader><CardTitle>Cohort report unavailable</CardTitle><CardDescription>{cohort.error instanceof Error ? cohort.error.message : 'Unknown error'}</CardDescription></CardHeader></Card>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {SUMMARY_CARDS.map(([label, key]) => <Card key={key}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{summary[key] ?? 0}</p></CardContent></Card>)}
            </section>

            <Card className="border-primary/20">
              <CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Outcome funnel</CardTitle><CardDescription>Sequential founders keyed by invitation and journey, not separate tool-output totals.</CardDescription></div><Badge variant={outcomeScorecard.data?.expansionEligible ? 'default' : 'secondary'}>{outcomeScorecard.data?.expansionEligible ? 'Expansion threshold met' : 'Expansion paused'}</Badge></div></CardHeader>
              <CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {([
                  ['Invited', outcomeScorecard.data?.invitedDenominator ?? 0],
                  ['Sent 10 ≤30d', outcomeScorecard.data?.summary?.sentTenWithin30Days ?? 0],
                  ['Verified signal ≤30d', outcomeScorecard.data?.summary?.verifiedFirstSignalWithin30Days ?? 0],
                  ['Traction ≤48h', outcomeScorecard.data?.summary?.enteredTractionWithin48Hours ?? 0],
                  ['Repeatable ≤45d', outcomeScorecard.data?.summary?.repeatableDemandWithin45Days ?? 0],
                  ['Pending reviews', outcomeScorecard.data?.summary?.pendingReviews ?? 0],
                ] as const).map(([label, value]) => <div key={label} className="rounded-lg border p-3"><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}
              </div>{outcomeScorecard.data?.founders?.length ? <div className="space-y-2 border-t pt-4"><p className="text-sm font-semibold">Founder sequence</p>{outcomeScorecard.data.founders.map((founder) => <div key={String(founder.founder_id)} className="grid gap-2 rounded-lg border p-3 text-xs sm:grid-cols-6"><span className="font-mono">{String(founder.founder_id).slice(0, 8)}</span><span>Stage: {String(founder.current_stage ?? 'not started')}</span><span>{Number(founder.time_in_current_stage_hours ?? 0)}h in stage</span><span>{Number(founder.messages_sent ?? 0)}/10 sent</span><span>{founder.verified_signal_at ? 'Signal verified' : 'Awaiting verification'}</span><span>{String(founder.acquisition_source ?? 'unknown')}</span></div>)}</div> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Private evidence review queue</CardTitle><CardDescription>Approve only redacted evidence that corroborates the linked buyer event. Approval creates a separate immutable reviewer-verified observation.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {evidenceQueue.data?.length ? evidenceQueue.data.map((submission) => <div key={submission.id} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[minmax(0,1fr)_auto]"><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{submission.evidence_type.replaceAll('_', ' ')}</Badge><Badge>{submission.status}</Badge></div><p className="mt-2 text-sm">{submission.safe_summary}</p><p className="mt-1 text-xs text-muted-foreground">Submitted {new Date(submission.submitted_at).toLocaleString()}</p>{submission.rejection_reason ? <p className="mt-1 text-xs text-destructive">{submission.rejection_reason}</p> : null}</div><div className="min-w-52 space-y-2">{submission.object_path ? <Button className="w-full" variant="outline" onClick={() => void openEvidence(submission.object_path!)}><ExternalLink className="mr-2 h-4 w-4" />Open redacted proof</Button> : null}{submission.status === 'pending' ? <><Input placeholder="Rejection reason" value={evidenceRejectionReasons[submission.id] ?? ''} onChange={(event) => setEvidenceRejectionReasons((current) => ({ ...current, [submission.id]: event.target.value }))} /><Button className="w-full" disabled={reviewEvidence.isPending} onClick={() => reviewEvidence.mutate({ submissionId: submission.id, decision: 'approved' })}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</Button><Button className="w-full" variant="outline" disabled={reviewEvidence.isPending} onClick={() => reviewEvidence.mutate({ submissionId: submission.id, decision: 'rejected' })}><XCircle className="mr-2 h-4 w-4" />Reject</Button></> : null}</div></div>) : <p className="text-sm text-muted-foreground">No evidence submissions yet.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Cohort source mix</CardTitle><CardDescription>The pilot is capped at eight invited founders; source mix is monitored rather than hard-gated.</CardDescription></CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <div><div className="flex justify-between text-sm"><span>Mentor referrals</span><span>{mentorCount}/8</span></div><Progress className="mt-2" value={Math.min(100, mentorCount / 8 * 100)} /></div>
                <div><div className="flex justify-between text-sm"><span>Public/current audience</span><span>{publicCount}/8</span></div><Progress className="mt-2" value={Math.min(100, publicCount / 8 * 100)} /></div>
              </CardContent>
            </Card>

            <section>
              <h2 className="mb-4 text-2xl font-semibold">Applications and execution</h2>
              {cohort.data?.applications.length ? <div className="space-y-4">{cohort.data.applications.map((application) => (
                <Card key={application.id}>
                  <CardContent className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
                    <div>
                      <div className="flex flex-wrap gap-2"><Badge>{application.source === 'mentor_referral' ? 'Mentor referral' : 'Public'}</Badge><Badge variant={application.qualified ? 'default' : 'secondary'}>{application.qualified ? 'Qualified' : 'Override required'}</Badge><Badge variant="outline">{application.status}</Badge></div>
                      <p className="mt-3 font-semibold">{application.email}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{application.productSummary}</p>
                      {application.productUrl ? <a className="mt-2 inline-flex items-center text-sm text-primary hover:underline" href={application.productUrl} target="_blank" rel="noreferrer">Review product <ExternalLink className="ml-1 h-3 w-3" /></a> : null}
                      {application.qualificationReasons.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{application.qualificationReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg border p-3"><strong>${application.annualCustomerValueUsd}</strong><p className="text-xs text-muted-foreground">Annual customer value</p></div>
                      <div className="rounded-lg border p-3"><strong>{application.customerCount}</strong><p className="text-xs text-muted-foreground">Customers</p></div>
                      <div className="rounded-lg border p-3"><strong>{application.attached}</strong><p className="text-xs text-muted-foreground">Prospects</p></div>
                      <div className="rounded-lg border p-3"><strong>{application.sent}</strong><p className="text-xs text-muted-foreground">Messages</p></div>
                      <div className="rounded-lg border p-3"><strong>{application.conversations}</strong><p className="text-xs text-muted-foreground">Conversations</p></div>
                      <div className="rounded-lg border p-3"><strong>{application.paidContinuation ? 'Paid' : '—'}</strong><p className="text-xs text-muted-foreground">Second sprint</p></div>
                    </div>
                    <div className="min-w-52 space-y-2">
                      {application.status === 'submitted' && !application.qualified ? <Input aria-label={`Override reason for ${application.email}`} placeholder="Override reason" value={overrideReasons[application.id] ?? ''} onChange={(event) => setOverrideReasons((current) => ({ ...current, [application.id]: event.target.value }))} /> : null}
                      {application.status === 'submitted' ? <><Button className="w-full" disabled={review.isPending} onClick={() => review.mutate({ application, decision: 'invited' })}><CheckCircle2 className="mr-2 h-4 w-4" />Invite</Button><Button className="w-full" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ application, decision: 'declined' })}><XCircle className="mr-2 h-4 w-4" />Decline</Button></> : null}
                      {application.sprintStatus ? <div className="rounded-lg border p-3 text-xs"><strong>Sprint: {application.sprintStatus}</strong><p className="mt-1 text-muted-foreground">Mentor checkpoint: {application.mentorCheckpointCompleted ? 'yes' : 'no'} · Referrals: {application.verifiedReferrals}</p></div> : null}
                      {application.sprintId ? (() => {
                        const checkpoint = checkpoints.data?.find((item) => item.id === application.sprintId);
                        if (!checkpoint) return null;
                        const status = checkpoint.checkpoint_status;
                        return <div className="space-y-2 rounded-lg border p-3 text-xs">
                          <strong>Checkpoint: {status?.replaceAll('_', ' ')}</strong>
                          {checkpoint.checkpoint_scheduled_for ? <p>{new Date(checkpoint.checkpoint_scheduled_for).toLocaleString()}</p> : null}
                          {status === 'requested' ? <><Input type="datetime-local" aria-label={`Schedule checkpoint for ${application.email}`} value={scheduledFor[application.sprintId] ?? ''} onChange={(event) => setScheduledFor((current) => ({ ...current, [application.sprintId!]: event.target.value }))} /><Button className="w-full" size="sm" disabled={!scheduledFor[application.sprintId] || updateCheckpoint.isPending} onClick={() => updateCheckpoint.mutate({ sprintId: application.sprintId!, status: 'scheduled' })}>Schedule checkpoint</Button></> : null}
                          {status === 'scheduled' ? <Button className="w-full" size="sm" disabled={updateCheckpoint.isPending} onClick={() => updateCheckpoint.mutate({ sprintId: application.sprintId!, status: 'completed' })}>Verify completed</Button> : null}
                          {(status === 'requested' || status === 'scheduled') ? <Button className="w-full" size="sm" variant="outline" disabled={updateCheckpoint.isPending} onClick={() => updateCheckpoint.mutate({ sprintId: application.sprintId!, status: 'cancelled' })}>Cancel checkpoint</Button> : null}
                          {status === 'completed' && !checkpoint.mentor_recommendation_summary ? <p className="text-muted-foreground">Waiting for founder recommendation.</p> : null}
                        </div>;
                      })() : null}
                    </div>
                  </CardContent>
                </Card>
              ))}</div> : <Card><CardContent className="py-8 text-muted-foreground">No applications yet.</CardContent></Card>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
