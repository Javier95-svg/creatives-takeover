import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, FileText, Gift, Repeat2, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardPanelHeader } from '@/components/dashboard/DashboardPanel';
import { useFounderCommandSignals } from '@/hooks/useFounderCommandSignals';
import { cn } from '@/lib/utils';

const TAB_COPY: Record<string, {
  icon: typeof FileText;
  label: string;
  title: string;
  body: string;
  help: string;
}> = {
  '/dashboard/files': {
    icon: FileText,
    label: 'Files',
    title: 'Find and open founder artifacts.',
    body: 'Upload, preview, and manage the documents that support your business work.',
    help: 'Use Files for saved ICP drafts, uploaded decks, notes, and source documents. Daily action planning belongs in Tasks.',
  },
  '/dashboard/tasks': {
    icon: Target,
    label: 'Tasks',
    title: 'Decide what gets done next.',
    body: 'Use the calendar and selected-day panel to complete, reschedule, or reject work.',
    help: 'Tasks are for one-off work, deadlines, and platform recommendations. Recurring habits belong in Routine.',
  },
  '/dashboard/routine': {
    icon: Repeat2,
    label: 'Routine',
    title: 'Keep the founder rhythm moving.',
    body: 'Finish today’s habits, then tune weekly commitments when needed.',
    help: 'Routine is for repeatable behavior. Settings, reminders, templates, and history are tucked away until you need them.',
  },
  '/dashboard/referral': {
    icon: Gift,
    label: 'Referrals',
    title: 'Share your link and track rewards.',
    body: 'Copy the referral link, watch reward progress, and inspect history only when needed.',
    help: 'Referral work is strongest once your product foundation is clear enough to share with other founders.',
  },
};

export function DashboardCommandSignalStrip() {
  const [helpOpen, setHelpOpen] = useState(false);
  const { pathname } = useLocation();
  const {
    completedFoundationCount,
    currentStage,
    foundationalMilestones,
    hasProductFoundation,
    incompleteFoundations,
    isLoading,
  } = useFounderCommandSignals();
  const copy = TAB_COPY[pathname];

  if (!copy) return null;
  if (isLoading) return <Skeleton className="mb-5 h-20 rounded-xl" />;

  const Icon = copy.icon;
  const nextFoundation = incompleteFoundations[0];
  const statusLabel = pathname === '/dashboard/referral'
    ? hasProductFoundation ? 'Foundation ready' : 'Foundation pending'
    : `Stage ${currentStage}`;

  return (
    <section className="mb-5 rounded-xl border border-border/70 bg-card/75 p-4 shadow-sm">
      <DashboardPanelHeader
        as="h1"
        size="page"
        kicker={copy.label}
        title={copy.title}
        description={copy.body}
        badges={
          <>
            <Badge variant="secondary" className="gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {statusLabel}
            </Badge>
            <Badge variant="outline">
              {completedFoundationCount}/{foundationalMilestones.length} setup
            </Badge>
          </>
        }
        action={
          <>
            {nextFoundation ? (
              <Button asChild variant="outline" size="sm">
                <Link to={nextFoundation.route}>
                  Setup: {nextFoundation.title}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
            <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm">
                  What belongs here?
                  <ChevronDown
                    className={cn('ml-1.5 h-3.5 w-3.5 transition-transform', helpOpen && 'rotate-180')}
                    aria-hidden="true"
                  />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </>
        }
      />

      <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
        <CollapsibleContent>
          <div className="mt-4 rounded-lg border border-border/60 bg-background/60 p-3 text-sm leading-6 text-muted-foreground">
            {copy.help}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
