import { useState, type ReactElement } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Navigation from '@/components/Navigation';
import HomeWallpaper from '@/components/wallpapers/HomeWallpaper';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { COHORT_CONTEXT_QUERY_KEY } from '@/hooks/useCohortContext';
import { CohortInviteCard, type CohortInvite } from '@/components/cohort/CohortInviteCard';

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
    queryFn: async (): Promise<CohortInvite | null> => {
      const { data, error } = await supabase.rpc('cohort_invite_v1' as never, { p_code: code } as never);
      if (error) throw error;
      return (data as unknown as CohortInvite) ?? null;
    },
  });

  const returnPath = `/join/${encodeURIComponent(code)}`;

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
    body = (
      <CohortInviteCard
        invite={invite.data}
        signedIn={Boolean(user)}
        agreed={agreed}
        onAgreedChange={setAgreed}
        joining={joining}
        error={joinError}
        onJoin={() => void join()}
        onGoToDashboard={() => navigate('/dashboard')}
        signedOutActions={
          <div className="mt-6 space-y-3">
            <Button asChild size="lg" className="w-full">
              <Link to={`/signup?return=${encodeURIComponent(returnPath)}`}>Create your free account to join</Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to={`/login?return=${encodeURIComponent(returnPath)}`} className="font-semibold text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        }
      />
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
