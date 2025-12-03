import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Target, Clock, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

type MissionType = 'build' | 'traction' | 'capital' | 'team';

interface Mission {
  id: string;
  type: MissionType;
  title: string;
  description: string;
  color: string;
  icon: string;
  actions: {
    title: string;
    time: string;
    link?: string;
  }[];
}

const missions: Mission[] = [
  {
    id: 'build',
    type: 'build',
    title: 'Build: Validate your product',
    description: 'Focus on building and validating your MVP',
    color: 'green',
    icon: '🟢',
    actions: [
      { title: 'Create MVP wireframe', time: '2-3 hours', link: '/bizmap-ai' },
      { title: 'Get 3 user interviews', time: '1-2 hours', link: '/dashboard' },
      { title: 'Build landing page', time: '3-4 hours' }
    ]
  },
  {
    id: 'traction',
    type: 'traction',
    title: 'Traction: Get first 10 customers',
    description: 'Focus on acquiring your first paying customers',
    color: 'orange',
    icon: '🟠',
    actions: [
      { title: 'Post on Product Hunt', time: '1 hour', link: '/dashboard' },
      { title: 'Email 20 potential customers', time: '1-2 hours' },
      { title: 'Create referral program', time: '2 hours' }
    ]
  },
  {
    id: 'capital',
    type: 'capital',
    title: 'Capital: Talk to 5 investors',
    description: 'Focus on fundraising and investor relations',
    color: 'red',
    icon: '🔴',
    actions: [
      { title: 'Create pitch deck', time: '4-6 hours', link: '/dashboard' },
      { title: 'Research 10 target investors', time: '2 hours' },
      { title: 'Practice pitch 3 times', time: '1 hour' }
    ]
  },
  {
    id: 'team',
    type: 'team',
    title: 'Team: Hire your co-founder',
    description: 'Focus on building your founding team',
    color: 'blue',
    icon: '👥',
    actions: [
      { title: 'Write co-founder job description', time: '1 hour' },
      { title: 'Post on Y Combinator co-founder matching', time: '30 min' },
      { title: 'Reach out to 5 potential co-founders', time: '2 hours' }
    ]
  }
];

export const MissionThisWeek = () => {
  const { user } = useAuth();
  const [selectedMission, setSelectedMission] = useState<MissionType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSelectedMission();
    }
  }, [user]);

  const loadSelectedMission = async () => {
    if (!user) return;

    try {
      // Check if user has a weekly mission set
      const { data } = await supabase
        .from('sprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // For now, default to first mission if none selected
      // In future, store user's weekly mission preference
      setSelectedMission('build');
    } catch (error) {
      console.error('Error loading mission:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMission = async (missionType: MissionType) => {
    if (!user) return;

    try {
      // In future, save to user preferences or weekly_missions table
      setSelectedMission(missionType);
      // Could save to localStorage for now
      localStorage.setItem('weekly_mission', missionType);
    } catch (error) {
      console.error('Error saving mission:', error);
    }
  };

  const currentMission = selectedMission ? missions.find(m => m.type === selectedMission) : null;

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Your Mission This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base">Your Mission This Week</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Focus on just ONE of these - which matters most?</p>
      </CardHeader>
      <CardContent>
        {!currentMission ? (
          <div className="space-y-3">
            {missions.map((mission) => (
              <button
                key={mission.id}
                onClick={() => saveMission(mission.type)}
                className="w-full text-left p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{mission.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{mission.title}</p>
                      <p className="text-xs text-muted-foreground">{mission.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{currentMission.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{currentMission.title}</p>
                  <p className="text-xs text-muted-foreground">{currentMission.description}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedMission(null)}
              >
                Change
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Suggested actions:</p>
              {currentMission.actions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{action.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{action.time}</span>
                    </div>
                  </div>
                  {action.link && (
                    <Link to={action.link}>
                      <Button variant="ghost" size="sm" className="h-8">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

