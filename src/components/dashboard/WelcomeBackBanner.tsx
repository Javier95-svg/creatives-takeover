import { useEffect, useState } from 'react';
import { X, Newspaper, MessageSquare, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { captureEvent } from '@/lib/analytics';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

interface WelcomeBackData {
  newArticleCount: number;
  unreadMessageCount: number;
  newMentorCount: number;
  lastSeenAt: string;
}

export function WelcomeBackBanner() {
  const { user } = useAuth();
  const [data, setData] = useState<WelcomeBackData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_seen_at, last_activity_at, last_active_at, updated_at')
        .eq('id', user.id)
        .single();

      const rawLastSeen =
        profile?.last_seen_at ??
        profile?.last_activity_at ??
        profile?.last_active_at ??
        profile?.updated_at;

      if (!rawLastSeen) return;

      const lastSeenAt = rawLastSeen;
      const lastSeen = new Date(lastSeenAt).getTime();
      const now = Date.now();
      const gap = now - lastSeen;

      if (gap < THREE_DAYS_MS) return;

      const lastSeenIso = new Date(lastSeen).toISOString();

      const [articlesResult, messagesResult, mentorsResult] = await Promise.allSettled([
        supabase
          .from('stories_articles')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published')
          .gte('published_at', lastSeenIso),
        supabase
          .from('conversations')
          .select('id')
          .contains('participants', [user.id])
          .then(async ({ data: convs }) => {
            if (!convs || convs.length === 0) return { count: 0 };
            const ids = convs.map((c) => c.id);
            const { count } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .in('conversation_id', ids)
              .neq('sender_id', user.id)
              .eq('is_read', false);
            return { count: count ?? 0 };
          }),
        supabase
          .from('mentors')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', lastSeenIso),
      ]);

      const newArticleCount =
        articlesResult.status === 'fulfilled' ? (articlesResult.value.count ?? 0) : 0;
      const unreadMessageCount =
        messagesResult.status === 'fulfilled' ? (messagesResult.value.count ?? 0) : 0;
      const newMentorCount =
        mentorsResult.status === 'fulfilled' ? (mentorsResult.value.count ?? 0) : 0;

      if (newArticleCount === 0 && unreadMessageCount === 0 && newMentorCount === 0) return;

      setData({ newArticleCount, unreadMessageCount, newMentorCount, lastSeenAt });

      captureEvent('welcome_back_shown', {
        user_id: user.id,
        days_away: Math.floor(gap / (24 * 60 * 60 * 1000)),
        new_articles: newArticleCount,
        unread_messages: unreadMessageCount,
        new_mentors: newMentorCount,
      });
    };

    void init();
  }, [user]);

  if (!data || dismissed) return null;

  const { newArticleCount, unreadMessageCount, newMentorCount } = data;

  const primaryCta =
    unreadMessageCount > 0
      ? { label: 'Open Messages', to: '/messages' }
      : newArticleCount > 0
        ? { label: 'Read the Newspaper', to: '/newspaper' }
        : { label: 'Discover Mentors', to: '/community' };

  const handleDismiss = () => {
    setDismissed(true);
    captureEvent('welcome_back_dismissed', { user_id: user?.id });
  };

  const handleCtaClick = () => {
    captureEvent('welcome_back_cta_clicked', {
      user_id: user?.id,
      cta: primaryCta.label,
    });
  };

  return (
    <div className="relative rounded-[1.75rem] border border-teal-500/25 bg-teal-500/10 px-5 py-5 shadow-sm backdrop-blur-sm">
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss welcome back banner"
        type="button"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-2">
        Welcome back
      </p>
      <p className="text-lg font-semibold mb-4">
        Here's what happened while you were away
      </p>

      <div className="flex flex-wrap gap-3 mb-5">
        {newArticleCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/65 px-3 py-2 text-sm">
            <Newspaper className="h-4 w-4 text-teal-500 shrink-0" />
            <span>
              <strong>{newArticleCount}</strong>{' '}
              {newArticleCount === 1 ? 'new article' : 'new articles'} in the Newspaper
            </span>
          </div>
        )}
        {unreadMessageCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/65 px-3 py-2 text-sm">
            <MessageSquare className="h-4 w-4 text-teal-500 shrink-0" />
            <span>
              <strong>{unreadMessageCount}</strong>{' '}
              {unreadMessageCount === 1 ? 'unread message' : 'unread messages'}
            </span>
          </div>
        )}
        {newMentorCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/65 px-3 py-2 text-sm">
            <Users className="h-4 w-4 text-teal-500 shrink-0" />
            <span>
              <strong>{newMentorCount}</strong>{' '}
              {newMentorCount === 1 ? 'new mentor' : 'new mentors'} joined
            </span>
          </div>
        )}
      </div>

      <Link
        to={primaryCta.to}
        onClick={handleCtaClick}
        className="inline-flex items-center gap-2 rounded-full bg-teal-500 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-600 transition-colors"
      >
        {primaryCta.label}
      </Link>
    </div>
  );
}
