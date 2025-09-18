import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Clock, 
  MoreVertical, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Tag
} from 'lucide-react';
import { SprintTask } from '@/hooks/useSprints';
import { format } from 'date-fns';

interface TaskCardProps {
  task: SprintTask;
  onStatusChange: (status: SprintTask['status'], actualHours?: number) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [actualHours, setActualHours] = useState(task.actual_hours?.toString() || '');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-blue-500 text-white';
      case 'low': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo': return Clock;
      case 'in_progress': return Play;
      case 'review': return AlertTriangle;
      case 'done': return CheckCircle;
      default: return Clock;
    }
  };

  const handleStatusChange = (newStatus: SprintTask['status']) => {
    if (newStatus === 'done' && !task.actual_hours) {
      setIsEditing(true);
    } else {
      onStatusChange(newStatus, parseFloat(actualHours) || undefined);
    }
  };

  const handleComplete = () => {
    const hours = parseFloat(actualHours) || task.estimated_hours;
    onStatusChange('done', hours);
    setIsEditing(false);
  };

  const StatusIcon = getStatusIcon(task.status);

  return (
    <>
      <Card className="group hover:shadow-md transition-all duration-200 cursor-pointer relative overflow-hidden">
        {task.priority === 'urgent' && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
        )}
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm leading-tight mb-1 group-hover:text-primary transition-colors">
                {task.title}
              </h4>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {task.description}
                </p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {task.status !== 'todo' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('todo')}>
                    <Clock className="w-4 h-4 mr-2" />
                    Move to To Do
                  </DropdownMenuItem>
                )}
                {task.status !== 'in_progress' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('in_progress')}>
                    <Play className="w-4 h-4 mr-2" />
                    Start Working
                  </DropdownMenuItem>
                )}
                {task.status !== 'review' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('review')}>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Move to Review
                  </DropdownMenuItem>
                )}
                {task.status !== 'done' && (
                  <DropdownMenuItem onClick={() => handleStatusChange('done')}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            {/* Priority and Status */}
            <div className="flex items-center gap-2">
              <Badge className={`text-xs px-2 py-0.5 ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <StatusIcon className="w-3 h-3" />
                <span className="capitalize">{task.status.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Time Estimate */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  {task.actual_hours ? `${task.actual_hours}h actual` : `${task.estimated_hours}h estimated`}
                </span>
              </div>
              
              {task.due_date && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(task.due_date), 'MMM dd')}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <Tag className="w-3 h-3 text-muted-foreground" />
                {task.tags.slice(0, 2).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                    {tag}
                  </Badge>
                ))}
                {task.tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">+{task.tags.length - 2}</span>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-1 pt-1">
              {task.status === 'todo' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 text-xs px-2 flex-1"
                  onClick={() => handleStatusChange('in_progress')}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </Button>
              )}
              
              {task.status === 'in_progress' && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 text-xs px-2 flex-1"
                    onClick={() => handleStatusChange('review')}
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Review
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 text-xs px-2 flex-1"
                    onClick={() => handleStatusChange('done')}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Done
                  </Button>
                </>
              )}
              
              {task.status === 'review' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-6 text-xs px-2 flex-1"
                  onClick={() => handleStatusChange('done')}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Complete
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Tracking Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">{task.title}</h4>
              <p className="text-sm text-muted-foreground">
                How many hours did this task actually take?
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="actual-hours">Actual Hours</Label>
              <Input
                id="actual-hours"
                type="number"
                step="0.5"
                min="0"
                placeholder={task.estimated_hours.toString()}
                value={actualHours}
                onChange={(e) => setActualHours(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Estimated: {task.estimated_hours} hours
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleComplete}>
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskCard;