import { useQuery } from '@tanstack/react-query';
import { Info, Loader2 } from 'lucide-react';

import SEO from '@/components/SEO';
import { ToolPageShell } from '@/components/tool-shell/ToolPageShell';
import TractionLogbookWallpaper, { TractionLogbookChart } from '@/components/wallpapers/TractionLogbookWallpaper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { cohortTotals, rankTools, share, toolLabel, type AdoptionMetrics } from '@/lib/adoptionMetrics';

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

/**
 * Product adoption for admins: who uses the product, which tools give people a
 * result, and whether new accounts come back. Reads admin_adoption_metrics(),
 * which checks the admin role itself and uses first-party data only, so it
 * covers every account regardless of cookie choices. Internal accounts excluded.
 */
export default function AdminAdoption() {
  const metrics = useQuery({
    queryKey: ['admin-adoption-metrics', WEEKS],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_adoption_metrics' as never, { p_weeks: WEEKS } as never);
      if (error) throw error;
      return data as unknown as AdoptionMetrics;
    },
  });

  const data = metrics.data;
  const totals = data ? cohortTotals(data.cohorts) : null;
  const maxActive = data ? Math.max(1, ...data.weekly.map((week) => week.activeAccounts)) : 1;

  return <>
    <SEO title="Adoption | Admin" description="Product adoption metrics" url="/admin/adoption" noindex />
    {/* Inside the workspace frame (sidebar and top bar), like the tools it measures. */}
    <ToolPageShell
      title="Product adoption"
      purpose="Who uses the product, which tools give people a result, and whether new accounts come back."
      context={<>Every account, whatever its cookie choice. Internal accounts excluded.{data ? ` Updated ${new Date(data.generatedAt).toLocaleString('en-GB')}.` : ''}</>}
      theme="traction"
      wallpaper={<TractionLogbookWallpaper />}
      headerArt={<TractionLogbookChart />}
    >

      {metrics.isPending && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading adoption metrics…</p>}
      {metrics.isError && <p role="alert" className="text-sm text-destructive">
        Could not load adoption metrics. {String((metrics.error as { message?: string })?.message ?? '')}
      </p>}

      {metrics.isSuccess && !data && <p className="text-sm text-muted-foreground">No adoption data returned. If the adoption migration has not been applied yet, run it and reload.</p>}

      {data && totals && <div className="space-y-8">
        <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Active accounts, last 7 days" value={data.summary.activeAccounts7d} hint={`${data.summary.activeAccounts30d} in the last 30 days`} />
          <Stat label="New accounts, last 30 days" value={data.summary.newAccounts30d} hint="Sign-ups, from the database" />
          <Stat label="Activated within 7 days" value={share(data.summary.newAccountsActivated30d, data.summary.newAccounts30d)} hint="New accounts that saved a result in any tool in their first week" />
          <Stat label="Came back in week 2" value={share(totals.week1.value, totals.week1.accounts)} hint={`Active 7 to 13 days after signing up, last ${WEEKS} weeks of cohorts`} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Tools</CardTitle>
            <CardDescription>Last 30 days, in accounts. Opened, then started (first input), then got a result saved by the tool.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tool</TableHead>
                <TableHead className="text-right">Opened</TableHead>
                <TableHead className="text-right">Started</TableHead>
                <TableHead className="text-right">Got a result</TableHead>
                <TableHead className="text-right">Results saved</TableHead>
                <TableHead className="text-right">Accounts with a result, ever</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rankTools(data.tools).map((tool) => <TableRow key={tool.tool}>
                  <TableCell className="font-medium">{toolLabel(tool.tool)}</TableCell>
                  <TableCell className="text-right">{tool.opened30d}</TableCell>
                  <TableCell className="text-right">{tool.started30d}</TableCell>
                  <TableCell className="text-right">{tool.withResult30d}</TableCell>
                  <TableCell className="text-right">{tool.results30d}</TableCell>
                  <TableCell className="text-right">{tool.withResultEver}</TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly activity</CardTitle>
            <CardDescription>Accounts active each week (any tool activity, saved result or tracked action), with new sign-ups and accounts that saved a result.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Week of</TableHead>
                <TableHead className="w-1/2">Active accounts</TableHead>
                <TableHead className="text-right">New accounts</TableHead>
                <TableHead className="text-right">Saved a result</TableHead>
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
            <CardDescription>Accounts by sign-up week: who saved a result in their first 7 days, and who was active again in week 2 (days 7 to 13) and week 5 (days 28 to 34). A dash means the window has not passed yet.</CardDescription>
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
          Tool opens and starts have been recorded since 4 September 2026, so activity before then is undercounted; saved results count from the start.
          At these volumes, read the numbers as direction rather than statistics.
        </p>
      </div>}
    </ToolPageShell>
  </>;
}
