import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Info, Loader2 } from 'lucide-react';

import SEO from '@/components/SEO';
import { ToolPageShell } from '@/components/tool-shell/ToolPageShell';
import TractionLogbookWallpaper, { TractionLogbookChart } from '@/components/wallpapers/TractionLogbookWallpaper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  cohortTotals, segmentComparison, share, timeSpent, topSection, type AdoptionMetrics, type AdoptionSegment,
} from '@/lib/adoptionMetrics';
import { cn } from '@/lib/utils';

const WEEKS = 12;

const formatWeek = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function Stat({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return <Card>
    <CardHeader className="pb-2">
      <CardDescription>{label}</CardDescription>
      <CardTitle className="text-3xl">{value}</CardTitle>
    </CardHeader>
    <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
  </Card>;
}

function TimeCell({ stat, strong }: { stat: Parameters<typeof timeSpent>[0]; strong?: boolean }) {
  const { total, perAccount } = timeSpent(stat);
  return <TableCell className={cn('text-right', strong && 'font-semibold')}>
    {total}
    {perAccount && <span className="block text-xs font-normal text-muted-foreground">avg {perAccount}</span>}
  </TableCell>;
}

/**
 * Product adoption for admins: which sidebar sections (and their tools) people
 * use and act in, and whether new accounts come back. Reads admin_adoption_metrics(),
 * which checks the admin role itself and uses first-party data only, so it
 * covers every account regardless of cookie choices, except time spent, which
 * only comes from accounts that accepted analytics. Internal accounts excluded.
 */
const fetchReport = async (segment: AdoptionSegment | null) => {
  // The all-accounts call omits the segment, so it also works before 20261014130000.
  const args = segment ? { p_weeks: WEEKS, p_segment: segment } : { p_weeks: WEEKS };
  const { data, error } = await supabase.rpc('admin_adoption_metrics' as never, args as never);
  if (error) throw error;
  return data as unknown as AdoptionMetrics;
};

export default function AdminAdoption() {
  const [segment, setSegment] = useState<'all' | AdoptionSegment>('all');
  const all = useQuery({ queryKey: ['admin-adoption-metrics', WEEKS, 'all'], queryFn: () => fetchReport(null) });
  // Each segment is the whole report filtered to its accounts, so the
  // comparison and the filtered tables share one definition of every figure.
  const founders = useQuery({ queryKey: ['admin-adoption-metrics', WEEKS, 'founder'], queryFn: () => fetchReport('founder'), retry: false });
  const builders = useQuery({ queryKey: ['admin-adoption-metrics', WEEKS, 'builder'], queryFn: () => fetchReport('builder'), retry: false });
  const segmentsReady = Boolean(founders.data?.summary?.accounts !== undefined && builders.data?.summary?.accounts !== undefined);
  const metrics = segment === 'founder' && segmentsReady ? founders : segment === 'builder' && segmentsReady ? builders : all;
  const comparison = segmentsReady && founders.data && builders.data ? segmentComparison(founders.data, builders.data) : null;

  // The section report needs the 20261012120000 migration; until then the
  // function returns the older per-tool shape, which this page cannot show.
  const data = metrics.data && Array.isArray(metrics.data.sections) ? metrics.data : undefined;
  const outdated = Boolean(metrics.data && !data);
  const totals = data ? cohortTotals(data.cohorts) : null;
  const maxActive = data ? Math.max(1, ...data.weekly.map((week) => week.activeAccounts)) : 1;
  const leader = data ? topSection(data.sections) : null;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (section: string) => setOpen((current) => {
    const next = new Set(current);
    if (next.has(section)) next.delete(section); else next.add(section);
    return next;
  });
  const allOpen = Boolean(data && open.size === data.sections.length);
  // Time spent and cookie choices need the 20261013120000 migration.
  const consent = data && data.summary.consentGranted30d !== undefined ? {
    granted: data.summary.consentGranted30d ?? 0,
    denied: data.summary.consentDenied30d ?? 0,
    unknown: Math.max(0, data.summary.activeAccounts30d - (data.summary.consentGranted30d ?? 0) - (data.summary.consentDenied30d ?? 0)),
    timed: data.summary.timedAccounts30d ?? 0,
  } : null;

  return <>
    <SEO title="Adoption | Admin" description="Product adoption metrics" url="/admin/adoption" noindex />
    {/* Inside the workspace frame (sidebar and top bar), like the tools it measures. */}
    <ToolPageShell
      title="Product adoption"
      purpose="Which sections of the platform people use and act in, tool by tool, and whether new accounts come back."
      context={<>Every account, whatever its cookie choice, except time spent. Internal accounts excluded.{data ? ` Updated ${new Date(data.generatedAt).toLocaleString('en-GB')}.` : ''}</>}
      theme="traction"
      wallpaper={<TractionLogbookWallpaper />}
      headerArt={<TractionLogbookChart />}
    >

      {metrics.isPending && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading adoption metrics…</p>}
      {metrics.isError && <p role="alert" className="text-sm text-destructive">
        Could not load adoption metrics. {String((metrics.error as { message?: string })?.message ?? '')}
      </p>}

      {metrics.isSuccess && !data && <p className="text-sm text-muted-foreground">
        {outdated ? 'The section report needs the latest adoption migration (20261012120000_adoption_by_section). Run it and reload.' : 'No adoption data returned. If the adoption migration has not been applied yet, run it and reload.'}
      </p>}

      {data && totals && <div className="space-y-8">
        {segmentsReady && <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground" id="adoption-segment-label">Show</span>
          <ToggleGroup type="single" variant="outline" value={segment} aria-labelledby="adoption-segment-label"
            onValueChange={(value) => { if (value) setSegment(value as typeof segment); }}>
            <ToggleGroupItem value="all">All accounts</ToggleGroupItem>
            <ToggleGroupItem value="founder">Founders</ToggleGroupItem>
            <ToggleGroupItem value="builder">Builders</ToggleGroupItem>
          </ToggleGroup>
          {segment !== 'all' && <span className="text-sm text-muted-foreground">Every figure below covers {segment === 'founder' ? 'founder' : 'builder'} accounts only.</span>}
        </div>}

        <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Active accounts, last 7 days" value={data.summary.activeAccounts7d} hint={`${data.summary.activeAccounts30d} in the last 30 days`} />
          <Stat label="New accounts, last 30 days" value={data.summary.newAccounts30d} hint="Sign-ups, from the database" />
          <Stat label="Activated within 7 days" value={share(data.summary.newAccountsActivated30d, data.summary.newAccounts30d)} hint="New accounts that did something real in their first week: a result, message, booking, post or completed task" />
          <Stat label="Came back in week 2" value={share(totals.week1.value, totals.week1.accounts)} hint={`Active 7 to 13 days after signing up, last ${WEEKS} weeks of cohorts`} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Founders and Builders</CardTitle>
            <CardDescription>
              The two primary segments side by side, whatever the filter above. Founders already have a project; Builders are starting from scratch.
              {comparison ? <> Builders who moved to Founder at a milestone: <span className="font-medium text-foreground">{founders.data?.summary.builderToFounder ?? 0}</span>.</> : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {comparison ? <Table>
              <TableHeader><TableRow>
                <TableHead>Measure</TableHead>
                <TableHead className="text-right">Founders</TableHead>
                <TableHead className="text-right">Builders</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {comparison.map((row) => <TableRow key={row.label}>
                  <TableCell>
                    <span className="font-medium">{row.label}</span>
                    <span className="block text-xs text-muted-foreground">{row.hint}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.founder}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.builder}</TableCell>
                </TableRow>)}
              </TableBody>
            </Table> : founders.isPending || builders.isPending
              ? <p role="status" className="text-sm text-muted-foreground">Loading the segment comparison…</p>
              : <p className="text-sm text-muted-foreground">The comparison needs the 20261014130000_adoption_by_segment migration. Run it and reload.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Sections</CardTitle>
              <CardDescription>
                Last 30 days, in accounts, in sidebar order. Visited: opened any page of the section. Engaged: did something there, such as a saved result, message, booking, post or completed task (in Content, read on two or more days). Open a section to see its tools.
                {leader ? <> Most engaged section: <span className="font-medium text-foreground">{leader.section}</span>.</> : null}
              </CardDescription>
              {consent ? <p className="text-sm text-muted-foreground">
                Time spent: active time from accounts that accepted analytics.{' '}
                <span className="font-medium text-foreground">{share(consent.granted, data.summary.activeAccounts30d)}</span> active accounts accepted,{' '}
                {consent.denied} rejected and {consent.unknown} have no choice saved yet; {consent.timed} {consent.timed === 1 ? 'has' : 'have'} time recorded.
              </p> : <p className="text-sm text-muted-foreground">Time spent needs the 20261013120000_consent_and_section_time migration.</p>}
            </div>
            <button type="button" onClick={() => setOpen(allOpen ? new Set() : new Set(data.sections.map((section) => section.section)))}
              className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline">
              {allOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Section</TableHead>
                <TableHead className="text-right">Visited</TableHead>
                <TableHead className="text-right">Engaged</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                {consent && <TableHead className="text-right">Time spent</TableHead>}
                <TableHead className="text-right">Engaged, ever</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.sections.map((section) => {
                  const expanded = open.has(section.section);
                  return <Fragment key={section.section}>
                    <TableRow className="bg-muted/20">
                      <TableCell className="font-semibold">
                        <button type="button" onClick={() => toggle(section.section)} aria-expanded={expanded}
                          className="inline-flex items-center gap-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-90')} aria-hidden="true" />
                          {section.section}
                        </button>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{section.visited30d}</TableCell>
                      <TableCell className="text-right font-semibold">{section.engaged30d}</TableCell>
                      <TableCell className="text-right font-semibold">{section.actions30d}</TableCell>
                      {consent && <TimeCell stat={section} strong />}
                      <TableCell className="text-right font-semibold">{section.engagedEver}</TableCell>
                    </TableRow>
                    {expanded && section.tools.map((tool) => <TableRow key={`${section.section}-${tool.tool}`} className="text-muted-foreground">
                      <TableCell className="pl-10">{tool.tool}</TableCell>
                      <TableCell className="text-right">{tool.visited30d}</TableCell>
                      <TableCell className="text-right">{tool.engaged30d}</TableCell>
                      <TableCell className="text-right">{tool.actions30d}</TableCell>
                      {consent && <TimeCell stat={tool} />}
                      <TableCell className="text-right">{tool.engagedEver}</TableCell>
                    </TableRow>)}
                  </Fragment>;
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly activity</CardTitle>
            <CardDescription>Accounts active each week (any section visit or action), with new sign-ups and accounts that did something real.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Week of</TableHead>
                <TableHead className="w-1/2">Active accounts</TableHead>
                <TableHead className="text-right">New accounts</TableHead>
                <TableHead className="text-right">Did something</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.weekly.map((week) => <TableRow key={week.week}>
                  <TableCell>{formatWeek(week.week)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${(week.activeAccounts / maxActive) * 100}%`, minWidth: week.activeAccounts ? '0.5rem' : 0 }} aria-hidden="true" />
                      <span className="text-sm tabular-nums">{week.activeAccounts}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{week.newAccounts}</TableCell>
                  <TableCell className="text-right">{week.accountsWithResult}</TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New-account cohorts</CardTitle>
            <CardDescription>Accounts by sign-up week: who did something real in their first 7 days, and who was active again in week 2 (days 7 to 13) and week 5 (days 28 to 34). A dash means the window has not passed yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Signed up week of</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
                <TableHead className="text-right">Activated in 7 days</TableHead>
                <TableHead className="text-right">Back in week 2</TableHead>
                <TableHead className="text-right">Back in week 5</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.cohorts.map((cohort) => <TableRow key={cohort.week}>
                  <TableCell>{formatWeek(cohort.week)}</TableCell>
                  <TableCell className="text-right">{cohort.accounts}</TableCell>
                  <TableCell className="text-right">{cohort.activated7d ?? '–'}</TableCell>
                  <TableCell className="text-right">{cohort.activeWeek1 ?? '–'}</TableCell>
                  <TableCell className="text-right">{cohort.activeWeek4 ?? '–'}</TableCell>
                </TableRow>)}
                <TableRow className="font-medium">
                  <TableCell>All finished cohorts</TableCell>
                  <TableCell />
                  <TableCell className="text-right">{share(totals.activated.value, totals.activated.accounts)}</TableCell>
                  <TableCell className="text-right">{share(totals.week1.value, totals.week1.accounts)}</TableCell>
                  <TableCell className="text-right">{share(totals.week4.value, totals.week4.accounts)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Section visits are recorded from 9 October 2026 (tool visits from 4 September), so visits before then are undercounted; actions count from the start.
          Section totals include pages that are no sidebar tool, such as Messages, so they can exceed the sum of their tools.
          Founder and Builder labels that were not chosen are inferred from older data until the account answers the workspace question, so read the comparison against how many chose.
          Time spent counts from October 2026, only for accounts that accepted analytics, and only while the tab is visible with input in the last minute; read it against how many accounts it covers.
          At these volumes, read the numbers as direction rather than statistics.
        </p>
      </div>}
    </ToolPageShell>
  </>;
}
