import { useState } from 'react';
import { AccountInvitations } from '@/components/admin/AccountInvitations';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Search } from 'lucide-react';
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
 * Review screen for mentor and marketplace requests.
 *
 * Every decision goes through review_account_application, which checks the
 * admin role itself. This page is behind AdminRoute as well, but the guard that
 * matters is the one in the database: a route guard is a convenience, not a
 * permission.
 */
export default function AdminAccountRequests() {
  const [tab, setTab] = useState<ApprovalStatus>('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
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
  const visibleRows = rows.filter((application) => {
    if (typeFilter !== 'all' && application.userType !== typeFilter) return false;
    const term = search.trim().toLocaleLowerCase();
    return !term || [application.fullName, application.email, application.username]
      .some((value) => value?.toLocaleLowerCase().includes(term));
  });
  const reviewingId = review.isPending ? review.variables?.applicationId : null;

  return <>
    <SEO title="Account requests" description="Review mentor and marketplace requests." url="/admin/account-requests" noindex />
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-header-offset nav-offset-roomy pb-16">
        <header className="mb-8">
          <h1 className="text-headline-lg font-semibold">Account requests</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Mentor and marketplace requests wait here until a decision is made. Founders, builders and investors never appear: they are approved on arrival.
          </p>
        </header>

        <section className="mb-10" aria-label="Account application queue">
        <div className="mb-5 flex flex-wrap gap-2" aria-label="Request status">
          {TABS.map((entry) => (
            <Button key={entry.value} size="sm" variant={tab === entry.value ? 'default' : 'outline'} aria-pressed={tab === entry.value} onClick={() => setTab(entry.value)}>
              {entry.label}
            </Button>
          ))}
        </div>
        <div className="mb-5 flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search requests by name, email or username" placeholder="Search name, email or username" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
          </div>
          <select aria-label="Filter requests by account type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">All types</option>
            <option value="mentor">Mentors</option>
            <option value="marketplace">Marketplace</option>
          </select>
        </div>
        {!applications.isPending && !applications.isError && <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">Showing {visibleRows.length} of {rows.length} {tab} requests</p>}

        {applications.isPending && <p className="text-sm text-muted-foreground">Loading requests...</p>}
        {applications.isError && (
          <p role="alert" className="text-sm text-destructive">
            Could not load requests. <button className="underline" onClick={() => void applications.refetch()}>Retry</button>
          </p>
        )}
        {!applications.isPending && !applications.isError && visibleRows.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{rows.length === 0 ? `No ${tab} requests.` : 'No requests match these filters.'}</p>
        )}

        <div className="space-y-4">
          {visibleRows.map((application: AccountApplication) => (
            <Card key={application.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="break-words">{application.fullName || application.username || 'Unnamed account'}</CardTitle>
                    <CardDescription className="break-all">
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
                {application.status === 'pending' ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Approval enables category features. Confirm the mentor or service listing is complete before publishing it in the directory.</p>
                    <Input aria-label={`Decision note for ${application.fullName || application.username || 'account'}`}
                      value={notes[application.id] ?? ''}
                      onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))}
                      placeholder="Optional note, included in a rejection email" maxLength={300} />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={review.isPending}
                        onClick={() => review.mutate({ applicationId: application.id, decision: 'approved', note: notes[application.id]?.trim() || null })}>
                        {reviewingId === application.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {reviewingId === application.id && review.variables?.decision === 'approved' ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button size="sm" variant="outline" disabled={review.isPending}
                        onClick={() => review.mutate({ applicationId: application.id, decision: 'rejected', note: notes[application.id]?.trim() || null })}>
                        {reviewingId === application.id && review.variables?.decision === 'rejected' ? 'Rejecting...' : 'Reject'}
                      </Button>
                    </div>
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
        </section>

        <AccountInvitations />
        <section className="mb-8 overflow-x-auto" aria-label="Onboarding health">
          <h2 className="mb-2 font-semibold">Onboarding — last 30 days</h2>
          <p className="mb-3 text-xs text-muted-foreground">Completion includes submitted applications. First action means a completed activation, saved role details, or opening a matched founder conversation. These are observed counts, not conversion estimates.</p>
          {funnel.isPending && <p className="text-sm text-muted-foreground">Loading onboarding metrics...</p>}
          {funnel.isError && <p role="alert">Could not load onboarding metrics. <button className="underline" onClick={() => void funnel.refetch()}>Retry</button></p>}
          {funnel.isSuccess && funnel.data.length === 0 && <p className="text-sm text-muted-foreground">No onboarding activity in the last 30 days.</p>}
          <table className="w-full text-left text-sm"><thead><tr>{['Type','Started','Completed','Entered workspace','First action','Type mismatch','Review hours'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>
            {(funnel.data ?? []).map((row,index) => <tr key={row.userType+index} className="border-t"><td className="p-2">{row.userType}</td><td>{row.sessions}</td><td>{row.completed}</td><td>{row.workspaceEntered}</td><td>{row.firstUsefulAction}</td><td>{row.classificationMismatch}</td><td>{row.averageReviewHours ?? '—'}</td></tr>)}
          </tbody></table>
        </section>
      </main>
      <Footer />
    </div>
  </>;
}

