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
  Zap
} from 'lucide-react';
import { useAccountabilityPartners } from '@/hooks/useAccountabilityPartners';
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
  const [showMatching, setShowMatching] = useState(false);

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