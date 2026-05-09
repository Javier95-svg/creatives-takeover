import { useEffect, useMemo, useRef } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { useRetentionFeed } from '@/hooks/useRetentionFeed';
import { useUnifiedTasks } from '@/hooks/useUnifiedTasks';
import { useWeeklyMission } from '@/hooks/decision-engine/useWeeklyMission';
import { BIZMAP_STAGES, type BizMapStage } from '@/lib/bizmapStages';

export type FounderFeedLayer = 'platform' | 'founder';

export type FounderFeedCardKind =
  | 'comeback'
  | 'task'
  | 'routine'
  | 'focus_funnel'
  | 'recommendation'
  | 'retention_nudge'
  | 'newspaper'
  | 'mentor'
  | 'investor'
  | 'community'
  | 'announcement';

export interface FounderFeedCard {
  id: string;
  layer: FounderFeedLayer;
  kind: FounderFeedCardKind;
  title: string;
  description: string;
  actionLabel: string;
  actionRoute: string;
  priority: number;
  freshnessDate: string;
  sourceLabel: string;
  stage?: BizMapStage;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}

interface PlatformFeedData {
  stories: Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    linkedin_post_url: string | null;
    hashtags: string[] | null;
    published_at: string | null;
    created_at: string;
  }>;
  mentors: Array<{
    id: string;
    name: string;
    expertise: string[] | null;
    created_at: string;
  }>;
  angels: Array<{
    id: string;
    name: string;
    firm_name: string;
    sectors: string[] | null;
    created_at: string | null;
  }>;
  investors: Array<{
    id: string;
    slug: string;
    name: string;
    firm_name: string;
    industries: string[] | null;
    created_at: string | null;
  }>;
  communityPosts: Array<{
    id: string;
    title: string;
    content: string;
    upvotes: number | null;
    comment_count: number | null;
    created_at: string;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    priority: number | null;
    action_link: string | null;
    action_label: string | null;
    created_at: string | null;
  }>;
  recentHomeActivity: Array<{
    activity_type: string;
    created_at: string;
  }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const FEED_LIMIT = 10;

const priorityRank: Record<'high' | 'medium' | 'low', number> = {
  high: 95,
  medium: 75,
  low: 55,
};

