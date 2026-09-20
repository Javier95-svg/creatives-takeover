import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountContext } from '@/hooks/useAccountContext';
import { getEntityAnalytics, getMentorInterest } from '@/services/accountFeatures';

function Stat({ label, value, note }: { label: string; value: number; note: string }) {
  return <Card>
    <CardContent className="py-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </CardContent>
  </Card>;
}

function Person({ name, username, at, detail }: { name: string | null; username: string | null; at: string; detail: string }) {
  const label = name || username || 'Someone';
  return <li className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2 last:border-0">
    <span className="min-w-0 truncate">
      {username ? <Link className="underline-offset-4 hover:underline" to={`/profile/${encodeURIComponent(username)}`}>{label}</Link> : label}
      <span className="ml-2 text-xs text-muted-foreground">{detail}</span>
    </span>
    <span className="shrink-0 text-xs text-muted-foreground">{new Date(at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
  </li>;
}

/**
 * Who has been looking at your profile or listing, for mentors and marketplace
 * members.
 *
 * Counts are deduplicated to one view per viewer per entity per day server
 * side. A number that a refresh could inflate would be worse than no number.
 */
export default function AccountAnalytics() {
  const { user } = useAuth();
  const { userType, hasCategoryAccess } = useAccountContext();
  const eligible = Boolean(user?.id) && hasCategoryAccess && (userType === 'mentor' || userType === 'marketplace' || userType === 'investor');

  const analytics = useQuery({ queryKey: ['entity-analytics', user?.id], enabled: eligible, queryFn: () => getEntityAnalytics(30) });
  const interest = useQuery({ queryKey: ['mentor-interest', user?.id], enabled: eligible && userType === 'mentor', queryFn: getMentorInterest });

  const saves = interest.data?.saves ?? [];
  const contacts = interest.data?.contacts ?? [];

  return <>
    <SEO title="Analytics" description="How many people viewed your profile." url="/account/analytics" noindex />
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-header-offset nav-offset-roomy pb-16">
        <header className="mb-8">
          <h1 className="flex items-center gap-2 text-headline-lg font-semibold"><BarChart3 className="h-6 w-6 text-primary" />Analytics</h1>
          <p className="mt-2 text-body text-muted-foreground">The last 30 days. One view per person per day, and your own visits are never counted.</p>
        </header>

        {!eligible && <p className="text-sm text-muted-foreground">
          {hasCategoryAccess ? 'This page is for mentor, marketplace and investor accounts.' : 'Your request is still under review. Analytics open once it is approved.'}
        </p>}
        {analytics.isError && <p role="alert" className="text-sm text-destructive">
          Could not load your analytics. <button className="underline" onClick={() => void analytics.refetch()}>Retry</button>
        </p>}

        {eligible && <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="Profile views" value={analytics.data?.totalViews ?? 0} note="Times your profile or listing was opened." />
          <Stat label="Unique visitors" value={analytics.data?.uniqueViewers ?? 0} note="Distinct people, not page loads." />
        </div>}

        {eligible && userType === 'mentor' && <section className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Who saved you</h2>
            {saves.length === 0
              ? <p className="text-sm text-muted-foreground">Nobody has saved your profile yet.</p>
              : <ul className="text-sm">{saves.map((save) => <Person key={`${save.username}-${save.savedAt}`} name={save.name} username={save.username} at={save.savedAt} detail="saved your profile" />)}</ul>}
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Who reached out</h2>
            {contacts.length === 0
              ? <p className="text-sm text-muted-foreground">No contacts yet.</p>
              : <ul className="text-sm">{contacts.map((contact) => <Person key={`${contact.username}-${contact.occurredAt}`} name={contact.name} username={contact.username} at={contact.occurredAt} detail={contact.interaction ?? 'got in touch'} />)}</ul>}
          </div>
        </section>}
      </main>
      <Footer />
    </div>
  </>;
}
