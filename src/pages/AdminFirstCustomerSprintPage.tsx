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
import { trackFirstCustomerSprint } from '@/lib/analytics';
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
  const review = useMutation({
    mutationFn: async ({ application, decision }: { application: FirstCustomerSprintAdminApplication; decision: 'invited' | 'declined' }) => {
      const { error } = await client.rpc('review_first_customer_sprint_application_v2', {
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
          <p className="mt-2 text-muted-foreground">Run one capacity-limited founder cohort and monitor applications, activation, external evidence, outcomes, and mentor delivery.</p>
          <p className="mt-2 text-sm text-muted-foreground">Mentors share <code>/first-customer-sprint/apply?source=mentor&amp;mentorId=MENTOR_ID&amp;ref=THEIR_REFERRAL_CODE</code>. The backend verifies both values before counting the application as mentor-sourced.</p>
        </header>

        {cohort.isLoading ? <Loader2 className="mx-auto my-16 h-8 w-8 animate-spin" /> : cohort.error ? (
          <Card><CardHeader><CardTitle>Cohort report unavailable</CardTitle><CardDescription>{cohort.error instanceof Error ? cohort.error.message : 'Unknown error'}</CardDescription></CardHeader></Card>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {SUMMARY_CARDS.map(([label, key]) => <Card key={key}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{summary[key] ?? 0}</p></CardContent></Card>)}
            </section>

            <Card>
              <CardHeader><CardTitle>Mixed-cohort allocation</CardTitle><CardDescription>Keep five places available for each source during the initial recruitment window.</CardDescription></CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <div><div className="flex justify-between text-sm"><span>Mentor referrals</span><span>{mentorCount}/5</span></div><Progress className="mt-2" value={Math.min(100, mentorCount / 5 * 100)} /></div>
                <div><div className="flex justify-between text-sm"><span>Public/current audience</span><span>{publicCount}/5</span></div><Progress className="mt-2" value={Math.min(100, publicCount / 5 * 100)} /></div>
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
                      <div className="rounded-lg border p-3"><strong>{application.annualCustomerValueUsd ? `$${application.annualCustomerValueUsd}` : 'Hypothesis'}</strong><p className="text-xs text-muted-foreground">Annual customer value</p></div>
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
