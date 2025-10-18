import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Win {
  id: string;
  win_text: string;
  created_at: string;
}

interface RecentWinsProps {
  refreshTrigger?: number;
}

export const RecentWins = ({ refreshTrigger }: RecentWinsProps) => {
  const { user } = useAuth();
  const [wins, setWins] = useState<Win[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecentWins();
    }
  }, [user, refreshTrigger]);

  const fetchRecentWins = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('daily_wins')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setWins(data || []);
    } catch (error) {
      console.error('Error fetching wins:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Recent Wins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (wins.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Recent Wins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Sparkles className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No wins captured yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Add a Win" to start celebrating!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Recent Wins
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {wins.map((win) => (
            <li
              key={win.id}
              className="flex items-start gap-2 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
            >
              <span className="text-lg mt-0.5">🎉</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">
                  {win.win_text}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(win.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
