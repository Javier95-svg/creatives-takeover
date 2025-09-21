import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Video, ArrowRight } from 'lucide-react';
import { useDemoCalls } from '@/hooks/useDemoCalls';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { Link } from 'react-router-dom';

const UpcomingDemoCalls = () => {
  const { calls, loading } = useDemoCalls();
  
  const upcomingCalls = calls
    .filter(call => new Date(call.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 3);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    } else if (isThisWeek(date)) {
      return format(date, 'EEEE \'at\' h:mm a');
    } else {
      return format(date, 'MMM d \'at\' h:mm a');
    }
  };

  if (loading) {
    return (
      <Card className="h-[300px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading demo calls...</div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Upcoming Demo Days
            </CardTitle>
            <CardDescription>
              Join community demo calls to showcase projects and get feedback
            </CardDescription>
          </div>
          <Link to="/demo-calls">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {upcomingCalls.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <div className="text-muted-foreground">
              No upcoming demo calls scheduled
            </div>
            <Link to="/demo-calls">
              <Button className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule First Demo Call
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {upcomingCalls.map((call) => (
              <div key={call.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{call.title}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {call.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(call.scheduled_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {call.max_participants} spots
                      </div>
                    </div>
                    
                    {call.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {call.description}
                      </p>
                    )}
                  </div>
                  
                  <Link to="/demo-calls">
                    <Button size="sm" variant="outline" className="ml-4">
                      Join
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            
            <div className="pt-2 border-t">
              <Link to="/demo-calls">
                <Button variant="ghost" className="w-full text-sm">
                  See all upcoming demo calls
                </Button>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingDemoCalls;