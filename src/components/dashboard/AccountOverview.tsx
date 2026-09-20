import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountContext } from '@/hooks/useAccountContext';
import { useAccountHomeDigest } from '@/hooks/useAccountHomeDigest';
import { USER_TYPE_LABEL, type UserType } from '@/lib/accountTypes';
import { personaFocus, personaHome } from '@/lib/personaHome';
import { getEntityAnalytics } from '@/services/accountFeatures';

/**
 * The dashboard Overview for a mentor, marketplace member or investor.
 *
 * The founder Overview is a journey cockpit: stage intelligence, an activation
 * chain, a focus editor. None of that describes what these three do here, and
 * showing it to them was the loudest remaining sign that the product was built
 * for somebody else.
 */

function Stat({ label, value, to }: { label: string; value: number | string; to?: string }) {
  const body = <CardContent className="py-5">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
  </CardContent>;
  return to
    ? <Card className="transition-colors hover:border-primary/40"><Link to={to} className="block">{body}</Link></Card>
    : <Card>{body}</Card>;
}

const STAT_LABELS: Partial<Record<UserType, { key: string; label: string; to: string }[]>> = {
  mentor: [
    { key: 'pendingRequests', label: 'Waiting on you', to: '/mentor/bookings' },
    { key: 'newSaves', label: 'Saved your profile', to: '/account/analytics' },
  ],
  marketplace: [
    { key: 'newEnquiries', label: 'New enquiries', to: '/marketplace/enquiries' },
  ],
  investor: [
    { key: 'newMatches', label: 'New matches', to: '/investors/matches' },
  ],
};

export default function AccountOverview() {
  const { user } = useAuth();
  const { userType, awaitingReview, hasCategoryAccess } = useAccountContext();
  const { digest } = useAccountHomeDigest();
  const persona = personaHome(userType);

  const analytics = useQuery({
    queryKey: ['entity-analytics', user?.id],
    enabled: Boolean(user?.id) && hasCategoryAccess,
    queryFn: () => getEntityAnalytics(30),
  });

  if (!persona) return null;
  const focus = personaFocus(persona, digest, awaitingReview);
  const stats = STAT_LABELS[userType] ?? [];

  return <>
    <Helmet><title>Dashboard — Creatives Takeover</title></Helmet>

    <header className="mb-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-headline-lg font-semibold">{persona.headline[0]}</h1>
        <Badge variant="secondary">{USER_TYPE_LABEL[userType]}</Badge>
      </div>
      <p className="mt-2 text-body text-muted-foreground">{persona.headline[1]}</p>
    </header>

    {awaitingReview && <Card className="mb-8 border-primary/30 bg-primary/5">
      <CardContent className="py-5">
        <p className="text-sm font-medium">Your request is under review.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything below opens as soon as it is approved. We will email you either way.
        </p>
      </CardContent>
    </Card>}

    {!awaitingReview && <>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => <Stat key={stat.key} label={stat.label} value={digest[stat.key] ?? 0} to={stat.to} />)}
        <Stat label="Profile views, 30 days" value={analytics.data?.totalViews ?? 0} to="/account/analytics" />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">What needs you</h2>
        {focus.length === 0
          ? <p className="text-sm text-muted-foreground">{persona.emptyFocus}</p>
          : <div className="space-y-3">
              {focus.map((item) => (
                <Card key={item.id} className="transition-colors hover:border-primary/40">
                  <Link to={item.route} className="flex items-center justify-between gap-3 px-5 py-4">
                    <span className="min-w-0 truncate text-sm font-medium">{item.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </Card>
              ))}
            </div>}
      </section>
    </>}

    <section className="mt-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Shortcuts</h2>
      <div className="flex flex-wrap gap-2">
        {persona.shortcuts.map((shortcut) => (
          <Link key={shortcut.route} to={shortcut.route}
            className="rounded-full border border-border/60 bg-card/60 px-4 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-accent">
            {shortcut.label}
          </Link>
        ))}
      </div>
    </section>
  </>;
}
