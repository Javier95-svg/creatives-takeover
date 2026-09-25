import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountContext } from '@/hooks/useAccountContext';
import { BIZMAP_STAGE_ORDER } from '@/lib/bizmapStageOrder';
import { trackRetentionEvent } from '@/lib/retentionSystem';
import { listInvestorMatches } from '@/services/accountFeatures';

function stageLabel(stage: number | null) {
  if (!stage || stage < 1 || stage > BIZMAP_STAGE_ORDER.length) return null;
  const key = BIZMAP_STAGE_ORDER[stage - 1];
  return `Stage ${stage} · ${key.charAt(0)}${key.slice(1).toLowerCase()}`;
}

/**
 * Founders whose sectors overlap what this investor backs.
 *
 * The RPC returns profile and project fields only. No email address is in the
 * payload, by design: an investor browsing the network is not the same thing as
 * an investor being handed everyone's contact details.
 */
export default function InvestorMatches() {
  const { user } = useAuth();
  const { userType, hasCategoryAccess } = useAccountContext();
  const eligible = Boolean(user?.id) && userType === 'investor' && hasCategoryAccess;
  const matches = useQuery({ queryKey: ['investor-matches', user?.id], enabled: eligible, queryFn: listInvestorMatches });
  const rows = matches.data ?? [];

  return <>
    <SEO title="My matches" description="Founders matching the sectors and stages you back." url="/investors/matches" noindex />
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-header-offset nav-offset-roomy pb-16">
        <header className="mb-8">
          <h1 className="flex items-center gap-2 text-headline-lg font-semibold"><Sparkles className="h-6 w-6 text-primary" />My matches</h1>
          <p className="mt-2 text-body text-muted-foreground">Projects shared by founders and builders that match your sectors and declared funding stages. Geography and check range are profile preferences for evaluating a match.</p>
        </header>

        {!eligible && <p className="text-sm text-muted-foreground">
          {userType === 'investor' ? 'Your investor request is still under review. Matches open once it is approved.' : 'This page is for investor accounts.'}
        </p>}
        {matches.isError && <p role="alert" className="text-sm text-destructive">
          Could not load your matches. <button className="underline" onClick={() => void matches.refetch()}>Retry</button>
        </p>}
        {matches.isSuccess && rows.length === 0 && <p className="text-sm text-muted-foreground">No matches yet. Widen your sectors, or check back as founders join.</p>}

        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => {
            const name = row.name || row.username || 'A founder';
            const stage = row.investmentStage || stageLabel(row.stage);
            return <Card key={row.userId}>
              <CardContent className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-medium">
                    {row.username
                      ? <Link className="underline-offset-4 hover:underline" to={`/profile/${encodeURIComponent(row.username)}`}>{name}</Link>
                      : name}
                  </p>
                  {stage && <Badge variant="outline" className="shrink-0">{stage}</Badge>}
                </div>
                {row.projectTitle && <p className="mt-2 font-space-grotesk text-sm font-semibold">{row.projectTitle}</p>}
                {row.projectSummary && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{row.projectSummary}</p>}
                {row.sectors && row.sectors.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">
                  {row.sectors.slice(0, 4).map((sector) => <Badge key={sector} variant="secondary" className="text-xs">{sector}</Badge>)}
                </div>}
                {row.username && <p className="mt-3 text-sm">
                  <Link className="text-primary underline-offset-4 hover:underline" onClick={() => void trackRetentionEvent('investor_match_opened', { user_id: user?.id, user_type: 'investor' })} to={`/messages/${encodeURIComponent(row.username)}`}>Send a message</Link>
                </p>}
              </CardContent>
            </Card>;
          })}
        </div>
      </main>
      <Footer />
    </div>
  </>;
}
