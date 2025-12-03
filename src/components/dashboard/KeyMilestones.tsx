import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Flag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Sprint {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
}

export const KeyMilestones = () => {
  const { user } = useAuth();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMilestones();
    }
  }, [user]);

  const fetchMilestones = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sprints')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
        .limit(4);

      if (error) throw error;
      setSprints(data || []);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMilestoneStatus = (sprint: Sprint) => {
    const today = new Date();
    const startDate = new Date(sprint.start_date);
    const endDate = new Date(sprint.end_date);

    if (sprint.status === 'completed') {
      return { status: 'completed', progress: 100 };
    }
    if (today < startDate) {
      return { status: 'upcoming', progress: 0 };
    }
    if (today >= startDate && today <= endDate) {
      const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const daysPassed = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const progress = Math.min((daysPassed / totalDays) * 100, 100);
      return { status: 'active', progress: Math.round(progress) };
    }
    return { status: 'completed', progress: 100 };
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d');
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-5 w-5 text-primary" />
            Key Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sprints.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Flag className="h-4 w-4 text-accent" />
            </div>
            Key Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 mx-auto bg-accent/10 rounded-lg flex items-center justify-center">
              <Flag className="w-6 h-6 text-accent" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-sm">No milestones yet</p>
              <p className="text-xs text-muted-foreground">
                Create a sprint to start tracking milestones
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Flag className="h-4 w-4 text-accent" />
          </div>
          Key Milestones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sprints.map((sprint) => {
            const { status, progress } = getMilestoneStatus(sprint);
            return (
              <div key={sprint.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        status === 'completed'
                          ? 'bg-[hsl(var(--green-primary))]/20 text-[hsl(var(--green-primary))]'
                          : status === 'active'
                          ? 'bg-[hsl(var(--blue-primary))]/20 text-[hsl(var(--blue-primary))]'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {status === 'completed' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-current" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{sprint.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(sprint.end_date)}
                  </span>
                </div>
                {status === 'active' && (
                  <div className="ml-8 space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">{progress}% complete</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

