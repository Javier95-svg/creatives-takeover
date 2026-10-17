import { Fragment, useEffect, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, Download, Minus } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCohortDashboard } from '@/hooks/useCohortContext';
import { captureEvent } from '@/lib/analytics';
import {
  attentionReasons,
  checkinForWeek,
  cohortCsv,
  cohortInviteUrl,
  cohortKpis,
  cohortTotalWeeks,
  cohortWeek,
  memberStage,
  type CohortMemberProgress,
  type CohortSummary,
} from '@/lib/cohorts';
import { cn } from '@/lib/utils';

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const copyText = async (text: string, what: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied.`);
  } catch {
    toast.error(`Copy failed. The link is ${text}`);
  }
};

/**
 * The program dashboard: every founder in a cohort, their progress (never their
 * content), this week's check-ins and who needs attention. Used by program staff
 * in cohort mode and by our team from /admin/cohorts.
 */
export default function ProgramDashboard({
  cohortId,
  cohortOptions = [],
  onSelectCohort,
}: {
  cohortId: string;
  /** Other cohorts this person staffs, for the selector. */
  cohortOptions?: CohortSummary[];
  onSelectCohort?: (cohortId: string) => void;
}) {
  const { data, isLoading, error } = useCohortDashboard(cohortId);
  const [openRow, setOpenRow] = useState<string | null>(null);

  useEffect(() => {
    captureEvent('program_dashboard_viewed', { cohort_id: cohortId });
  }, [cohortId]);

  if (isLoading) return <Skeleton className="mb-6 h-96 rounded-xl" />;
  if (error || !data) {
    return (
      <Card className="mb-6 border-border/60 bg-card/70">
        <CardContent className="p-6 text-sm text-muted-foreground">
          We couldn’t load this cohort. If you were just invited, reload the page; otherwise ask the Creatives Takeover team for access.
        </CardContent>
      </Card>
    );
  }

  const { cohort, members } = data;
  const week = cohortWeek(cohort.startDate, cohort.endDate);
  const totalWeeks = cohortTotalWeeks(cohort.startDate, cohort.endDate);
  const now = new Date();
  const kpis = cohortKpis(members, week, now);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://creatives-takeover.com';

  const exportCsv = () => {
    const blob = new Blob([cohortCsv(data, week, now)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(cohort.programName || cohort.cohortName).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-week-${week}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    captureEvent('cohort_export_downloaded', { cohort_id: cohortId, week });
  };

  const tiles = [
    { label: 'Founders', value: String(kpis.founders) },
    { label: 'Customer profile ready', value: `${kpis.plansReady}/${kpis.founders}` },
    { label: 'Median interviews', value: String(kpis.medianInterviews) },
    { label: week === 0 ? 'Check-ins' : `Check-ins week ${week}`, value: week === 0 ? '—' : `${kpis.checkinsThisWeek}/${kpis.founders}` },
    { label: 'Decisions reached', value: String(kpis.decisions) },
    { label: 'Need attention', value: String(kpis.needAttention), alert: kpis.needAttention > 0 },
  ];

  return (
    <div>
      <Card className="mb-6 border-primary/25 bg-card/80">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Badge variant="secondary" className="mb-3 rounded-full">Program dashboard</Badge>
              <h1 className="font-space-grotesk text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {cohort.programName || cohort.cohortName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {cohort.programName ? `${cohort.cohortName} · ` : ''}
                {formatDate(cohort.startDate)} – {formatDate(cohort.endDate)}
              </p>
              {cohortOptions.length > 1 && onSelectCohort ? (
                <Select value={cohortId} onValueChange={onSelectCohort}>
                  <SelectTrigger className="mt-3 w-full max-w-xs" aria-label="Choose a cohort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cohortOptions.map((option) => (
                      <SelectItem key={option.cohortId} value={option.cohortId}>
                        {option.programName ? `${option.programName} · ${option.cohortName}` : option.cohortName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
            <div className="w-full max-w-xs">
              <p className="mb-2 text-sm font-semibold text-foreground">
                {week === 0 ? `Starts ${formatDate(cohort.startDate)}` : `Week ${week} of ${totalWeeks}`}
              </p>
              <Progress value={week === 0 ? 0 : (week / totalWeeks) * 100} aria-label="Cohort progress" />
              <div className="mt-4 flex flex-wrap gap-2">
                {cohort.joinCode ? (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copyText(cohortInviteUrl(origin, cohort.joinCode as string), 'Founder invite link')}>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Founder invite link
                  </Button>
                ) : null}
                {cohort.staffCode ? (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copyText(cohortInviteUrl(origin, cohort.staffCode as string), 'Staff invite link')}>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Staff invite link
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv} disabled={!members.length}>
                  <Download className="h-3.5 w-3.5" aria-hidden="true" /> Export CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-border/60 bg-card/70 p-4">
            <p className={cn('font-space-grotesk text-2xl font-semibold tabular-nums', tile.alert ? 'text-destructive' : 'text-foreground')}>
              {tile.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{tile.label}</p>
          </div>
        ))}
      </div>

      <Card className="mb-6 border-border/60 bg-card/70">
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              No founders yet. Share the founder invite link; each founder joins with their own account and agrees to share their progress.
            </p>
          ) : (
            // w-0 min-w-full: fills the card but adds no minimum width, so a flex
            // parent never grows to fit the table; the table scrolls here instead.
            <div className="w-0 min-w-full overflow-x-auto">
              {/* A fixed minimum keeps columns readable; on narrow screens the table scrolls inside its card. */}
              <table className="w-full text-left text-sm" style={{ minWidth: '54rem' }}>
                <thead>
                  <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Founder</th>
                    <th className="px-4 py-3 font-semibold">Stage</th>
                    <th className="px-4 py-3 font-semibold">Tasks</th>
                    <th className="px-4 py-3 font-semibold">Interviews</th>
                    <th className="px-4 py-3 font-semibold">Evidence</th>
                    <th className="px-4 py-3 font-semibold">Last active</th>
                    <th className="px-4 py-3 font-semibold">{week ? `Week ${week}` : 'Check-in'}</th>
                    <th className="px-4 py-3 font-semibold">Attention</th>
                    <th className="px-2 py-3"><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <MemberRow
                      key={member.userId}
                      member={member}
                      week={week}
                      now={now}
                      open={openRow === member.userId}
                      onToggle={() => setOpenRow(openRow === member.userId ? null : member.userId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Interviews and evidence show verified / total: verified means the platform observed it or our team reviewed proof; the rest is reported by the founder.
        Founders’ files, ideas and messages are never shown here.
      </p>
    </div>
  );
}

function MemberRow({
  member,
  week,
  now,
  open,
  onToggle,
}: {
  member: CohortMemberProgress;
  week: number;
  now: Date;
  open: boolean;
  onToggle: () => void;
}) {
  const stage = memberStage(member.outcomes);
  const reasons = attentionReasons(member, week, now);
  const thisWeek = week ? checkinForWeek(member, week) : null;
  const interviewsTotal = member.interviews.total + member.evidence.interviewsCompleted;

  return (
    <Fragment>
      <tr className="border-b border-border/40 align-top">
        <td className="px-4 py-3">
          <p className="font-semibold text-foreground">{member.name}</p>
          {member.email ? <p className="text-xs text-muted-foreground">{member.email}</p> : null}
        </td>
        <td className="px-4 py-3">
          <p className="text-foreground">{stage.label}</p>
          <p className="text-xs text-muted-foreground">
            {stage.decisionReached ? 'Decision reached' : stage.planReady ? 'Customer profile ready' : 'No customer profile yet'}
          </p>
        </td>
        <td className="px-4 py-3 tabular-nums text-foreground">{member.completedTaskIds.length}</td>
        <td className="px-4 py-3 tabular-nums text-foreground">
          {member.interviews.verified} / {interviewsTotal}
        </td>
        <td className="px-4 py-3 tabular-nums text-foreground">
          {member.evidence.verified} / {member.evidence.total}
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {member.lastActivityAt ? formatDistanceToNowStrict(new Date(member.lastActivityAt), { addSuffix: true }) : 'Never'}
        </td>
        <td className="px-4 py-3">
          {thisWeek ? (
            <CheckCircle2 className="h-4 w-4 text-success" aria-label="Checked in" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" aria-label="No check-in yet" />
          )}
        </td>
        <td className="px-4 py-3">
          {reasons.length ? (
            <div className="flex flex-wrap gap-1.5">
              {reasons.map((reason) => (
                <span key={reason.key} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {reason.label}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">On track</span>
          )}
        </td>
        <td className="px-2 py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} check-ins for ${member.name}`}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-border/40 bg-background/40">
          <td colSpan={9} className="px-4 py-4">
            {member.checkins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {[...member.checkins].sort((a, b) => b.weekNumber - a.weekNumber).map((checkin) => (
                  <div key={checkin.weekNumber} className="rounded-xl border border-border/60 bg-card/70 p-4 text-sm">
                    <p className="font-semibold text-foreground">Week {checkin.weekNumber}</p>
                    <CheckinList label="Done" items={checkin.wins} />
                    <CheckinList label="Blockers" items={checkin.blockers} />
                    <CheckinList label="Next week" items={checkin.nextWeekGoals} />
                    <CheckinList label="Help needed" items={checkin.helpNeeded ? [checkin.helpNeeded] : []} />
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function CheckinList({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-foreground">
        {items.map((item, index) => (
          <li key={`${label}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