export function getLocalFeedDayKey(date = new Date()) {
  const feedDate = new Date(date);
  if (feedDate.getHours() < 6) {
    feedDate.setDate(feedDate.getDate() - 1);
  }

  const year = feedDate.getFullYear();
  const month = `${feedDate.getMonth() + 1}`.padStart(2, '0');
  const day = `${feedDate.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDaysRemaining(dateValue?: string | null) {
  if (!dateValue) return null;

  const end = new Date(dateValue);
  if (Number.isNaN(end.getTime())) return null;

  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / DAY_MS));
}

function getDaysSince(dateValue?: string | null) {
  if (!dateValue) return 0;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0;

  return Math.floor((Date.now() - date.getTime()) / DAY_MS);
}

function getShortText(value: string | null | undefined, fallback: string, maxLength = 132) {
  const text = (value || fallback).replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function isExternalRoute(route: string) {
  return /^https?:\/\//i.test(route);
}

async function fetchPlatformFeedData(userId: string): Promise<PlatformFeedData> {
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();

  const [
    storiesResult,
    mentorsResult,
    angelsResult,
    investorsResult,
    communityResult,
    alertsResult,
    activityResult,
  ] = await Promise.all([
    supabase
      .from('stories_articles')
      .select('id, slug, title, excerpt, linkedin_post_url, hashtags, published_at, created_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1),
    supabase
      .from('mentors')
      .select('id, name, expertise, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('angel_investors')
      .select('id, name, firm_name, sectors, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('investors')
      .select('id, slug, name, firm_name, industries, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('community_posts')
      .select('id, title, content, upvotes, comment_count, created_at')
      .gte('created_at', sevenDaysAgo)
      .order('upvotes', { ascending: false, nullsFirst: false })
      .order('comment_count', { ascending: false, nullsFirst: false })
      .limit(1),
    supabase
      .from('dashboard_alerts')
      .select('id, title, message, priority, action_link, action_label, created_at')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(2),
    supabase
      .from('user_activity_log')
      .select('activity_type, created_at')
      .eq('user_id', userId)
      .in('activity_type', ['dashboard_view', 'dashboard_home_feed_view'])
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const errors = [
    storiesResult.error,
    mentorsResult.error,
    angelsResult.error,
    investorsResult.error,
    communityResult.error,
    alertsResult.error,
    activityResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw errors[0];
  }

  return {
    stories: storiesResult.data ?? [],
    mentors: mentorsResult.data ?? [],
    angels: angelsResult.data ?? [],
    investors: investorsResult.data ?? [],
    communityPosts: communityResult.data ?? [],
    alerts: alertsResult.data ?? [],
    recentHomeActivity: activityResult.data ?? [],
  };
}

export function useDailyFounderFeed() {
  const { user } = useAuth();
  const feedDayKey = getLocalFeedDayKey();
  const {
    data: personalizedData,
    loading: personalizedLoading,
    trackActivity,
  } = usePersonalizedDashboard();
  const retentionFeed = useRetentionFeed();
  const tasks = useUnifiedTasks();
  const weeklyMission = useWeeklyMission();
  const bizMapProgress = useBizMapProgress();
  const trackActivityRef = useRef(trackActivity);
  const trackedFeedViewRef = useRef<string | null>(null);

  const platformQuery = useQuery({
    queryKey: ['daily-founder-feed', user?.id, feedDayKey],
    queryFn: () => fetchPlatformFeedData(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 30 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    trackActivityRef.current = trackActivity;
  }, [trackActivity]);

  useEffect(() => {
    if (!user?.id || personalizedLoading) return;

    const trackedKey = `${user.id}:${feedDayKey}`;
    if (trackedFeedViewRef.current === trackedKey) return;

    trackedFeedViewRef.current = trackedKey;
    void trackActivityRef.current('dashboard_home_feed_view', {
      feed_day_key: feedDayKey,
    });
  }, [feedDayKey, personalizedLoading, user?.id]);

  const cards = useMemo<FounderFeedCard[]>(() => {
    const now = new Date().toISOString();
    const sourceData = platformQuery.data;
    const stage = bizMapProgress.currentStage;
    const stageDefinition = BIZMAP_STAGES.find((item) => item.id === stage);
    const primaryStageTool = stageDefinition?.tools[0];
    const incompleteTasks = tasks.allTasks
      .filter((task) => !task.isCompleted)
      .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
    const topTask = incompleteTasks[0];
    const mission = weeklyMission.currentMission;
    const missionDaysLeft = getDaysRemaining(mission?.week_end_date);
    const completedStages = Object.values(bizMapProgress.stageState).filter((item) => item.completed).length;
    const stageProgress = Math.round((completedStages / BIZMAP_STAGES.length) * 100);

    const nextActionCard: FounderFeedCard | null = topTask
      ? {
          id: `task-${topTask.id}`,
          layer: 'founder',
          kind: 'task',
          title: topTask.title,
          description: `${topTask.sourceLabel} is waiting. Finish this before adding more work today.`,
          actionLabel: topTask.actionRoute ? 'Open task' : 'Open tasks',
          actionRoute: topTask.actionRoute ?? '/dashboard/tasks',
          priority: priorityRank[topTask.priority],
          freshnessDate: now,
          sourceLabel: 'Your Tasks',
          stage,
        }
      : null;

    const missionCard: FounderFeedCard | null = mission
      ? {
          id: `routine-commitment-${mission.id}`,
          layer: 'founder',
          kind: 'routine',
          title: mission.mission_goal,
          description:
            missionDaysLeft === null
              ? `Your routine-linked commitment is ${Math.round(mission.completion_percentage)}% complete.`
              : `${missionDaysLeft} day${missionDaysLeft === 1 ? '' : 's'} left before reset. Current progress: ${Math.round(mission.completion_percentage)}%.`,
          actionLabel: 'Open routine',
          actionRoute: '/dashboard/routine',
          priority: 88,
          freshnessDate: mission.updated_at ?? mission.created_at,
          sourceLabel: 'Your Routine',
          expiresAt: mission.week_end_date,
          stage,
        }
      : null;

    const focusCard: FounderFeedCard = {
      id: `focus-funnel-${stage}`,
      layer: 'founder',
      kind: 'focus_funnel',
      title: `You are in Stage ${stageDefinition?.numeral ?? ''}: ${stageDefinition?.title ?? stage}`,
      description: `${stageProgress}% of the Startup Development Cycle is complete. ${primaryStageTool?.description ?? stageDefinition?.description ?? 'Open the map and move the active stage forward.'}`,
      actionLabel: primaryStageTool ? `Open ${primaryStageTool.name}` : 'Open Focus Funnel',
      actionRoute: primaryStageTool?.route ?? '/dashboard/focus-funnel',
      priority: 82,
      freshnessDate: bizMapProgress.progress?.updated_at ?? now,
      sourceLabel: 'Focus Funnel',
      stage,
      metadata: { stageProgress },
    };

    const recommendationCards = (personalizedData?.recommendations ?? [])
      .filter((item) => !item.is_completed && !item.is_dismissed)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 2)
      .map<FounderFeedCard>((item) => ({
        id: `recommendation-${item.id}`,
        layer: 'founder',
        kind: 'recommendation',
        title: item.title,
        description: getShortText(item.description || item.reason, 'A personalized suggestion is ready for your current stage.'),
        actionLabel: 'Open suggestion',
        actionRoute: item.action_url || '/dashboard/focus-funnel',
        priority: 70 + item.priority,
        freshnessDate: item.created_at,
        sourceLabel: 'Personalized',
        expiresAt: item.expires_at,
        stage,
      }));

    const retentionCards = [
      ...(retentionFeed.primaryNudge ? [retentionFeed.primaryNudge] : []),
      ...retentionFeed.secondaryNudges,
    ].slice(0, 2).map<FounderFeedCard>((item, index) => ({
      id: `retention-${item.id}`,
      layer: 'founder',
      kind: 'retention_nudge',
      title: item.title,
      description: getShortText(item.description, 'Pick this back up before it loses momentum.'),
      actionLabel: item.actionLabel,
      actionRoute: item.actionUrl,
      priority: 78 - index,
      freshnessDate: now,
      sourceLabel: item.eyebrow,
      stage,
    }));

    const platformCards: FounderFeedCard[] = [];

    sourceData?.alerts.forEach((alert) => {
      platformCards.push({
        id: `announcement-${alert.id}`,
        layer: 'platform',
        kind: 'announcement',
        title: alert.title,
        description: getShortText(alert.message, 'A platform update is ready for you.'),
        actionLabel: alert.action_label || 'View update',
        actionRoute: alert.action_link || '/dashboard',
        priority: 76 + (alert.priority ?? 0),
        freshnessDate: alert.created_at ?? now,
        sourceLabel: 'Platform',
      });
    });

    sourceData?.stories.forEach((story) => {
      platformCards.push({
        id: `newspaper-${story.id}`,
        layer: 'platform',
        kind: 'newspaper',
        title: story.title,
        description: getShortText(story.excerpt, 'A new Newspaper story is available for founders building right now.'),
        actionLabel: 'Read story',
        actionRoute: story.linkedin_post_url || `/newspaper/${story.slug}`,
        priority: 68,
        freshnessDate: story.published_at ?? story.created_at,
        sourceLabel: 'Newspaper',
        metadata: { external: story.linkedin_post_url ? isExternalRoute(story.linkedin_post_url) : false },
      });
    });

    sourceData?.mentors.forEach((mentor) => {
      platformCards.push({
        id: `mentor-${mentor.id}`,
        layer: 'platform',
        kind: 'mentor',
        title: `${mentor.name} joined the mentor network`,
        description: getShortText(mentor.expertise?.slice(0, 3).join(', '), 'A new mentor is available for founder guidance.'),
        actionLabel: 'View mentor',
        actionRoute: `/community/mentors/${mentor.id}`,
        priority: 64,
        freshnessDate: mentor.created_at,
        sourceLabel: 'Mentors',
      });
    });

    [...(sourceData?.angels ?? []), ...(sourceData?.investors ?? [])].slice(0, 1).forEach((investor) => {
      platformCards.push({
        id: `investor-${investor.id}`,
        layer: 'platform',
        kind: 'investor',
        title: `${investor.name} is now in the investor network`,
        description: getShortText(
          'sectors' in investor ? investor.sectors?.slice(0, 3).join(', ') : investor.industries?.slice(0, 3).join(', '),
          `${investor.firm_name} may be relevant when your startup reaches fundraising readiness.`,
        ),
        actionLabel: 'Explore investors',
        actionRoute: 'sectors' in investor ? '/community/angels' : `/insighta/vc/${investor.slug}`,
        priority: 62,
        freshnessDate: investor.created_at ?? now,
        sourceLabel: 'Investors',
      });
    });

    sourceData?.communityPosts.forEach((post) => {
      platformCards.push({
        id: `community-${post.id}`,
        layer: 'platform',
        kind: 'community',
        title: post.title,
        description: getShortText(post.content, 'A founder conversation is gaining momentum in the community.'),
        actionLabel: 'Open community',
        actionRoute: '/community',
        priority: 60 + Math.min(8, Number(post.upvotes ?? 0)),
        freshnessDate: post.created_at,
        sourceLabel: 'Community',
        metadata: {
          upvotes: post.upvotes ?? 0,
          comments: post.comment_count ?? 0,
        },
      });
    });

    const baseCards = [
      nextActionCard,
      missionCard,
      focusCard,
      ...retentionCards,
      ...recommendationCards,
      ...platformCards,
    ].filter((card): card is FounderFeedCard => Boolean(card));

    const latestPriorHomeActivity = sourceData?.recentHomeActivity.find((item) => getDaysSince(item.created_at) >= 1);
    const comebackReferenceDate = latestPriorHomeActivity?.created_at ?? user?.last_sign_in_at ?? null;
    const daysAway = getDaysSince(comebackReferenceDate);

    if (daysAway >= 3) {
      const waitingCard = nextActionCard ?? missionCard ?? focusCard ?? platformCards[0];
      baseCards.unshift({
        id: 'comeback',
        layer: 'founder',
        kind: 'comeback',
        title: `Welcome back. You were away for ${daysAway} days.`,
        description: waitingCard
          ? `Start with this: ${waitingCard.title}.`
          : 'Your daily feed has been refreshed with the most relevant founder updates.',
        actionLabel: waitingCard?.actionLabel ?? 'Review feed',
        actionRoute: waitingCard?.actionRoute ?? '/dashboard',
        priority: 120,
        freshnessDate: now,
        sourceLabel: 'Welcome back',
        stage,
      });
    }

    const deduped = new Map<string, FounderFeedCard>();
    baseCards.forEach((card) => {
      if (!deduped.has(card.id)) {
        deduped.set(card.id, card);
      }
    });

    return Array.from(deduped.values())
      .sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return new Date(b.freshnessDate).getTime() - new Date(a.freshnessDate).getTime();
      })
      .slice(0, FEED_LIMIT);
  }, [
    bizMapProgress.currentStage,
    bizMapProgress.progress?.updated_at,
    bizMapProgress.stageState,
    personalizedData?.recommendations,
    platformQuery.data,
    retentionFeed.primaryNudge,
    retentionFeed.secondaryNudges,
    tasks.allTasks,
    user?.last_sign_in_at,
    weeklyMission.currentMission,
  ]);

  return {
    cards,
    feedDayKey,
    founderName: personalizedData?.profile?.full_name?.split(' ')[0] || 'Founder',
    profile: personalizedData?.profile ?? null,
    loading:
      (personalizedLoading && !personalizedData?.profile) ||
      (platformQuery.isLoading && !platformQuery.data),
    isRefreshing:
      personalizedLoading ||
      platformQuery.isFetching ||
      tasks.isLoading ||
      weeklyMission.isLoading ||
      bizMapProgress.loading ||
      retentionFeed.loading,
    error: platformQuery.error instanceof Error ? platformQuery.error.message : null,
    trackActivity,
  };
}
