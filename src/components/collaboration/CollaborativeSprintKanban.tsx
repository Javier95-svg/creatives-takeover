import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import TaskCard from '@/components/sprint/TaskCard';
import SprintComments from '@/components/sprint/SprintComments';
import { DailyCheckIn } from '@/components/sprint/DailyCheckIn';
import DemoCallButton from '@/components/sprint/DemoCallButton';
import { supabase } from '@/integrations/supabase/client';
import { PresenceIndicator } from './PresenceIndicator';
import { LiveComments } from './LiveComments';
import { EnhancedPresenceIndicator } from './EnhancedPresenceIndicator';
import { LiveChat } from './LiveChat';
import { VoiceVideoCall } from './VoiceVideoCall';
import { NotificationCenter } from './NotificationCenter';
import { ActivityFeed } from './ActivityFeed';
import { useCollaboration } from '@/hooks/useCollaboration';
import { useEnhancedCollaboration } from '@/hooks/useEnhancedCollaboration';
import { useSprints } from '@/hooks/useSprints';
import { useAuth } from '@/contexts/AuthContext';
import { Sprint, SprintTask } from '@/hooks/useSprints';
import { 
  Calendar, 
  Clock, 
  Target, 
  Users, 
  MessageSquare,
  Zap,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  CheckSquare 
} from 'lucide-react';

interface CollaborativeSprintKanbanProps {
  sprint: Sprint;
  onStatusChange?: (status: Sprint['status']) => void;
}

