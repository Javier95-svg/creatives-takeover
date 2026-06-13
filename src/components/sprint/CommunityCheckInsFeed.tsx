import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Calendar, Zap, RefreshCw, Users } from 'lucide-react';
import { useDailyCheckIns, PublicCheckInData } from '@/hooks/useDailyCheckIns';
import { formatDistanceToNow } from 'date-fns';

const MOOD_EMOJIS = ['😫', '😔', '😐', '😊', '🚀'];
const ENERGY_EMOJIS = ['🔋', '🔋', '⚡', '⚡⚡', '🔥'];

interface CommunityCheckInsFeedProps {
  limit?: number;
  showTitle?: boolean;
}

export const CommunityCheckInsFeed: React.FC<CommunityCheckInsFeedProps> = ({ 
  limit = 10,
  showTitle = true 
}) => {
  const { publicCheckIns, loading, fetchPublicCheckIns } = useDailyCheckIns();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPublicCheckIns(limit);
  }, [limit]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPublicCheckIns(limit);
    setRefreshing(false);
  };

  const getInitials = (name: string | null): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatTimeAgo = (date: string): string => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  if (loading && publicCheckIns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Community Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Community Check-ins
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
      )}
      <CardContent className={showTitle ? '' : 'pt-6'}>
        {publicCheckIns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No community check-ins yet.</p>
            <p className="text-sm">Be the first to share your progress!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {publicCheckIns.slice(0, limit).map((checkIn) => (
              <div key={checkIn.id} className="border-b border-muted pb-6 last:border-b-0 last:pb-0">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={checkIn.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(checkIn.profiles?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-sm">
                        {checkIn.profiles?.full_name || 'Anonymous'}
                      </span>
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="text-muted-foreground text-xs">
                        {checkIn.sprints?.title || 'Unknown Sprint'}
                      </span>
                      <span className="text-muted-foreground text-xs">•</span>
                      <span className="text-muted-foreground text-xs">
                        {formatTimeAgo(checkIn.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm mb-3 leading-relaxed">
                      {checkIn.progress_summary}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs">
                      {/* Mood & Energy */}
                      <div className="flex items-center space-x-1">
                        <span>{MOOD_EMOJIS[checkIn.mood_rating - 1]}</span>
                        <span>{ENERGY_EMOJIS[checkIn.energy_level - 1]}</span>
                      </div>
                      
                      {/* Streak */}
                      {checkIn.streak_count > 1 && (
                        <div className="flex items-center space-x-1 text-primary">
                          <TrendingUp className="w-3 h-3" />
                          <span>{checkIn.streak_count} day streak</span>
                        </div>
                      )}
                      
                      {/* Completed Tasks */}
                      {checkIn.completed_tasks.length > 0 && (
                        <div className="flex items-center space-x-1 text-success">
                          <span>✓</span>
                          <span>{checkIn.completed_tasks.length} tasks</span>
                        </div>
                      )}
                      
                      {/* Check-in Date */}
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(checkIn.check_in_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* Completed Tasks List */}
                    {checkIn.completed_tasks.length > 0 && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-1">
                          {checkIn.completed_tasks.slice(0, 3).map((task, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {task}
                            </Badge>
                          ))}
                          {checkIn.completed_tasks.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{checkIn.completed_tasks.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Blockers */}
                    {checkIn.blockers && (
                      <div className="mt-3 p-2 bg-warning-subtle border-l-2 border-warning rounded">
                        <p className="text-xs text-warning">
                          <strong>Blocker:</strong> {checkIn.blockers}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};