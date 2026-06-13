import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Users, Calendar, Trophy, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { LaunchCohort, CohortMember } from '@/types/founderOS';

interface CohortDashboardProps {
  cohort: LaunchCohort;
  membership: CohortMember;
  members: CohortMember[];
  onCheckIn: () => void;
}

export const CohortDashboard = ({ cohort, membership, members, onCheckIn }: CohortDashboardProps) => {
  const cohortProgress = ((new Date().getTime() - new Date(cohort.start_date).getTime()) / 
    (new Date(cohort.end_date).getTime() - new Date(cohort.start_date).getTime())) * 100;

  const daysRemaining = Math.ceil(
    (new Date(cohort.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      {/* Cohort Overview */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{cohort.cohort_name}</CardTitle>
                <CardDescription>
                  {cohort.cohort_type.charAt(0).toUpperCase() + cohort.cohort_type.slice(1)} Cohort #{cohort.cohort_number}
                </CardDescription>
              </div>
            </div>
            <Badge variant={cohort.status === 'active' ? 'default' : 'secondary'}>
              {cohort.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Cohort Progress</span>
              <span className="text-muted-foreground">{daysRemaining} days remaining</span>
            </div>
            <Progress value={cohortProgress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(cohort.start_date).toLocaleDateString()}</span>
              <span>{new Date(cohort.end_date).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Member Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Total Members</span>
              </div>
              <div className="text-2xl font-bold">{cohort.member_count}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Check-in Day</span>
              </div>
              <div className="text-lg font-semibold capitalize">{cohort.weekly_checkin_day}</div>
            </div>
          </div>

          {/* Check-in Button */}
          <Button onClick={onCheckIn} className="w-full" size="lg">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Submit Weekly Check-In
          </Button>

          {/* Demo Day */}
          {cohort.demo_day_date && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">Demo Day</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(cohort.demo_day_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Your Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
          <CardDescription>Track your engagement and milestones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {membership.weekly_checkins_completed}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Check-ins</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success">
                {membership.milestones_completed}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Milestones</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-info">
                {membership.attendance_rate.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Attendance</div>
            </div>
          </div>

          {/* Current Milestone */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Current Milestone</div>
                <div className="font-semibold capitalize mt-1">{membership.current_milestone}</div>
              </div>
              <Badge variant="secondary">
                {membership.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cohort Members */}
      <Card>
        <CardHeader>
          <CardTitle>Cohort Members</CardTitle>
          <CardDescription>{members.length} active founders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`} />
                    <AvatarFallback>F</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm">Founder #{member.user_id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {member.current_milestone} stage
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{member.attendance_rate.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">attendance</div>
                </div>
              </div>
            ))}
            {members.length > 5 && (
              <Button variant="outline" className="w-full" size="sm">
                View All Members ({members.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
