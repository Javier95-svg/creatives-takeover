import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserPlus, 
  Bell, 
  TrendingUp, 
  Calendar,
  MessageSquare,
  Target,
  Zap,
  ArrowRight,
  Flame,
  Megaphone,
  Globe2
} from 'lucide-react';
import { useAccountabilityPartners } from '@/hooks/useAccountabilityPartners';
import { usePersonalizedDashboard } from '@/hooks/usePersonalizedDashboard';
import { useWeeklyMission } from '@/hooks/decision-engine/useWeeklyMission';
import { AccountabilityPartnerCard } from './AccountabilityPartnerCard';
import { AccountabilityNudgeCard } from './AccountabilityNudgeCard';
import { PartnerMatchingModal } from './PartnerMatchingModal';
import { useState } from 'react';

export const AccountabilityDashboard = () => {
  const { 
    partnerships, 
    pendingRequests, 
    recentNudges, 
    loading 
  } = useAccountabilityPartners();
  const { data: dashboardData } = usePersonalizedDashboard();
  const { currentMission } = useWeeklyMission();
  const [showMatching, setShowMatching] = useState(false);

  const currentStreak = dashboardData?.stats?.currentStreak ?? 0;
  const businessStage = dashboardData?.profile?.business_stage;
  const missionStatusLabel = !currentMission
    ? 'No commitment set yet'
    : currentMission.status === 'active'
    ? 'Commitment in play'
    : currentMission.commitment_outcome === 'missed'
    ? 'Last commitment missed'
    : 'Last commitment closed';
  const missionWindow = currentMission
    ? `${new Date(currentMission.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(currentMission.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'This week';

  const stats = {
    activePartnerships: partnerships.length,
    pendingRequests: pendingRequests.length,
    unreadNudges: recentNudges.length,
    totalNudges: recentNudges.length // This would be expanded in real implementation
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Partners</p>
                <p className="text-2xl font-bold">{stats.activePartnerships}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
                <p className="text-2xl font-bold">{stats.pendingRequests}</p>
              </div>
              <UserPlus className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unread Nudges</p>
                <p className="text-2xl font-bold">{stats.unreadNudges}</p>
              </div>
              <Bell className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Nudges</p>
                <p className="text-2xl font-bold">{stats.totalNudges}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Globe2 className="h-3.5 w-3.5" />
                Public progress
              </div>
              <CardTitle className="text-2xl">Progress should be visible, not private motivation.</CardTitle>
            </div>
            {businessStage ? <Badge variant="outline">{businessStage}</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">This week, I will</p>
              <p className="mt-3 text-lg font-semibold leading-8 text-foreground">
                {currentMission?.mission_goal || 'Set one weekly commitment, then let your partners and community see that it is real.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">{missionStatusLabel}</Badge>
                <Badge variant="outline">{missionWindow}</Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  Consistency
                </div>
                <p className="text-lg font-semibold text-foreground">{currentStreak} day streak</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">The public signal that proves whether your work rhythm is real.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Peer pressure
                </div>
                <p className="text-lg font-semibold text-foreground">{partnerships.length} active partners</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Pairing matters more when progress has a visible scoreboard.</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Bell className="h-3.5 w-3.5 text-red-500" />
                  Pressure
                </div>
                <p className="text-lg font-semibold text-foreground">{recentNudges.length} live nudges</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Nudges turn a vague intention into a social cost when you drift.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/community/progress">
                <Megaphone className="h-4 w-4 mr-2" />
                Share Progress in Community
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setShowMatching(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Find Accountability Partner
            </Button>
            <Button asChild variant="ghost">
              <Link to="/weekly-mission">
                Open Weekly Commitment
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowMatching(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Find Accountability Partner
            </Button>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Check-in
            </Button>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message All Partners
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Active Partners ({partnerships.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="nudges" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Nudges ({recentNudges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {partnerships.length === 0 ? (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                No active accountability partners yet. Find a partner to start your accountability journey!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partnerships.map((partnership) => (
                <AccountabilityPartnerCard
                  key={partnership.id}
                  partnership={partnership}
                  variant="active"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Alert>
              <UserPlus className="h-4 w-4" />
              <AlertDescription>
                No pending partnership requests.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((partnership) => (
                <AccountabilityPartnerCard
                  key={partnership.id}
                  partnership={partnership}
                  variant="pending"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="nudges" className="space-y-4">
          {recentNudges.length === 0 ? (
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription>
                No recent nudges from your accountability partners.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {recentNudges.map((nudge) => (
                <AccountabilityNudgeCard
                  key={nudge.id}
                  nudge={nudge}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Partner Matching Modal */}
      <PartnerMatchingModal 
        open={showMatching} 
        onOpenChange={setShowMatching} 
      />
    </div>
  );
};