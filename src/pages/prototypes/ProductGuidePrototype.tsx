import { useState, type ReactNode } from 'react';
import { Bell, MessageCircle, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import WorkspaceLayout from '@/components/workspace/WorkspaceLayout';
import WorkspaceAccountSearch from '@/components/WorkspaceAccountSearch';
import { ProfilePhoto } from '@/components/WorkspaceProfileAvatar';
import ThemeToggle from '@/components/ThemeToggle';
import PulseHome from '@/components/pulse/PulseHome';
import { PreviewCreditMenu } from './PreviewCreditMenu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { PulseHomeConcept } from '@/lib/pulseHome';

// Review-only fixtures. Production renders WorkspaceLive, never this adapter.
function PreviewUtilities() {
  const [open, setOpen] = useState(false);
  return <><Link to="/dashboard/referral" aria-label="Invite people" className="workspace-icon-button"><UserPlus /></Link>
    <Link to="/messages" aria-label="Messages" className="workspace-icon-button"><MessageCircle /></Link>
    <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button aria-label="Notifications" className="workspace-icon-button"><Bell /></button></PopoverTrigger><PopoverContent><p className="text-sm">Design preview — live notifications appear after sign-in.</p></PopoverContent></Popover>
  </>;
}
export default function ProductGuidePrototype({ concept, routePreview = false, children }: { concept: PulseHomeConcept; routePreview?: boolean; children?: ReactNode }) {
  return <WorkspaceLayout home={!routePreview} persistentPreviewNavigation account={{ username: 'javo95', plan: 'Pro' }} avatar={<ProfilePhoto initials="JA" />} profileHref="/account"
    search={<WorkspaceAccountSearch />} credits={<PreviewCreditMenu />} utilities={<PreviewUtilities />} theme={<ThemeToggle />}>
    {children ?? <PulseHome concept={concept} />}
  </WorkspaceLayout>;
}
