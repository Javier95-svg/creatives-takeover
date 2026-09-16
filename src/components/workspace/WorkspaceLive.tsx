import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronRight, FileText, LogOut, MessageCircle, UserPlus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { NotificationBell } from '@/components/community/NotificationBell';
import { CreditDisplay } from '@/components/CreditDisplay';
import ThemeToggle from '@/components/ThemeToggle';
import WorkspaceProfileAvatarLive from '@/components/WorkspaceProfileAvatarLive';
import WorkspaceAccountSearchLive from '@/components/WorkspaceAccountSearchLive';
import WorkspaceUpdatesSession from '@/components/WorkspaceUpdatesSession';
import { platformUpdates, PLATFORM_UPDATE_TYPES } from '@/lib/workspacePolicy';
import WorkspaceLayout from './WorkspaceLayout';

function LatestUpdates() {
  const { user } = useAuth();
  // Read the existing notification source without mounting a second toast subscription.
  const { data = [] } = useQuery({ queryKey: ['workspace-platform-updates', user?.id], enabled: Boolean(user), refetchInterval: 60000,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.schema('public').from('community_notifications').select('id, notification_type, created_at, metadata')
        .eq('user_id', user!.id).in('notification_type', PLATFORM_UPDATE_TYPES)
        .order('created_at', { ascending: false }).limit(50).abortSignal(signal);
      if (error) throw error;
      return data ?? [];
    },
  });
  const updates = platformUpdates(data);
  const [index, setIndex] = useState(0);
  const current = index % Math.max(1, updates.length);
  const update = updates[current];
  if (!update) return null;
  return <WorkspaceUpdatesSession>{dismiss => <section aria-label="Latest platform update" className="my-2 rounded-xl border border-border/60 bg-muted/20 p-3">
    <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-medium">{update.section}</span><div className="flex items-center gap-1"><span className="text-xs">{current + 1}/{updates.length}</span><button aria-label="Next notification" onClick={() => setIndex(current + 1)} className="rounded p-1 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button><button aria-label="Dismiss notification card" onClick={dismiss} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button></div></div>
    <Link to={update.route} className="flex items-start gap-2 rounded text-xs focus-visible:outline focus-visible:outline-primary"><FileText className="h-4 w-4 shrink-0 text-primary" /><span><span className="block font-medium">{update.title}</span><span className="mt-1 block leading-5">{update.detail}</span></span></Link>
  </section>}</WorkspaceUpdatesSession>;
}

export default function WorkspaceLive({ children, home }: { children: ReactNode; home: boolean }) {
  const { user, signOut } = useAuth();
  const { subscriptionData, loading: planLoading, statusError } = useSubscription({ fetchTiers: false, strictStatus: true });
  const profile = useQuery({ queryKey: ['workspace-account', user!.id], queryFn: async ({ signal }) => {
    const { data, error } = await supabase.schema('public').from('profiles').select('username, full_name').eq('id', user!.id).abortSignal(signal).maybeSingle();
    if (error) throw error;
    return data;
  } });
  const username = profile.data?.username || profile.data?.full_name || (profile.isPending ? 'Loading account…' : 'My account');
  const tier = statusError ? null : subscriptionData?.subscription_tier;
  const plan = planLoading ? 'Loading plan…' : tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Plan unavailable';
  return <WorkspaceLayout home={home} account={{ username, plan }} profileHref={profile.data?.username ? `/profile/${encodeURIComponent(profile.data.username)}` : '/account'}
    avatar={<WorkspaceProfileAvatarLive />} updates={<LatestUpdates />} search={<WorkspaceAccountSearchLive />} credits={<CreditDisplay compact showPurchaseButton />} theme={<ThemeToggle />}
    signOut={<button aria-label="Sign out" title="Sign out" className="workspace-icon-button" onClick={() => void signOut()}><LogOut className="h-4 w-4" /></button>}
    utilities={<><Link to="/dashboard/referral" aria-label="Invite people" title="Invite people" className="workspace-icon-button"><UserPlus /></Link><Link to="/messages" aria-label="Messages" title="Messages" className="workspace-icon-button"><MessageCircle /></Link><NotificationBell /></>}>
    {children}
  </WorkspaceLayout>;
}
