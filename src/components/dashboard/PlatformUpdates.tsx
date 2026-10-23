import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { DASHBOARD_CARD, DashboardSectionTitle } from '@/components/dashboard/DashboardPanel';
import { captureEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

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

/** Product announcements, kept below the founder's own work. */
export default function PlatformUpdates() {
  return (
    <section className="mb-10" aria-labelledby="platform-updates-title">
      <DashboardSectionTitle id="platform-updates-title" title="What's new" />
      <div className="space-y-3">
        {PLATFORM_UPDATES.map((update) => (
          <div
            key={update.id}
            className={cn(DASHBOARD_CARD, 'flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6')}
          >
            <div className="min-w-0 max-w-3xl">
              <p className="text-xs font-medium text-muted-foreground">{update.badge}</p>
              <h3 className="mt-1 text-sm font-semibold text-foreground">{update.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{update.description}</p>
            </div>
            <Link
              to={update.route}
              onClick={() => captureEvent('dashboard_platform_update_opened', { update_id: update.id })}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {update.cta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
