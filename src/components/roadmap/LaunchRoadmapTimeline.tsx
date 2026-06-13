import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Target, Rocket, Users, DollarSign } from 'lucide-react';
import type { LaunchRoadmap } from '@/types/founderOS';
import { cn } from '@/lib/utils';

interface LaunchRoadmapTimelineProps {
  roadmap: LaunchRoadmap;
}

const weekMilestones = [
  {
    week: 1,
    quarter: 'Q1',
    title: 'Business Concept',
    description: 'Days 1-2',
    subtitle: 'Problem & solution definition',
    icon: Target,
    color: 'text-info',
    bgColor: 'bg-info/10',
    key: 'week1_validated' as keyof LaunchRoadmap,
  },
  {
    week: 1,
    quarter: 'Q2',
    title: 'Target Customer',
    description: 'Days 3-4',
    subtitle: 'Identify ideal first customers',
    icon: Users,
    color: 'text-info',
    bgColor: 'bg-info/10',
    key: 'week1_validated' as keyof LaunchRoadmap,
  },
  {
    week: 1,
    quarter: 'Q3',
    title: 'Validation Plan',
    description: 'Days 5-7',
    subtitle: 'Market validation & testing',
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/10',
    key: 'week1_validated' as keyof LaunchRoadmap,
  },
  {
    week: 2,
    quarter: 'Q4',
    title: 'Build MVP',
    description: 'Days 8-14',
    subtitle: 'Core product development',
    icon: Rocket,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    key: 'week2_mvp_built' as keyof LaunchRoadmap,
  },
  {
    week: 3,
    quarter: 'Q5',
    title: 'Launch Strategy',
    description: 'Days 15-21',
    subtitle: 'Go-to-market execution',
    icon: Target,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    key: 'week3_launched' as keyof LaunchRoadmap,
  },
  {
    week: 4,
    quarter: 'Q6',
    title: 'Pricing Model',
    description: 'Days 22-25',
    subtitle: 'Revenue strategy',
    icon: DollarSign,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    key: 'week4_first_customer' as keyof LaunchRoadmap,
  },
  {
    week: 4,
    quarter: 'Q7',
    title: 'First Customer',
    description: 'Days 26-30',
    subtitle: 'Achieve first revenue',
    icon: DollarSign,
    color: 'text-success',
    bgColor: 'bg-success/10',
    key: 'week4_first_customer' as keyof LaunchRoadmap,
  },
];

export const LaunchRoadmapTimeline = ({ roadmap }: LaunchRoadmapTimelineProps) => {
  const daysRemaining = 30 - roadmap.current_day + 1;
  const daysSinceStart = roadmap.current_day - 1;

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">30-Day Launch Roadmap</CardTitle>
            <CardDescription>{roadmap.business_idea}</CardDescription>
          </div>
          <Badge variant={roadmap.status === 'active' ? 'default' : 'secondary'}>
            {roadmap.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">
              Day {roadmap.current_day} of 30 • {daysRemaining} days left
            </span>
          </div>
          <Progress value={roadmap.progress_percentage} className="h-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{roadmap.completed_tasks} tasks completed</span>
            <span>{roadmap.progress_percentage.toFixed(0)}% complete</span>
          </div>
        </div>

        {/* Quarter Milestones */}
        <div className="space-y-4 pt-4">
          <h4 className="font-semibold text-sm text-muted-foreground">Launch Milestones (Q1-Q7)</h4>
          
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border" />

            {/* Milestones */}
            <div className="space-y-6">
              {weekMilestones.map((milestone) => {
                const isCompleted = roadmap[milestone.key] as boolean;
                const isCurrent = roadmap.current_week === milestone.week;
                const Icon = milestone.icon;
                const StatusIcon = isCompleted ? CheckCircle2 : Circle;

                return (
                  <div key={milestone.quarter} className="relative flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2',
                        isCompleted
                          ? 'border-primary bg-primary/10'
                          : isCurrent
                          ? 'border-primary bg-background animate-pulse'
                          : 'border-border bg-muted'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-6 w-6',
                          isCompleted ? 'text-primary' : isCurrent ? milestone.color : 'text-muted-foreground'
                        )}
                      />
                    </div>

                    {/* Content */}
                    <div className={cn('flex-1 pt-1', isCurrent && 'animate-pulse')}>
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold">{milestone.title}</h5>
                        <Badge variant={isCompleted ? 'default' : 'outline'} className="text-xs">
                          {milestone.quarter}
                        </Badge>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">{milestone.description}</p>
                      <p className="text-sm text-muted-foreground">{milestone.subtitle}</p>
                      
                      {/* Status */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <StatusIcon
                          className={cn(
                            'h-4 w-4',
                            isCompleted ? 'text-success' : 'text-muted-foreground'
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Not Started'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* First Customer Date */}
        {roadmap.first_customer_date && (
          <div className="pt-4 border-t bg-success/10 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              <div>
                <div className="font-semibold text-success">First Customer Achieved! 🎉</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(roadmap.first_customer_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start & Target Dates */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
          <div>
            Started: {new Date(roadmap.start_date).toLocaleDateString()}
          </div>
          <div>
            Target Launch: {new Date(roadmap.target_launch_date).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
