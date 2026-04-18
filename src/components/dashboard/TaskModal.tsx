import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Loader2, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  onTaskAdded?: () => void;
}

export const TaskModal = ({ open, onOpenChange, selectedDate, onTaskAdded }: TaskModalProps) => {
  const { user } = useAuth();
  const [taskText, setTaskText] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskDate, setTaskDate] = useState<Date | undefined>(selectedDate || new Date());
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!taskText.trim() || !taskDate || !deadlineTime || !user) return;

    setIsSubmitting(true);
    try {
      // Combine date and time into a single timestamp
      const [hours, minutes] = deadlineTime.split(':').map(Number);
      const deadlineDateTime = new Date(taskDate);
      deadlineDateTime.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from('daily_tasks')
        .insert({
          user_id: user.id,
          task_text: taskText.trim(),
          priority,
          task_date: format(taskDate, 'yyyy-MM-dd'),
          deadline_time: deadlineDateTime.toISOString()
        });

      if (error) throw error;

      toast.success('Task added successfully! You\'ll receive reminders every 3 hours.');
      setTaskText('');
      setPriority('medium');
      setDeadlineTime('23:59');
      onOpenChange(false);
      onTaskAdded?.();
    } catch (error: unknown) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Add Task
          </DialogTitle>
          <DialogDescription>
            Create a dated task with a deadline so it appears in your dashboard workflow and reminder cycle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="task">What do you need to do?</Label>
            <Textarea
              id="task"
              placeholder="Example: Call 3 potential customers / Design new banner / Write blog post"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              className="min-h-[100px]"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Task Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !taskDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {taskDate ? format(taskDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={taskDate}
                  onSelect={setTaskDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline-time">Deadline Time *</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="deadline-time"
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="pl-9 sm:pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You'll receive reminders every 3 hours until completion
            </p>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <RadioGroup
              value={priority}
              onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="cursor-pointer font-normal">
                  <span className="text-[hsl(var(--blue-primary))]">●</span> Low
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="cursor-pointer font-normal">
                  <span className="text-orange-500">●</span> Medium
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="cursor-pointer font-normal">
                  <span className="text-[hsl(var(--red-primary))]">●</span> High
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setTaskText('');
                setPriority('medium');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!taskText.trim() || !taskDate || !deadlineTime || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Task'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
