import { useState, type ReactElement } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, Lock, Users } from 'lucide-react';

import Navigation from '@/components/Navigation';
import HomeWallpaper from '@/components/wallpapers/HomeWallpaper';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { COHORT_CONTEXT_QUERY_KEY } from '@/hooks/useCohortContext';

type Invite = {
  kind: 'member' | 'staff';
  cohortId: string;
  cohortName: string;
  programName: string | null;
  startDate: string;
  endDate: string;
  status: string;
  alreadyJoined: boolean;
};

// What a founder agrees to share by joining; mirrors cohort_dashboard_v1.
const SHARED = ['Your name and email', 'Your stage and completed tasks', 'Counts of assumptions, interviews, evidence, experiments and decisions', 'Your weekly check-ins'];
const PRIVATE = ['Your files and saved work', 'The details of your idea', 'Your messages'];

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * /join/:code: the invite link a program sends. Founder codes join the cohort
 * (sharing progress is the condition); staff codes open the program dashboard.
 */
export default function CohortJoinPage() {
  const { code = '' } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const invite = useQuery({
    queryKey: ['cohort-invite', code, user?.id ?? 'anon'],
    enabled: !authLoading,
    retry: false,
    queryFn: async (): Promise<Invite | null> => {
      const { data, error } = await supabase.rpc('cohort_invite_v1' as never, { p_code: code } as never);
      if (error) throw error;
      return (data as unknown as Invite) ?? null;
    },
  });

  const returnPath = `/join/${encodeURIComponent(code)}`;
  const isStaff = invite.data?.kind === 'staff';

  const join = async () => {
    setJoining(true);
    setJoinError(null);
    const { error } = await supabase.rpc('join_cohort_v1' as never, { p_code: code, p_share_progress: agreed } as never);
    setJoining(false);
    if (error) {
      setJoinError(error.message || 'We couldn’t add you to this cohort. Try again.');
      return;
    }
    captureEvent('cohort_joined', { kind: invite.data?.kind ?? 'member' });
    await queryClient.invalidateQueries({ queryKey: [COHORT_CONTEXT_QUERY_KEY] });
    navigate('/dashboard');
  };

  let body: ReactElement;
  if (authLoading || invite.isLoading) {
    body = <Skeleton className="h-72 w-full rounded-2xl" />;
  } else if (invite.isError || !invite.data) {
    body = (
      <div className="text-center">
        <h1 className="font-space-grotesk text-2xl font-semibold text-foreground">This invite link isn’t active</h1>
        <p className="mt-3 text-muted-foreground">Check the link with your program, or ask them to send a new one.</p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/">Go to Creatives Takeover</Link>
        </Button>
      </div>
    );
  } else {
    const data = invite.data;
    body = (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {isStaff ? 'Program staff invitation' : 'Cohort invitation'}
        </p>
        <h1 className="mt-3 font-space-grotesk text-3xl font-semibold tracking-tight text-foreground">
          {data.programName || data.cohortName}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {data.programName ? (
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" aria-hidden="true" />{data.cohortName}</span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {formatDate(data.startDate)} – {formatDate(data.endDate)}
          </span>
        </p>

        {data.alreadyJoined ? (
          <div className="mt-8">
            <p className="text-foreground">You’re already in this cohort.</p>
            <Button className="mt-4" onClick={() => navigate('/dashboard')}>Go to your dashboard</Button>
          </div>
        ) : (
          <>
            {isStaff ? (
              <p className="mt-6 text-foreground">
                As program staff you’ll see every founder’s progress and weekly check-ins on your dashboard. You won’t see their files, ideas or messages.
              </p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="text-sm font-semibold text-foreground">Shared with your program</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    {SHARED.map((item) => (
                      <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="text-sm font-semibold text-foreground">Stays private</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                    {PRIVATE.map((item) => (
                      <li key={item} className="flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {user ? (
              <div className="mt-6 space-y-4">
                {!isStaff ? (
                  <label htmlFor="cohort-consent" className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
                    <Checkbox id="cohort-consent" checked={agreed} onCheckedChange={(value) => setAgreed(value === true)} className="mt-0.5" />
                    I agree to share my progress and weekly check-ins with {data.programName || 'this program'} and the Creatives Takeover team.
                    You can leave the cohort and stop sharing at any time from your dashboard.
                  </label>
                ) : null}
                {joinError ? <p className="text-sm text-destructive" role="alert">{joinError}</p> : null}
                <Button size="lg" className="w-full" disabled={joining || (!isStaff && !agreed)} onClick={join}>
                  {joining ? 'Joining…' : isStaff ? 'Join as program staff' : 'Join the cohort'}
                </Button>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <Button asChild size="lg" className="w-full">
                  <Link to={`/signup?return=${encodeURIComponent(returnPath)}`}>Create your free account to join</Link>
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link to={`/login?return=${encodeURIComponent(returnPath)}`} className="font-semibold text-primary hover:underline">Sign in</Link>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Join your cohort — Creatives Takeover</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <HomeWallpaper />
        <div className="relative z-10">
          <Navigation />
          <main className="container mx-auto flex justify-center px-4 pb-20 pt-32 sm:px-6">
            <div className="surface-panel trust-outline w-full max-w-2xl rounded-3xl p-6 sm:p-10">{body}</div>
          </main>
        </div>
      </div>
    </>
  );
}
