import { ArrowRight, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';

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

/** Product announcements: one quiet line each, below the founder's own work. */
export default function PlatformUpdates() {
  return (
    <section aria-label="What's new" className="space-y-1">
      {PLATFORM_UPDATES.map((update) => (
        <p key={update.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground" title={update.description}>
          <Megaphone className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium text-foreground">What's new:</span>
          <span>{update.title}</span>
          <Link
            to={update.route}
            onClick={() => captureEvent('dashboard_platform_update_opened', { update_id: update.id })}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            {update.cta}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </p>
      ))}
    </section>
  );
}
