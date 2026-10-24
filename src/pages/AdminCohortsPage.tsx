import { useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Copy, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import ProgramDashboard from '@/components/cohort/ProgramDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cohortInviteUrl, cohortTotalWeeks, generateInviteCode } from '@/lib/cohorts';

type CohortRow = {
  id: string;
  cohort_name: string;
  program_name: string | null;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
  member_count: number | null;
  join_code: string | null;
  staff_code: string | null;
  weekly_checkin_day: string | null;
  pilot_plan: 'starter' | 'rising' | 'pro' | null;
};

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// The plan founders get for the cohort dates (cohort_pilot_plan_v1). Rising
// opens First Customer Proof, the pilot's 30-day demand test.
const PILOT_PLANS = [
  { value: 'none', label: 'Their own plan' },
  { value: 'starter', label: 'Starter' },
  { value: 'rising', label: 'Rising' },
  { value: 'pro', label: 'Pro' },
];
const pilotPlanValue = (value: string) => (value === 'none' ? null : value);
const todayIso = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const copy = async (text: string, what: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied.`);
  } catch {
    toast.error(`Copy failed. The link is ${text}`);
  }
};

/** /admin/cohorts: create program cohorts and hand out their invite links. */
export default function AdminCohortsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [programName, setProgramName] = useState('');
  const [cohortName, setCohortName] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(addDays(todayIso(), 29));
  const [checkinDay, setCheckinDay] = useState('monday');
  const [pilotPlan, setPilotPlan] = useState('rising');

  const cohorts = useQuery({
    queryKey: ['admin-cohorts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('launch_cohorts')
        .select('id,cohort_name,program_name,start_date,end_date,status,member_count,join_code,staff_code,weekly_checkin_day,pilot_plan')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CohortRow[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const joinCode = generateInviteCode();
      let staffCode = generateInviteCode();
      while (staffCode === joinCode) staffCode = generateInviteCode();
      const { error } = await (supabase as any).from('launch_cohorts').insert({
        cohort_name: cohortName.trim(),
        program_name: programName.trim() || null,
        cohort_type: 'validate',
        start_date: startDate,
        end_date: endDate,
        weekly_checkin_day: checkinDay,
        status: startDate <= todayIso() ? 'active' : 'upcoming',
        join_code: joinCode,
        staff_code: staffCode,
        pilot_plan: pilotPlanValue(pilotPlan),
        created_by: user?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cohort created. Copy the invite links below.');
      setProgramName('');
      setCohortName('');
      void queryClient.invalidateQueries({ queryKey: ['admin-cohorts'] });
    },
    onError: (error: Error) => toast.error(error.message || 'We couldn’t create the cohort.'),
  });

  const update = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<Pick<CohortRow, 'status' | 'pilot_plan' | 'join_code' | 'staff_code'>> }) => {
      const { error } = await (supabase as any).from('launch_cohorts').update({ ...changes, updated_at: new Date().toISOString() } as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-cohorts'] }),
    onError: () => toast.error('We couldn’t update the cohort.'),
  });

  // After a pilot, new links stop old ones from letting anyone else in.
  const rotateLinks = (id: string) => {
    const joinCode = generateInviteCode();
    let staffCode = generateInviteCode();
    while (staffCode === joinCode) staffCode = generateInviteCode();
    update.mutate({ id, changes: { join_code: joinCode, staff_code: staffCode } }, {
      onSuccess: () => toast.success('New invite links made. The old ones no longer work.'),
    });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!cohortName.trim()) return toast.error('Give the cohort a name.');
    if (endDate < startDate) return toast.error('The end date must be after the start date.');
    create.mutate();
  };

  const origin = window.location.origin;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Helmet><title>Cohorts — Admin</title></Helmet>
      <h1 className="font-space-grotesk text-3xl font-semibold tracking-tight text-foreground">Program cohorts</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Create a cohort for a program, then send the founder link to its founders and the staff link to its program managers.
        Founders open their dashboard in cohort mode; staff open the program dashboard.
      </p>

      <Card className="mt-8 border-border/60 bg-card/70">
        <CardContent className="p-5 sm:p-6">
          <h2 className="font-space-grotesk text-lg font-semibold text-foreground">New cohort</h2>
          <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1.5 xl:col-span-1">
              <Label htmlFor="cohort-program">Program</Label>
              <Input id="cohort-program" placeholder="e.g. UTEC Ventures" value={programName} onChange={(e) => setProgramName(e.target.value)} />
            </div>
            <div className="space-y-1.5 xl:col-span-1">
              <Label htmlFor="cohort-name">Cohort name *</Label>
              <Input id="cohort-name" placeholder="e.g. Validation pilot, spring" value={cohortName} onChange={(e) => setCohortName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cohort-start">Starts</Label>
              <Input id="cohort-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cohort-end">Ends</Label>
              <Input id="cohort-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cohort-day">Check-in day</Label>
              <Select value={checkinDay} onValueChange={setCheckinDay}>
                <SelectTrigger id="cohort-day"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((day) => (
                    <SelectItem key={day} value={day}>{day.charAt(0).toUpperCase() + day.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cohort-pilot-plan">Founders’ plan</Label>
              <Select value={pilotPlan} onValueChange={setPilotPlan}>
                <SelectTrigger id="cohort-pilot-plan"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PILOT_PLANS.map((plan) => (
                    <SelectItem key={plan.value} value={plan.value}>{plan.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground md:col-span-2 xl:col-span-6">
              Founders get this plan from the start date to the end date, then return to their own plan. Rising opens First Customer Proof, the pilot’s demand test. It doesn’t add credits.
            </p>
            <div className="md:col-span-2 xl:col-span-6">
              <Button type="submit" disabled={create.isPending} className="gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {create.isPending ? 'Creating…' : `Create cohort (${cohortTotalWeeks(startDate, endDate >= startDate ? endDate : startDate)} weeks)`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 space-y-4">
        {cohorts.isLoading ? <Skeleton className="h-40 rounded-xl" /> : null}
        {cohorts.isError ? (
          <p className="text-sm text-destructive">We couldn’t load cohorts. The cohort mode migration may not be applied yet.</p>
        ) : null}
        {cohorts.data?.length === 0 ? <p className="text-sm text-muted-foreground">No cohorts yet.</p> : null}
        {cohorts.data?.map((cohort) => (
          <Card key={cohort.id} className="border-border/60 bg-card/70">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{cohort.program_name ? `${cohort.program_name} · ` : ''}{cohort.cohort_name}</p>
                  <Badge variant="secondary" className="rounded-full capitalize">{cohort.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {cohort.start_date} → {cohort.end_date} · {cohort.member_count ?? 0} founders · check-ins on {cohort.weekly_checkin_day ?? 'monday'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={cohort.pilot_plan ?? 'none'}
                  onValueChange={(value) => update.mutate({ id: cohort.id, changes: { pilot_plan: pilotPlanValue(value) as CohortRow['pilot_plan'] } })}
                >
                  <SelectTrigger className="h-9 w-40" aria-label={`Founders’ plan for ${cohort.cohort_name}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PILOT_PLANS.map((plan) => (
                      <SelectItem key={plan.value} value={plan.value}>{plan.value === 'none' ? plan.label : `${plan.label} for the pilot`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {cohort.join_code ? (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copy(cohortInviteUrl(origin, cohort.join_code as string), 'Founder invite link')}>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Founder link
                  </Button>
                ) : null}
                {cohort.staff_code ? (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copy(cohortInviteUrl(origin, cohort.staff_code as string), 'Staff invite link')}>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" /> Staff link
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => rotateLinks(cohort.id)}>
                  New links
                </Button>
                {cohort.status !== 'completed' ? (
                  <Button variant="ghost" size="sm" onClick={() => update.mutate({ id: cohort.id, changes: { status: 'completed' } })}>
                    Mark completed
                  </Button>
                ) : null}
                <Button asChild size="sm" className="gap-1.5">
                  <Link to={`/admin/cohorts/${cohort.id}`}>Open dashboard <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** /admin/cohorts/:cohortId: the same program dashboard staff see, for our team. */
export function AdminCohortDetailPage() {
  const { cohortId = '' } = useParams();
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Helmet><title>Cohort dashboard — Admin</title></Helmet>
      <Button asChild variant="ghost" size="sm" className="mb-4 gap-1.5">
        <Link to="/admin/cohorts"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> All cohorts</Link>
      </Button>
      <ProgramDashboard cohortId={cohortId} />
    </div>
  );
}
