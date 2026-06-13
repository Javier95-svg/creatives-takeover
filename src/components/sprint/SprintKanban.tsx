import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, 
  MessageSquare, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Users,
  TrendingUp,
  Video,
  Loader2
} from 'lucide-react';
import { Sprint, SprintTask, useSprints } from '@/hooks/useSprints';
import { format } from 'date-fns';
import TaskCard from './TaskCard';
import SprintComments from './SprintComments';
import { DailyCheckIn } from './DailyCheckIn';
import { AccountabilityPartnerIntegration } from './AccountabilityPartnerIntegration';
import { useAuth } from '@/contexts/AuthContext';
import DemoCallButton from './DemoCallButton';

interface SprintKanbanProps {
  sprint: Sprint;
  onStatusChange?: (status: Sprint['status']) => void;
}

const SprintKanban: React.FC<SprintKanbanProps> = ({ sprint, onStatusChange }) => {
  const { user } = useAuth();
  const {
    sprintTasks, 
    sprintComments,
    fetchSprintTasks, 
    fetchSprintComments,
    updateTaskStatus,
    updateSprintStatus,
    loading
  } = useSprints();
  
  const [showComments, setShowComments] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [taskStats, setTaskStats] = useState({
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
    totalHours: 0,
    completedHours: 0
  });

  useEffect(() => {
    if (sprint.id) {
      fetchSprintTasks(sprint.id);
      fetchSprintComments(sprint.id);
    }
  }, [sprint.id, fetchSprintTasks, fetchSprintComments]);

  useEffect(() => {
    const stats = sprintTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      acc.totalHours += task.estimated_hours;
      if (task.status === 'done' && task.actual_hours) {
        acc.completedHours += task.actual_hours;
      }
      return acc;
    }, {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
      totalHours: 0,
      completedHours: 0
    });
    setTaskStats(stats);
  }, [sprintTasks]);

  const handleStatusChange = async (newStatus: Sprint['status']) => {
    setIsUpdatingStatus(true);
    try {
      await updateSprintStatus(sprint.id, newStatus);
      onStatusChange?.(newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: Sprint['status']) => {
    switch (status) {
      case 'planning': return 'bg-[hsl(var(--blue-primary))]';
      case 'active': return 'bg-[hsl(var(--green-primary))]';
      case 'completed': return 'bg-purple-500';
      case 'paused': return 'bg-warning';
      default: return 'bg-gray-500';
    }
  };

  const getTasksByStatus = (status: SprintTask['status']) => {
    return sprintTasks.filter(task => task.status === status);
  };

  const progressPercentage = sprintTasks.length > 0 
    ? Math.round((taskStats.done / sprintTasks.length) * 100) 
    : 0;

  const columns = [
    { id: 'todo', title: 'To Do', status: 'todo' as const, icon: Clock, color: 'border-border' },
    { id: 'in_progress', title: 'In Progress', status: 'in_progress' as const, icon: Play, color: 'border-info' },
    { id: 'review', title: 'Review', status: 'review' as const, icon: AlertCircle, color: 'border-warning' },
    { id: 'done', title: 'Done', status: 'done' as const, icon: CheckCircle, color: 'border-success' },
  ];

  return (
    <div className="space-y-6">
      {/* Sprint Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(sprint.status)}`} />
                <CardTitle className="text-2xl creatives-font">{sprint.title}</CardTitle>
                <Badge variant="outline" className="capitalize">
                  {sprint.status}
                </Badge>
                {sprint.community_visible && (
                  <Badge variant="secondary" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    Community
                  </Badge>
                )}
              </div>
              
              {sprint.description && (
                <p className="text-muted-foreground mb-4">{sprint.description}</p>
              )}

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(sprint.start_date), 'MMM dd')} - {format(new Date(sprint.end_date), 'MMM dd')}
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {progressPercentage}% Complete
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {taskStats.completedHours}h / {taskStats.totalHours}h
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {sprint.status === 'planning' && (
                <Button onClick={() => handleStatusChange('active')} size="sm" disabled={isUpdatingStatus}>
                  {isUpdatingStatus ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  Start Sprint
                </Button>
              )}
              {sprint.status === 'active' && (
                <>
                  <Button onClick={() => handleStatusChange('paused')} variant="outline" size="sm" disabled={isUpdatingStatus}>
                    {isUpdatingStatus ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Pause className="w-4 h-4 mr-1" />
                    )}
                    Pause
                  </Button>
                  <Button onClick={() => handleStatusChange('completed')} variant="outline" size="sm" disabled={isUpdatingStatus}>
                    {isUpdatingStatus ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    )}
                    Complete
                  </Button>
                </>
              )}
              {sprint.status === 'paused' && (
                <Button onClick={() => handleStatusChange('active')} variant="outline" size="sm" disabled={isUpdatingStatus}>
                  {isUpdatingStatus ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  Resume
                </Button>
              )}

              {/* Demo Call Button - show for active or completed sprints */}
              {(sprint.status === 'active' || sprint.status === 'completed') && (
                <DemoCallButton sprint={sprint} />
              )}
              
              {sprint.community_visible && (
                <Button 
                  onClick={() => setShowComments(!showComments)}
                  variant="outline" 
                  size="sm"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Comments ({sprintComments.length})
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Sprint Progress</span>
              <span>
                {sprintTasks.length > 0 
                  ? `${taskStats.done} of ${sprintTasks.length} tasks completed`
                  : 'No tasks yet'}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Daily Check-in Section */}
      {user?.id === sprint.user_id && (
        <div className="mb-6">
          <DailyCheckIn 
            sprintId={sprint.id}
            sprintTitle={sprint.title}
            onCheckInComplete={() => {
              // Refresh sprint comments or any other data if needed
            }}
          />
        </div>
      )}

      {/* Comments Section */}
      {showComments && sprint.community_visible && (
        <SprintComments 
          sprintId={sprint.id} 
          comments={sprintComments}
          onCommentAdded={() => fetchSprintComments(sprint.id)}
        />
      )}

      {/* Kanban Board */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading tasks...</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map((column) => {
            const tasks = getTasksByStatus(column.status);
            const Icon = column.icon;
            
            return (
              <Card key={column.id} className={`${column.color} border-2`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {column.title}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {tasks.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tasks.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8 border-2 border-dashed rounded-lg">
                      <Icon className="w-6 h-6 mx-auto mb-2 opacity-30" />
                      <p>No tasks in {column.title.toLowerCase()}</p>
                      {column.status === 'todo' && (
                        <p className="text-xs mt-1">Generate tasks to get started</p>
                      )}
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={(newStatus, actualHours) => 
                          updateTaskStatus(task.id, newStatus, actualHours)
                        }
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SprintKanban;