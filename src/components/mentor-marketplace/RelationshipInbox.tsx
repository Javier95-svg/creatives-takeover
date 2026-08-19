import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookmarkCheck, CalendarClock, MessageCircle, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { SavedMentor } from '@/hooks/useMentorSaves';
import { useRetentionFeed } from '@/hooks/useRetentionFeed';
import { supabase } from '@/integrations/supabase/client';
import { scheduleReturnCue } from '@/lib/returnCues';
import { cn } from '@/lib/utils';

interface RelationshipInboxProps {
  savedMentors: SavedMentor[];
  /**
   * Where the "Saved mentors" tile points. Defaults to the Saved Mentors lane;
   * that lane passes its own destination so the tile is never a self-link.
   */
  savedMentorsHref?: string;
  /** Lets the host surface attribute tile clicks to its own analytics. */
  onTileClick?: (action: string) => void;
  className?: string;
}

export function RelationshipInbox({
  savedMentors,
  savedMentorsHref = '/saved-mentors',
  onTileClick,
  className,
}: RelationshipInboxProps) {
  const { user } = useAuth();
  const retention = useRetentionFeed();
  const upcoming = useQuery({
    queryKey: ['network-upcoming-discovery-calls', user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from('discovery_calls')
        .select('id', { count: 'exact', head: true })
        .eq('founder_id', user!.id)
        .in('status', ['scheduled', 'awaiting_outcome'])
        .gte('scheduled_for', new Date().toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });
  const firstSaved = savedMentors[0];

  const remindTomorrow = async () => {
    if (!user || !firstSaved) return;
    const scheduledFor = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
    try {
      await scheduleReturnCue({
        sourceSection: 'network',
        entityType: 'mentor',
        entityId: firstSaved.mentor_id,
        reasonKey: 'mentor_follow_up_due',
        scheduledFor,
        ctaUrl: '/saved-mentors',
        dedupeKey: `network:mentor:${firstSaved.mentor_id}:follow_up`,
        plan: typeof user.user_metadata?.subscription_tier === 'string' ? user.user_metadata.subscription_tier : 'unknown',
        daysSinceSignup: Math.max(0, Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86_400_000)),
      });
      toast.success('Mentor follow-up scheduled for tomorrow.');
    } catch {
      toast.error('Could not schedule this follow-up.');
    }
  };

  if (!user) return null;

  return (
    <Card className={cn('border-accent-teal/25 bg-accent-teal/[0.04]', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Relationship inbox</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Move one relationship forward before browsing more mentors.</p>
          </div>
          <Badge variant="outline">Social actions are free</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <Button asChild variant="outline" className="h-auto min-h-20 justify-start gap-3 p-4 text-left">
          <Link to={savedMentorsHref} onClick={() => onTileClick?.('saved_mentors')}>
            <BookmarkCheck className="h-5 w-5 shrink-0 text-primary" />
            <span><strong className="block text-base">{savedMentors.length}</strong><span className="text-xs text-muted-foreground">Saved mentors</span></span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto min-h-20 justify-start gap-3 p-4 text-left">
          <Link to="/messages" onClick={() => onTileClick?.('unread_conversations')}>
            <MessageCircle className="h-5 w-5 shrink-0 text-primary" />
            <span><strong className="block text-base">{retention.unreadMessageCount}</strong><span className="text-xs text-muted-foreground">Unread conversations</span></span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto min-h-20 justify-start gap-3 p-4 text-left">
          <Link to="/mentorship/my-bookings" onClick={() => onTileClick?.('upcoming_bookings')}>
            <CalendarClock className="h-5 w-5 shrink-0 text-primary" />
            <span><strong className="block text-base">{upcoming.data ?? 0}</strong><span className="text-xs text-muted-foreground">Upcoming bookings</span></span>
          </Link>
        </Button>
        {firstSaved && (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed p-4 sm:col-span-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Follow up with {firstSaved.mentor?.name ?? 'your saved mentor'}</p>
              <p className="text-sm text-muted-foreground">Create a free return reminder so this relationship does not go cold.</p>
            </div>
            <Button variant="secondary" className="min-h-11 shrink-0" onClick={() => void remindTomorrow()}>
              <RotateCw className="mr-2 h-4 w-4" /> Remind me tomorrow
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
