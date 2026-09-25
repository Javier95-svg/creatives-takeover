import { useState } from 'react';
import { AccountInvitations } from '@/components/admin/AccountInvitations';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { describeRoleProfile } from '@/lib/roleProfileSchema';
import {
  listAccountApplications, reviewAccountApplication,
  USER_TYPE_LABEL, type AccountApplication, type ApprovalStatus,
} from '@/lib/accountApplications';

const TABS: { value: ApprovalStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

/**
 * Review screen for mentor, marketplace and investor requests.
 *
 * Every decision goes through review_account_application, which checks the
 * admin role itself. This page is behind AdminRoute as well, but the guard that
 * matters is the one in the database: a route guard is a convenience, not a
 * permission.
 */
export default function AdminAccountRequests() {
  const [tab, setTab] = useState<ApprovalStatus>('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const applications = useQuery({
    queryKey: ['account-applications', tab],
    queryFn: () => listAccountApplications(tab),
  });

  const funnel = useQuery({
    queryKey: ['account-onboarding-funnel'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('account_onboarding_funnel' as never);
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as Array<{ userType: string; sessions: number; completed: number; workspaceEntered: number; firstUsefulAction: number; classificationMismatch: number; averageReviewHours: number | null }>;
    },
  });

  const review = useMutation({
    mutationFn: reviewAccountApplication,
    onSuccess: (_result, variables) => {
      toast.success(variables.decision === 'approved' ? 'Approved. The notification has been queued.' : 'Rejected. The notification has been queued.');
      void queryClient.invalidateQueries({ queryKey: ['account-applications'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not record the decision.'),
  });

  const rows = applications.data ?? [];

  return <>
    <SEO title="Account requests" description="Review mentor, marketplace and investor requests." url="/admin/account-requests" noindex />
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-header-offset nav-offset-roomy pb-16">
        <header className="mb-8">
          <h1 className="text-headline-lg font-semibold">Account requests</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Mentors, marketplace providers and investors wait here until a decision is made. Founders and builders never appear: they are approved on arrival.
          </p>
        </header>

        <AccountInvitations />
        <section className="mb-8 overflow-x-auto" aria-label="Onboarding health">
          <h2 className="mb-2 font-semibold">Onboarding — last 30 days</h2>
          <p className="mb-3 text-xs text-muted-foreground">Completion includes submitted applications. First action means a completed activation, saved role details, or opening a matched founder conversation. These are observed counts, not conversion estimates.</p>
          {funnel.isError && <p role="alert">Could not load onboarding metrics. <button className="underline" onClick={() => void funnel.refetch()}>Retry</button></p>}
          <table className="w-full text-left text-sm"><thead><tr>{['Type','Started','Completed','Entered workspace','First action','Type mismatch','Review hours'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>
            {(funnel.data ?? []).map((row,index) => <tr key={row.userType+index} className="border-t"><td className="p-2">{row.userType}</td><td>{row.sessions}</td><td>{row.completed}</td><td>{row.workspaceEntered}</td><td>{row.firstUsefulAction}</td><td>{row.classificationMismatch}</td><td>{row.averageReviewHours ?? '—'}</td></tr>)}
          </tbody></table>
        </section>
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((entry) => (
            <Button key={entry.value} size="sm" variant={tab === entry.value ? 'default' : 'outline'} onClick={() => setTab(entry.value)}>
              {entry.label}
            </Button>
          ))}
        </div>

        {applications.isPending && <p className="text-sm text-muted-foreground">Loading requests…</p>}
        {applications.isError && (
          <p role="alert" className="text-sm text-destructive">
            Could not load requests. <button className="underline" onClick={() => void applications.refetch()}>Retry</button>
          </p>
        )}
        {!applications.isPending && !applications.isError && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No {tab} requests.</p>
        )}

        <div className="space-y-4">
          {rows.map((application: AccountApplication) => (
            <Card key={application.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{application.fullName || application.username || 'Unnamed account'}</CardTitle>
                    <CardDescription className="truncate">
                      {application.email || 'No email on the request'}
                      {application.username ? ` · @${application.username}` : ''}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">{USER_TYPE_LABEL[application.userType]}</Badge>
                    <Badge variant="outline">{new Date(application.submittedAt).toISOString().slice(0, 10)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="mb-5 space-y-3">
                  {describeRoleProfile(application.userType, application.roleProfile).map((detail) => <div key={detail.key}>
                    <dt className="text-sm font-semibold">{detail.label}</dt>
                    <dd className="break-words whitespace-pre-wrap text-sm text-muted-foreground">{detail.display}</dd>
                  </div>)}
                </dl>
                <p className="mb-4 text-xs text-muted-foreground">Approval enables category features. Confirm the mentor or service listing is complete before publishing it in the directory.</p>
                {application.status === 'pending' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      value={notes[application.id] ?? ''}
                      onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                      placeholder="Optional note, included in a rejection email"
                      className="min-w-0 flex-1"
                      maxLength={300}
                    />
                    <Button size="sm" disabled={review.isPending}
                      onClick={() => review.mutate({ applicationId: application.id, decision: 'approved', note: notes[application.id] || null })}>
                      {review.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={review.isPending}
                      onClick={() => review.mutate({ applicationId: application.id, decision: 'rejected', note: notes[application.id] || null })}>
                      Reject
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {application.status === 'approved' ? 'Approved' : 'Rejected'}
                    {application.reviewedAt ? ` on ${new Date(application.reviewedAt).toISOString().slice(0, 10)}` : ''}
                    {application.decisionNote ? ` · ${application.decisionNote}` : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  </>;
}
