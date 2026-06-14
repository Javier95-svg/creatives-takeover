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
      void fetchRecentWins();
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
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary" />
            Recent Wins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Celebrate your victories!</p>
              <p className="text-xs text-muted-foreground">
                Click "Add a Win" below to start
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-primary" />
          Recent Wins
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {wins.map((win) => (
            <li
              key={win.id}
              className="flex items-start gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 transition-colors border border-primary/10"
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
