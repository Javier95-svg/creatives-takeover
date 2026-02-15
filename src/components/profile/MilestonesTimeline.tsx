import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  Users,
  DollarSign,
  Rocket,
  Handshake,
  TrendingUp,
  Plus,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Milestone {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  milestone_type: string;
  achieved_at: string;
  is_pinned: boolean;
  created_at: string;
}

interface MilestonesTimelineProps {
  userId: string;
  isOwnProfile: boolean;
}

const milestoneIcons: Record<string, React.ElementType> = {
  'idea-validated': Lightbulb,
  'waitlist-launched': Users,
  'first-user': CheckCircle2,
  'first-revenue': DollarSign,
  'funding': TrendingUp,
  'launch': Rocket,
  'partnership': Handshake,
  'custom': CheckCircle2,
};

const milestoneColors: Record<string, string> = {
  'idea-validated': 'bg-yellow-500',
  'waitlist-launched': 'bg-blue-500',
  'first-user': 'bg-green-500',
  'first-revenue': 'bg-emerald-500',
  'funding': 'bg-purple-500',
  'launch': 'bg-orange-500',
  'partnership': 'bg-pink-500',
  'custom': 'bg-gray-500',
};

export const MilestonesTimeline = ({ userId, isOwnProfile }: MilestonesTimelineProps) => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMilestones();
  }, [userId]);

  const loadMilestones = async () => {
    try {
      const { data, error } = await supabase
        .from('founder_milestones')
        .select('*')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false });

      if (error) throw error;
      setMilestones(data || []);
    } catch (error) {
      console.error('Error loading milestones:', error);
      toast.error('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-24 bg-muted rounded-lg" />
        <div className="h-24 bg-muted rounded-lg" />
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Rocket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Milestones Yet</h3>
        <p className="text-muted-foreground mb-4">
          {isOwnProfile
            ? "Start tracking your startup journey by adding your first milestone!"
            : "This founder hasn't added any milestones yet."}
        </p>
        {isOwnProfile && (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add First Milestone
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Milestone Timeline</h3>
        {isOwnProfile && (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        )}
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {/* Milestones */}
        <div className="space-y-6">
          {milestones.map((milestone, index) => {
            const Icon = milestoneIcons[milestone.milestone_type] || CheckCircle2;
            const colorClass = milestoneColors[milestone.milestone_type] || 'bg-gray-500';

            return (
              <div key={milestone.id} className="relative pl-14">
                {/* Icon */}
                <div className={`absolute left-0 p-2 rounded-full ${colorClass} text-white shadow-lg`}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <Card className={`p-4 ${milestone.is_pinned ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{milestone.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(milestone.achieved_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    {milestone.is_pinned && (
                      <Badge variant="secondary" className="text-xs">
                        Pinned
                      </Badge>
                    )}
                  </div>
                  {milestone.description && (
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
