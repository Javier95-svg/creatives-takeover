import { ArrowRight, Megaphone, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { captureEvent } from '@/lib/analytics';

const PLATFORM_UPDATES = [
  {
    id: 'stage-v-launch-workflow',
    badge: 'New workflow',
    title: 'Stage V launch is now simpler.',
    description: 'GTM Strategist now leads your customer-acquisition cycle, while Directories is back in the guided launch path. Use the Activate step to run the work, collect evidence, and decide what to do next.',
    route: '/go-to-market',
    cta: 'Open GTM Strategist',
  },
] as const;

/** A dedicated Command Center surface for product announcements and release updates. */
export default function PlatformUpdates() {
  return (
    <section className="mb-6" aria-labelledby="platform-updates-title">
      <div className="mb-3 flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 id="platform-updates-title" className="text-sm font-semibold">Platform updates</h2>
        <span className="text-xs text-muted-foreground">What’s new for founders</span>
      </div>
      <div className="space-y-3">
        {PLATFORM_UPDATES.map((update) => (
          <Card key={update.id} className="border-primary/25 bg-primary/5">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-3xl">
                <Badge variant="outline" className="gap-1.5"><Sparkles className="h-3 w-3" />{update.badge}</Badge>
                <h3 className="mt-3 text-lg font-semibold">{update.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{update.description}</p>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link
                  to={update.route}
                  onClick={() => captureEvent('dashboard_platform_update_opened', { update_id: update.id })}
                >
                  {update.cta} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