export const CollaborativeSprintKanban: React.FC<CollaborativeSprintKanbanProps> = ({
  sprint,
  onStatusChange,
}) => {
  const { user } = useAuth();
  const { sprintTasks: allSprintTasks, updateTaskStatus, fetchSprintTasks } = useSprints();
  const [showComments, setShowComments] = useState(false);
  
  // Initialize collaboration for this sprint
  const {
    session,
    activeUsers,
    comments,
    loading: collaborationLoading,
    addComment,
    resolveComment,
  } = useCollaboration('sprint', sprint.id);

  // Initialize enhanced collaboration features
  const {
    messages,
    userStatuses,
    notifications,
    activities,
    activeCall,
    sendMessage,
    updateUserStatus,
    markNotificationAsRead,
    startCall,
    endCall,
  } = useEnhancedCollaboration(session?.id || '');

  // Set up real-time task updates
  useEffect(() => {
    if (sprint.id) {
      fetchSprintTasks(sprint.id);

      // Subscribe to task changes via Supabase realtime
      const channel = supabase
        .channel(`sprint_tasks:${sprint.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sprint_tasks',
            filter: `sprint_id=eq.${sprint.id}`,
          },
          () => {
            fetchSprintTasks(sprint.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [sprint.id]);

  // Calculate sprint statistics
  const sprintTasks = allSprintTasks[sprint.id] || [];
  const totalTasks = sprintTasks.length;
  const completedTasks = sprintTasks.filter(task => task.status === 'done').length;
  const inProgressTasks = sprintTasks.filter(task => task.status === 'in_progress').length;
  const todoTasks = sprintTasks.filter(task => task.status === 'todo').length;
  const reviewTasks = sprintTasks.filter(task => task.status === 'review').length;
  
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const totalEstimatedHours = sprintTasks.reduce((sum, task) => sum + (task.estimated_hours || 0), 0);
  const totalActualHours = sprintTasks.reduce((sum, task) => sum + (task.actual_hours || 0), 0);

  const handleStatusChange = (newStatus: Sprint['status']) => {
    onStatusChange?.(newStatus);
  };

  const handleTaskUpdate = async (taskId: string, newStatus: SprintTask['status'], actualHours?: number) => {
    await updateTaskStatus(taskId, newStatus, actualHours);
  };

  const getStatusIcon = (status: Sprint['status']) => {
    switch (status) {
      case 'planning': return <AlertCircle className="h-4 w-4" />;
      case 'active': return <Play className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Sprint['status']) => {
    switch (status) {
      case 'planning': return 'bg-warning';
      case 'active': return 'bg-success';
      case 'paused': return 'bg-warning';
      case 'completed': return 'bg-info';
      default: return 'bg-gray-500';
    }
  };

  if (collaborationLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sprint Header with Collaboration */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon(sprint.status)}
                {sprint.title}
                <Badge 
                  variant="outline" 
                  className={`text-white ${getStatusColor(sprint.status)}`}
                >
                  {sprint.status}
                </Badge>
              </CardTitle>
              <p className="text-muted-foreground">{sprint.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(sprint.start_date).toLocaleDateString()} - {new Date(sprint.end_date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {totalEstimatedHours}h estimated / {totalActualHours}h actual
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Enhanced Collaboration Presence */}
              <EnhancedPresenceIndicator 
                userStatuses={userStatuses}
                currentUserId={user?.id}
              />
              
              {/* Notifications */}
              <NotificationCenter
                notifications={notifications}
                onMarkAsRead={markNotificationAsRead}
              />
              
              {/* Live Comments Toggle */}
              <Sheet open={showComments} onOpenChange={setShowComments}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comments
                    {comments.filter(c => !c.is_resolved).length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {comments.filter(c => !c.is_resolved).length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-96">
                  <SheetHeader>
                    <SheetTitle>Sprint Collaboration</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 h-full">
                    <LiveComments
                      comments={comments}
                      onAddComment={addComment}
                      onResolveComment={resolveComment}
                      currentUserId={user?.id}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress: {completedTasks}/{totalTasks} tasks completed</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Status Controls */}
          {sprint.user_id === user?.id && (
            <div className="flex gap-2">
              {sprint.status === 'planning' && (
                <Button 
                  onClick={() => handleStatusChange('active')}
                  size="sm"
                  className="bg-success hover:bg-success"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Sprint
                </Button>
              )}
              {sprint.status === 'active' && (
                <>
                  <Button 
                    onClick={() => handleStatusChange('paused')}
                    variant="outline"
                    size="sm"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button 
                    onClick={() => handleStatusChange('completed')}
                    size="sm"
                    className="bg-info hover:bg-info"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Complete Sprint
                  </Button>
                </>
              )}
              {sprint.status === 'paused' && (
                <Button 
                  onClick={() => handleStatusChange('active')}
                  size="sm"
                  className="bg-success hover:bg-success"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume Sprint
                </Button>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* To Do Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              To Do
              <Badge variant="secondary">{todoTasks}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sprintTasks
              .filter(task => task.status === 'todo')
              .map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={(status, actualHours) => 
                    handleTaskUpdate(task.id, status, actualHours)
                  }
                />
              ))}
          </CardContent>
        </Card>

        {/* In Progress Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-info"></div>
              In Progress
              <Badge variant="secondary">{inProgressTasks}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sprintTasks
              .filter(task => task.status === 'in_progress')
              .map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={(status, actualHours) => 
                    handleTaskUpdate(task.id, status, actualHours)
                  }
                />
              ))}
          </CardContent>
        </Card>

        {/* Review Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-warning"></div>
              Review
              <Badge variant="secondary">{reviewTasks}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sprintTasks
              .filter(task => task.status === 'review')
              .map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={(status, actualHours) => 
                    handleTaskUpdate(task.id, status, actualHours)
                  }
                />
              ))}
          </CardContent>
        </Card>

        {/* Done Column */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              Done
              <Badge variant="secondary">{completedTasks}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sprintTasks
              .filter(task => task.status === 'done')
              .map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={(status, actualHours) => 
                    handleTaskUpdate(task.id, status, actualHours)
                  }
                />
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Collaboration Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Live Chat */}
        <LiveChat
          messages={messages}
          onSendMessage={sendMessage}
          currentUserId={user?.id}
        />
        
        {/* Voice/Video Call */}
        <VoiceVideoCall
          activeCall={activeCall}
          userStatuses={userStatuses}
          currentUserId={user?.id}
          onStartCall={startCall}
          onEndCall={endCall}
        />
        
        {/* Activity Feed */}
        <ActivityFeed activities={activities} />
      </div>

      {/* Additional Sprint Features */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DailyCheckIn sprintId={sprint.id} sprintTitle={sprint.title} />
        <SprintComments sprintId={sprint.id} comments={[]} onCommentAdded={() => {}} />
        <DemoCallButton sprint={sprint} />
      </div>
    </div>
  );
};