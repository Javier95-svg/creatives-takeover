import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Users, Target, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Milestone {
  id: string;
  milestone_type: string;
  milestone_title: string;
  milestone_description: string;
  target_value: number;
  current_value: number;
  achieved: boolean;
  celebration_message: string;
}

const CommunityMilestones = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const { data, error } = await supabase
          .from('community_milestones')
          .select('*')
          .order('target_value', { ascending: true })
          .limit(4);

        if (error) throw error;
        setMilestones(data || []);
      } catch (error) {
        console.error('Error fetching milestones:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMilestones();

    const channel = supabase
      .channel('milestones')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'community_milestones'
      }, fetchMilestones)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'total_posts':
        return <Target className="w-4 h-4" />;
      case 'active_users':
        return <Users className="w-4 h-4" />;
      case 'total_challenges':
        return <Zap className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextMilestone = milestones.find(m => !m.achieved);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" />
          Community Milestones
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {nextMilestone && (
          <div className="p-4 rounded-lg bg-gradient-to-br from-warning/10 to-warning/10 border-2 border-warning/20">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-lg bg-background">
                {getIcon(nextMilestone.milestone_type)}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{nextMilestone.milestone_title}</h4>
                <p className="text-sm text-muted-foreground">
                  {nextMilestone.milestone_description}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">
                  {nextMilestone.current_value} / {nextMilestone.target_value}
                </span>
              </div>
              <Progress 
                value={(nextMilestone.current_value / nextMilestone.target_value) * 100} 
                className="h-2"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          {milestones.filter(m => m.achieved).slice(0, 3).map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/20">
                <Trophy className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">
                  {milestone.milestone_title}
                </p>
                <p className="text-xs text-muted-foreground">
                  ✓ Completed
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CommunityMilestones;
