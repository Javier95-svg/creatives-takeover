import { useState } from 'react';
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

  const review = useMutation({
    mutationFn: reviewAccountApplication,
    onSuccess: (_result, variables) => {
      toast.success(variables.decision === 'approved' ? 'Approved. The applicant has been emailed.' : 'Rejected. The applicant has been emailed.');
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
