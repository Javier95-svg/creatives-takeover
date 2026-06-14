import { useEffect, useState } from 'react';
import { Send, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivationJourney } from '@/hooks/useActivationJourney';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface ShipUpdate {
  id: string;
  user_id: string;
  content: string;
  stage: string | null;
  created_at: string;
  profiles?: { full_name: string | null; username: string | null } | null;
}

const STAGE_LABEL: Record<string, string> = {
  stage_i: 'ICP',
  stage_ii: 'Waitlist',
  stage_iii: 'PMF',
  stage_iv: 'MVP',
};

export function ShipUpdateFeed() {
  const { user } = useAuth();
  const { activationJourney } = useActivationJourney();
  const [updates, setUpdates] = useState<ShipUpdate[]>([]);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [postedToday, setPostedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUpdates = async () => {
    const { data } = await (supabase as any)
      .from('ship_updates')
      .select('id, user_id, content, stage, created_at, profiles(full_name, username)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setUpdates(data as ShipUpdate[]);
    setLoading(false);

    // Check if the current user already posted today
    if (user) {
      const today = new Date().toISOString().slice(0, 10);
      const mine = (data as ShipUpdate[] | null)?.find(
        (u) => u.user_id === user.id && u.created_at.slice(0, 10) === today
      );
      setPostedToday(!!mine);
    }
  };

  useEffect(() => {
    void fetchUpdates();
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !user) return;

    setSubmitting(true);
    const { error } = await (supabase as any).from('ship_updates').insert({
      user_id: user.id,
      content: text,
      stage: activationJourney?.entryStage ?? null,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('You already posted a ship update today. Come back tomorrow!');
      } else {
        toast.error('Failed to post update. Please try again.');
      }
    } else {
      toast.success('Shipped! Your update is live.');
      setDraft('');
      setPostedToday(true);
      await fetchUpdates();
    }
    setSubmitting(false);
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-warning" />
          <CardTitle className="text-base font-semibold">What did you ship this week?</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">One-line update from the community. One post per day.</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Composer */}
        {user && !postedToday && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 280))}
              placeholder="I shipped my ICP draft / launched my waitlist / got my first signup..."
              className="flex-1 h-9 text-sm rounded-full border-border/60"
              maxLength={280}
            />
            <Button
              type="submit"
              size="sm"
              className="rounded-full px-4 shrink-0"
              disabled={!draft.trim() || submitting}
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Post
            </Button>
          </form>
        )}
        {user && postedToday && (
          <p className="text-xs text-muted-foreground italic">You already shipped today. Come back tomorrow!</p>
        )}
        {!user && (
          <p className="text-xs text-muted-foreground">
            <a href="/signup" className="text-primary underline underline-offset-2">Sign up</a> to post a ship update.
          </p>
        )}

        {/* Feed */}
        <div className="space-y-3">
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          )}
          {!loading && updates.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No updates yet. Be the first to ship something!
            </p>
          )}
          {!loading && updates.map((update) => (
            <div key={update.id} className="flex items-start gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">
                  {update.profiles?.full_name || update.profiles?.username || 'Founder'}
                </span>
                {update.stage && STAGE_LABEL[update.stage] && (
                  <Badge variant="secondary" className="ml-2 text-caption px-1.5 py-0 rounded-full">
                    {STAGE_LABEL[update.stage]}
                  </Badge>
                )}
                <p className="text-muted-foreground mt-0.5 leading-relaxed">{update.content}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
