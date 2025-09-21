import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Clock, Users } from 'lucide-react';
import { useDemoCalls } from '@/hooks/useDemoCalls';
import { useAuth } from '@/contexts/AuthContext';
import DemoCallScheduler from './DemoCallScheduler';
import DemoCallCard from './DemoCallCard';

const DemoCallsDashboard: React.FC = () => {
  const { calls, loading, joinCall, leaveCall, fetchParticipants } = useDemoCalls();
  const { user } = useAuth();
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  const upcomingCalls = calls.filter(call => {
    const callDate = new Date(call.scheduled_at);
    const now = new Date();
    return callDate > now && call.status === 'scheduled';
  });

  const myCalls = calls.filter(call => call.user_id === user?.id);
  
  const pastCalls = calls.filter(call => {
    const callDate = new Date(call.scheduled_at);
    const now = new Date();
    return callDate <= now || call.status === 'completed';
  });

  const handleJoinCall = async (callId: string) => {
    const success = await joinCall(callId);
    if (success) {
      await fetchParticipants(callId);
    }
  };

  const handleLeaveCall = async (callId: string) => {
    const success = await leaveCall(callId);
    if (success) {
      await fetchParticipants(callId);
    }
  };

  if (showScheduler) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DemoCallScheduler
          onScheduled={() => setShowScheduler(false)}
          onCancel={() => setShowScheduler(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Demo Calls</h1>
          <p className="text-muted-foreground mt-2">
            Schedule and join demo calls to showcase your progress and get feedback
          </p>
        </div>
        
        <Button onClick={() => setShowScheduler(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Demo
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading demo calls...</p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming ({upcomingCalls.length})
            </TabsTrigger>
            <TabsTrigger value="my-calls" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              My Calls ({myCalls.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Past ({pastCalls.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingCalls.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingCalls.map((call) => (
                  <DemoCallCard
                    key={call.id}
                    call={call}
                    isOwner={call.user_id === user?.id}
                    onJoin={() => handleJoinCall(call.id)}
                    onLeave={() => handleLeaveCall(call.id)}
                    onJoinRoom={() => {/* Navigate to call room */}}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No upcoming demo calls</h3>
                  <p className="text-muted-foreground mb-4">
                    Schedule your first demo call to showcase your progress
                  </p>
                  <Button onClick={() => setShowScheduler(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Your First Demo
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="my-calls" className="space-y-4">
            {myCalls.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCalls.map((call) => (
                  <DemoCallCard
                    key={call.id}
                    call={call}
                    isOwner={true}
                    onJoinRoom={() => {/* Navigate to call room */}}
                    onViewDetails={() => {/* View call details */}}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No demo calls scheduled</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first demo call to start showcasing your work
                  </p>
                  <Button onClick={() => setShowScheduler(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Demo Call
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastCalls.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastCalls.map((call) => (
                  <DemoCallCard
                    key={call.id}
                    call={call}
                    isOwner={call.user_id === user?.id}
                    onViewDetails={() => {/* View recording/feedback */}}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No past demo calls</h3>
                  <p className="text-muted-foreground">
                    Your completed demo calls will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default DemoCallsDashboard;