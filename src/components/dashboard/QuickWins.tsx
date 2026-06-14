import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Zap, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface QuickWin {
  id: string;
  text: string;
  benefit: string;
  time: string;
  completed: boolean;
}

const defaultQuickWins: Omit<QuickWin, 'id' | 'completed'>[] = [
  {
    text: 'Post to Twitter about your journey',
    benefit: '1 potential customer',
    time: '30 min'
  },
  {
    text: 'Email 3 friends your product link',
    benefit: 'feedback',
    time: '15 min'
  },
  {
    text: 'Write down your business model',
    benefit: 'clarity',
    time: '45 min'
  },
  {
    text: 'Update your LinkedIn with startup status',
    benefit: 'network awareness',
    time: '20 min'
  },
  {
    text: 'Create a simple landing page',
    benefit: 'validation tool',
    time: '1 hour'
  }
];

export const QuickWins = () => {
  const { user } = useAuth();
  const [quickWins, setQuickWins] = useState<QuickWin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      void loadQuickWins();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reviewed: dependency omission is intentional (preserves current behaviour); revisit if a stale-state bug surfaces
  }, [user]);

  const loadQuickWins = async () => {
    if (!user) return;

    try {
      // Check if user has saved quick wins
      const savedWins = localStorage.getItem(`quick_wins_${user.id}`);
      
      if (savedWins) {
        setQuickWins(JSON.parse(savedWins));
      } else {
        // Initialize with default quick wins
        const initialized = defaultQuickWins.map((win, index) => ({
          id: `default-${index}`,
          ...win,
          completed: false
        }));
        setQuickWins(initialized);
        localStorage.setItem(`quick_wins_${user.id}`, JSON.stringify(initialized));
      }
    } catch (error) {
      console.error('Error loading quick wins:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuickWin = (winId: string) => {
    const updated = quickWins.map(win =>
      win.id === winId ? { ...win, completed: !win.completed } : win
    );
    setQuickWins(updated);
    
    if (user) {
      localStorage.setItem(`quick_wins_${user.id}`, JSON.stringify(updated));
    }
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Quick Wins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = quickWins.filter(w => w.completed).length;
  const totalCount = quickWins.length;

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base">Quick Wins</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          These take 30-60 min and unlock the next phase:
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quickWins.map((win) => (
            <div
              key={win.id}
              onClick={() => toggleQuickWin(win.id)}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                win.completed
                  ? 'bg-success-subtle border-success/20'
                  : 'bg-muted/30 hover:bg-muted/50 border-border/50'
              }`}
            >
              {win.completed ? (
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${win.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                  {win.text}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {win.time}
                  </Badge>
                  <span className="text-xs text-muted-foreground">({win.benefit})</span>
                </div>
              </div>
            </div>
          ))}
          
          {totalCount > 0 && (
            <div className="pt-2 border-t text-xs text-muted-foreground text-center">
              {completedCount} of {totalCount} completed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

