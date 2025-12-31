import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWeeklyMission } from '@/hooks/decision-engine/useWeeklyMission';
import { Target, TrendingUp, CheckCircle2, Calendar, Edit2, Trash2, Plus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

export function WeeklyMissionPanel() {
  const {
    currentMission,
    linkedTasks,
    isLoading,
    error,
    createMission,
    updateMission,
    completeMission,
    abandonMission,
  } = useWeeklyMission();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newMissionGoal, setNewMissionGoal] = useState('');
  const [editedMissionGoal, setEditedMissionGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle create mission
  const handleCreateMission = async () => {
    if (!newMissionGoal.trim()) return;

    setIsSubmitting(true);
    try {
      await createMission(newMissionGoal.trim());
      setNewMissionGoal('');
      setIsCreateDialogOpen(false);
    } catch (err) {
      console.error('Failed to create mission:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle update mission
  const handleUpdateMission = async () => {
    if (!currentMission || !editedMissionGoal.trim()) return;

    setIsSubmitting(true);
    try {
      await updateMission(currentMission.id, { mission_goal: editedMissionGoal.trim() });
      setEditedMissionGoal('');
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to update mission:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle complete mission
  const handleCompleteMission = async () => {
    if (!currentMission) return;
    await completeMission(currentMission.id);
  };

  // Handle abandon mission
  const handleAbandonMission = async () => {
    if (!currentMission) return;
    await abandonMission(currentMission.id);
  };

  // Open edit dialog
  const openEditDialog = () => {
    if (currentMission) {
      setEditedMissionGoal(currentMission.mission_goal);
      setIsEditDialogOpen(true);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-background">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500 animate-pulse" />
            <CardTitle>Weekly Mission</CardTitle>
          </div>
          <CardDescription>Loading your weekly mission...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-2 border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Unable to load weekly mission</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // No mission state - Show create prompt
  if (!currentMission) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/30 bg-muted/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">No Weekly Mission Set</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Set one clear outcome you want to achieve this week
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Set Weekly Mission
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Your Weekly Mission</DialogTitle>
                <DialogDescription>
                  What's the ONE outcome you want to achieve this week?
                  Make it specific and measurable.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mission Goal</label>
                  <Textarea
                    placeholder="e.g., Launch beta version to 10 users and collect feedback"
                    value={newMissionGoal}
                    onChange={(e) => setNewMissionGoal(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Tip:</strong> Great weekly missions are outcome-focused (not task lists),
                    achievable in 5-7 days, and clearly measurable.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setNewMissionGoal('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateMission}
                  disabled={!newMissionGoal.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Mission'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Examples:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Ship MVP with 3 core features to 5 beta users</li>
              <li>• Complete 15 customer interviews and identify top pain point</li>
              <li>• Reach $1K MRR by closing 3 new customers</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active mission state
  const weekStart = new Date(currentMission.week_start_date);
  const weekEnd = new Date(currentMission.week_end_date);
  const daysRemaining = Math.ceil((weekEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const completionPercentage = currentMission.completion_percentage;

  return (
    <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 via-background to-background">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle className="text-base">Weekly Mission</CardTitle>
              <CardDescription className="text-xs">
                {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openEditDialog}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Mission
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCompleteMission}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark Complete
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAbandonMission} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Abandon Mission
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mission Goal */}
        <div>
          <p className="text-sm font-medium leading-relaxed">
            {currentMission.mission_goal}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{completionPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Days Left</p>
              <p className="font-semibold">
                {daysRemaining > 0 ? `${daysRemaining} days` : daysRemaining === 0 ? 'Last day!' : 'Overdue'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-muted-foreground">Linked Tasks</p>
              <p className="font-semibold">{linkedTasks.length} tasks</p>
            </div>
          </div>
        </div>

        {/* Completion Badge */}
        {completionPercentage >= 80 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-green-600">Almost there!</p>
              <p className="text-xs text-muted-foreground">You're {completionPercentage.toFixed(0)}% complete. Keep going!</p>
            </div>
          </div>
        )}

        {/* Urgency Warning */}
        {daysRemaining <= 1 && daysRemaining >= 0 && completionPercentage < 50 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-start gap-2">
            <Calendar className="h-4 w-4 text-orange-500 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-orange-600">Time's running out!</p>
              <p className="text-xs text-muted-foreground">
                {daysRemaining === 0 ? 'Last day to complete your mission' : '1 day left - focus on what matters most'}
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Edit Mission Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Weekly Mission</DialogTitle>
            <DialogDescription>
              Update your mission goal to better reflect your focus for the week.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mission Goal</label>
              <Textarea
                value={editedMissionGoal}
                onChange={(e) => setEditedMissionGoal(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditedMissionGoal('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateMission}
              disabled={!editedMissionGoal.trim() || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
