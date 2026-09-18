import { Bell, ChevronDown, Eye, MessageCircle, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PLATFORM_TOUR_FIXTURE } from '@/lib/platformTour/tourFixture';
import { useTourGate } from './PlatformTourGateContext';

/**
 * The header controls a signed-in founder actually has.
 *
 * An earlier version showed only the sample badge, which left the header
 * visibly emptier than the real product and undercut the one thing the tour is
 * for. These are the real controls in their real positions; each one opens the
 * signup prompt instead of doing its job.
 */
export function PlatformTourProjectChip() {
  const openGate = useTourGate();
  return <button type="button" onClick={() => openGate('project')}
    aria-label={`Active project: ${PLATFORM_TOUR_FIXTURE.project.name}. Switch project.`}
    className="flex max-w-[12rem] items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-foreground hover:bg-muted">
    <span className="truncate">{PLATFORM_TOUR_FIXTURE.project.name}</span>
    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
  </button>;
}

export function PlatformTourUtilities() {
  const openGate = useTourGate();
  return <>
    <div className="hidden lg:block"><PlatformTourProjectChip /></div>
    <button type="button" aria-label="Connection requests" title="Connection requests"
      className="workspace-icon-button" onClick={() => openGate('inbox')}><UserPlus /></button>
    <button type="button" aria-label="Messages" title="Messages"
      className="workspace-icon-button" onClick={() => openGate('inbox')}><MessageCircle /></button>
    <button type="button" aria-label="Notifications" title="Notifications"
      className="workspace-icon-button" onClick={() => openGate('inbox')}><Bell /></button>
    <Badge variant="secondary" className="ml-1 hidden gap-1.5 whitespace-nowrap sm:inline-flex"
      title="Every name, number and result in this tour belongs to a sample founder. Nothing is saved.">
      <Eye aria-hidden="true" className="h-3.5 w-3.5" />
      Sample workspace
    </Badge>
  </>;
}
