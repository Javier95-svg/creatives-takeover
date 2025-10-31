import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Target, Calendar as CalendarIcon, Users, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay, parseISO, isToday, isTomorrow, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  type: 'task' | 'sprint' | 'checkin' | 'demo';
  title: string;
  date: string;
  completed?: boolean;
  priority?: string;
  metadata?: any;
}

export const UnifiedTimeline = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTimelineEvents();
    }
  }, [user]);

  const fetchTimelineEvents = async () => {
    if (!user) return;

    try {
      const today = new Date();
      const nextWeek = addDays(today, 7);
      const todayStr = format(today, 'yyyy-MM-dd');
      const nextWeekStr = format(nextWeek, 'yyyy-MM-dd');

      // Fetch upcoming tasks
      const { data: tasks } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('task_date', todayStr)
        .lte('task_date', nextWeekStr)
        .order('task_date', { ascending: true });

      // Fetch active sprints with upcoming end dates
      const { data: sprints } = await supabase
        .from('sprints')
        .select('*')
        .eq('user_id', user.id)
        .gte('end_date', todayStr)
        .lte('end_date', nextWeekStr)
        .order('end_date', { ascending: true });

      // Fetch upcoming demo calls
      const { data: demos } = await supabase
        .from('demo_calls')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_at', today.toISOString())
        .lte('scheduled_at', nextWeek.toISOString())
        .order('scheduled_at', { ascending: true });

      // Transform to unified timeline format
      const timelineEvents: TimelineEvent[] = [];

      // Add tasks
      tasks?.forEach(task => {
        timelineEvents.push({
          id: task.id,
          type: 'task',
          title: task.task_text,
          date: task.task_date,
          completed: task.is_completed,
          priority: task.priority,
        });
      });

      // Add sprint deadlines
      sprints?.forEach(sprint => {
        timelineEvents.push({
          id: sprint.id,
          type: 'sprint',
          title: `Sprint: ${sprint.title}`,
          date: sprint.end_date,
          completed: sprint.status === 'completed',
          metadata: { status: sprint.status },
        });
      });

      // Add demo calls
      demos?.forEach(demo => {
        timelineEvents.push({
          id: demo.id,
          type: 'demo',
          title: 'Scheduled Call',
          date: format(parseISO(demo.scheduled_at), 'yyyy-MM-dd'),
          completed: demo.status === 'completed',
          metadata: { status: demo.status, time: format(parseISO(demo.scheduled_at), 'HH:mm') },
        });
      });

      // Sort by date
      timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setEvents(timelineEvents);
    } catch (error) {
      console.error('Error fetching timeline events:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskComplete = async (taskId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update({ 
          is_completed: !currentStatus,
          completed_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      fetchTimelineEvents();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM d');
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <Circle className="h-4 w-4" />;
      case 'sprint':
        return <Target className="h-4 w-4" />;
      case 'demo':
        return <Users className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string, completed?: boolean) => {
    if (completed) return 'text-green-500';
    switch (type) {
      case 'task':
        return 'text-blue-500';
      case 'sprint':
        return 'text-orange-500';
      case 'demo':
        return 'text-purple-500';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" />
            Next 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" />
            Next 7 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-sm text-muted-foreground">
            No upcoming events in the next week
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const dateKey = event.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-primary" />
          Next 7 Days
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedEvents).map(([date, dateEvents]) => (
          <div key={date} className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {getDateLabel(date)}
            </h4>
            <div className="space-y-2">
              {dateEvents.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    event.completed 
                      ? "bg-green-500/10 border-green-500/20" 
                      : "bg-card hover:bg-accent/50",
                    event.type === 'task' && !event.completed && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (event.type === 'task' && event.completed !== undefined) {
                      toggleTaskComplete(event.id, event.completed);
                    }
                  }}
                >
                  <div className={cn("flex-shrink-0", getEventColor(event.type, event.completed))}>
                    {event.completed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      getEventIcon(event.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      event.completed && "line-through text-muted-foreground"
                    )}>
                      {event.title}
                    </p>
                    {event.metadata?.time && (
                      <p className="text-xs text-muted-foreground">
                        {event.metadata.time}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {event.priority && (
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs",
                          event.priority === 'high' && "border-red-500/50 text-red-500",
                          event.priority === 'medium' && "border-orange-500/50 text-orange-500",
                          event.priority === 'low' && "border-blue-500/50 text-blue-500"
                        )}
                      >
                        {event.priority}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs capitalize">
                      {event.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
