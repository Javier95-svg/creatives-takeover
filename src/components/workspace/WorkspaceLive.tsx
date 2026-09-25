import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useWorkspaceHeaderCounts } from '@/hooks/useWorkspaceHeaderCounts';
import ProjectSwitcher from '@/components/workspace/ProjectSwitcher';
import { ProjectSetupGate } from '@/components/workspace/ProjectSetupGate';
import { AccountReviewBanner } from '@/components/workspace/AccountReviewBanner';
import { useAccountContext } from '@/hooks/useAccountContext';
import { trackRetentionEvent } from '@/lib/retentionSystem';
import WorkspaceLayout from './WorkspaceLayout';

// Only pulled in once the header icon is used, so the modal and its social
// queries stay out of the chunk every workspace route loads.
const FriendRequestsModal = lazy(() => import('@/components/social/FriendRequestsModal')
  .then((module) => ({ default: module.FriendRequestsModal })));

/** Count badge for a header icon, matching the notification bell's treatment. */
function HeaderCountBadge({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return <span
    aria-label={`${count} ${label}`}
    className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium text-destructive-foreground"
  >{count > 9 ? '9+' : count}</span>;
}

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
  const { unreadMessages, connectionNotifications } = useWorkspaceHeaderCounts();
  const queryClient = useQueryClient();
  const [requestsOpen, setRequestsOpen] = useState(false);
  // Mount on first open and keep it mounted so the dialog can animate closed.
  const [requestsMounted, setRequestsMounted] = useState(false);
  const { subscriptionData, loading: planLoading, statusError } = useSubscription({ fetchTiers: false, strictStatus: true });
  const profile = useQuery({ queryKey: ['workspace-account', user!.id], queryFn: async ({ signal }) => {
    const { data, error } = await supabase.schema('public').from('profiles').select('username, full_name').eq('id', user!.id).abortSignal(signal).maybeSingle();
    if (error) throw error;
    return data;
  } });
  // Founder until the answer arrives, so no type specific nav flashes at anyone.
  const { userType, isLoading: accountLoading, isError: accountError, refresh: refreshAccount } = useAccountContext();
  const usesProject = userType === 'founder' || userType === 'builder';
  useEffect(() => {
    if (accountLoading || accountError || !user?.id) return;
    const key = `workspace-entered:${user.id}:${userType}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { /* storage unavailable */ }
    void trackRetentionEvent('workspace_entered', { user_id: user.id, user_type: userType, quiz_version: 2 });
  }, [accountLoading, accountError, user?.id, userType]);
  if (accountLoading) return <div role="status" className="p-8">Loading your workspace…</div>;
  if (accountError) return <div role="alert" className="p-8">Could not load your account details. <button className="underline" onClick={() => void refreshAccount()}>Retry</button></div>;
  const username = profile.data?.username || profile.data?.full_name || (profile.isPending ? 'Loading account…' : 'My account');
  const tier = statusError ? null : subscriptionData?.subscription_tier;
  const plan = planLoading ? 'Loading plan…' : tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Plan unavailable';
  return <WorkspaceLayout home={home} userType={userType} account={{ username, plan }} profileHref={profile.data?.username ? `/profile/${encodeURIComponent(profile.data.username)}` : '/account'}
    avatar={<WorkspaceProfileAvatarLive />} updates={<LatestUpdates />} search={<WorkspaceAccountSearchLive />} credits={<CreditDisplay compact showPurchaseButton />} theme={<ThemeToggle />}
    signOut={<button aria-label="Sign out" title="Sign out" className="workspace-icon-button" onClick={() => void signOut()}><LogOut className="h-4 w-4" /></button>}
    utilities={<>
      {/* Which project the founder is in decides what every tool writes to, so
          it belongs in the shell rather than on one page. */}
      {usesProject && <div className="hidden lg:block"><ProjectSwitcher /></div>}
      <button type="button" onClick={() => { setRequestsMounted(true); setRequestsOpen(true); }}
        aria-label={connectionNotifications > 0 ? `Connection requests, ${connectionNotifications} new` : 'Connection requests'}
        title="Connection requests" className="workspace-icon-button relative">
        <UserPlus /><HeaderCountBadge count={connectionNotifications} label="new connection notifications" />
      </button>
      {requestsMounted && <Suspense fallback={null}>
        <FriendRequestsModal open={requestsOpen} onOpenChange={(next) => {
          setRequestsOpen(next);
          // Accepting or declining changes the count, so refresh the badge on close.
          if (!next) void queryClient.invalidateQueries({ queryKey: ['workspace-header-counts', user?.id] });
        }} />
      </Suspense>}
      <Link to="/messages" aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages'}
        title="Messages" className="workspace-icon-button relative">
        <MessageCircle /><HeaderCountBadge count={unreadMessages} label="unread messages" />
      </Link>
      <NotificationBell />
    </>}>
    {/* Founders and builders without a project are asked for one here,
        because the shell is the one thing every workspace route renders. */}
    <ProjectSetupGate />
    {/* A reviewed account waiting on a decision is told so once, here, rather
        than left to wonder why its category features are empty. */}
    <AccountReviewBanner />
    {children}
  </WorkspaceLayout>;
}
