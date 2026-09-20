import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountContext } from '@/hooks/useAccountContext';
import { listEnquiries } from '@/services/accountFeatures';

/**
 * Who has contacted a marketplace member about their services.
 *
 * social_interaction_events is readable only by the actor, so the person being
 * contacted could not see their own enquiries at all until this RPC existed.
 */
export default function MarketplaceEnquiries() {
  const { user } = useAuth();
  const { userType, hasCategoryAccess } = useAccountContext();
  const eligible = Boolean(user?.id) && userType === 'marketplace' && hasCategoryAccess;
  const enquiries = useQuery({ queryKey: ['marketplace-enquiries', user?.id], enabled: eligible, queryFn: listEnquiries });
  const rows = enquiries.data ?? [];

  return <>
    <SEO title="Enquiries" description="People asking about your services." url="/marketplace/enquiries" noindex />
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-header-offset nav-offset-roomy pb-16">
        <header className="mb-8">
          <h1 className="flex items-center gap-2 text-headline-lg font-semibold"><Inbox className="h-6 w-6 text-primary" />Enquiries</h1>
          <p className="mt-2 text-body text-muted-foreground">People who have contacted you about what you offer.</p>
        </header>

        {!eligible && <p className="text-sm text-muted-foreground">
          {userType === 'marketplace' ? 'Your marketplace request is still under review. Enquiries open once it is approved.' : 'This page is for marketplace accounts.'}
        </p>}
        {enquiries.isError && <p role="alert" className="text-sm text-destructive">
          Could not load your enquiries. <button className="underline" onClick={() => void enquiries.refetch()}>Retry</button>
        </p>}
        {enquiries.isSuccess && rows.length === 0 && <p className="text-sm text-muted-foreground">No enquiries yet.</p>}

        <div className="space-y-3">
          {rows.map((row) => {
            const name = row.name || row.username || 'Someone';
            return <Card key={`${row.username}-${row.occurredAt}`}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {row.username
                      ? <Link className="underline-offset-4 hover:underline" to={`/profile/${encodeURIComponent(row.username)}`}>{name}</Link>
                      : name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{row.interaction ?? 'Got in touch'}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(row.occurredAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
              </CardContent>
            </Card>;
          })}
        </div>
      </main>
      <Footer />
    </div>
  </>;
}
