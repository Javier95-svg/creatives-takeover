import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useWeeklyMission } from '@/hooks/decision-engine/useWeeklyMission';
import { Target, TrendingUp, CheckCircle2, Calendar, Edit2, Plus, AlertTriangle } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import {
  trackWeeklyMissionViewed,
  trackWeeklyMissionCreated,
  trackWeeklyMissionCompleted,
  trackWeeklyMissionMissed,
} from '@/lib/analytics';
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
import { Link } from 'react-router-dom';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useSubscription } from '@/hooks/useSubscription';
import { normalizePlan, type Plan } from '@/config/planPermissions';
import type { BizMapStage } from '@/lib/bizmapStages';

interface WeeklyMissionPanelProps {
  variant?: 'default' | 'compact';
}

const STAGE_MISSION_TEMPLATES: Record<BizMapStage, Record<Plan, string>> = {
  IDENTITY: {
    rookie: 'complete my ICP draft and identify the single customer pain I will validate next',
    starter: 'turn my ICP into a clear waitlist promise and one validation question',
    rising: 'tighten the ICP, buying trigger, and first traction hypothesis before expanding execution',
    pro: 'pressure-test the ICP against the highest-value customer segment and investor narrative',
  },
  PROTOTYPE: {
    rookie: 'turn my customer pain into a simple landing promise I can explain clearly',
    starter: 'publish or improve my waitlist page and share it with qualified target customers',
    rising: 'ship the strongest demand-capture version and review early signup quality',
    pro: 'connect prototype messaging to traction proof and investor-ready positioning',
  },
  VALIDATING: {
    rookie: 'collect one honest customer signal and write down what it changes',
    starter: 'run a focused validation loop and record the strongest buying or rejection signal',
    rising: 'increase validation evidence and decide what must change before building',
    pro: 'separate real pull from polite feedback and translate the signal into a sharper growth thesis',
  },
  BUILDING: {
    rookie: 'define the smallest useful version of the product before adding scope',
    starter: 'convert validation signals into a build-ready task list',
    rising: 'ship one meaningful MVP improvement tied directly to validated demand',
    pro: 'move the build toward a traction milestone that strengthens the fundraising story',
  },
  LAUNCH: {
    rookie: 'choose one launch channel and one message to test',
    starter: 'prepare one launch asset and send it to a small qualified audience',
    rising: 'run a focused GTM experiment and measure the result',
    pro: 'turn launch activity into a measurable traction update for partners or investors',
  },
};

function buildStageMission(stage: BizMapStage, plan: Plan) {
  return STAGE_MISSION_TEMPLATES[stage]?.[plan] ?? STAGE_MISSION_TEMPLATES.IDENTITY.rookie;
}

export function WeeklyMissionPanel({ variant = 'default' }: WeeklyMissionPanelProps) {
  const {
    currentMission,
    recentMissions,
    linkedTasks,
    isLoading,
    error,
    createMission,
    updateMission,
    reviewMission,
  } = useWeeklyMission();
  const { currentStage } = useBizMapProgress();
  const { subscriptionData } = useSubscription();
  const plan = normalizePlan(subscriptionData?.subscription_tier);
  const didAutoCreate = useRef(false);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isMissedDialogOpen, setIsMissedDialogOpen] = useState(false);
  const [newMissionGoal, setNewMissionGoal] = useState('');
  const [editedMissionGoal, setEditedMissionGoal] = useState('');
  const [missedReflection, setMissedReflection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCompact = variant === 'compact';

  useEffect(() => {
    trackWeeklyMissionViewed();
  }, []);

  useEffect(() => {
    if (didAutoCreate.current || isLoading || error || currentMission) return;

    didAutoCreate.current = true;
    void createMission(buildStageMission(currentStage, plan), 'stage_weekly');
  }, [createMission, currentMission, currentStage, error, isLoading, plan]);

  // Handle create mission
  const handleCreateMission = async () => {
    if (!newMissionGoal.trim()) return;

    setIsSubmitting(true);
    try {
      const mission = await createMission(newMissionGoal.trim());
      if (mission) {
        trackWeeklyMissionCreated({ mission_id: mission.id });
      }
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
    setIsSubmitting(true);
    try {
      await reviewMission(currentMission.id, 'completed');
      trackWeeklyMissionCompleted({ mission_id: currentMission.id });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMissedMission = async () => {
    if (!currentMission) return;

    setIsSubmitting(true);
    try {
      await reviewMission(currentMission.id, 'missed', missedReflection);
      trackWeeklyMissionMissed({
        mission_id: currentMission.id,
        has_reflection: Boolean(missedReflection.trim()),
      });
      setMissedReflection('');
      setIsMissedDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit dialog
  const openEditDialog = () => {
    if (currentMission) {
      setEditedMissionGoal(currentMission.mission_goal);
      setIsEditDialogOpen(true);
    }
  };

  const openMissedDialog = () => {
    setMissedReflection(currentMission?.reflection_text || '');
    setIsMissedDialogOpen(true);
  };

  const historyItems = recentMissions
    .filter((mission) => mission.id !== currentMission?.id)
    .slice(0, 3);

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
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
      <Card className="border-destructive/30 bg-destructive/10 text-slate-100">
        <CardHeader>
          <CardTitle className="text-destructive">Unable to load weekly mission</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // No mission state - Show create prompt
  if (!currentMission) {
    if (isCompact) {
      return (
        <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-base">Accountability Log</CardTitle>
                <CardDescription className="text-xs mt-1">
                  The live weekly commitment stays in the hero. This panel keeps review and recent history close.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {historyItems.length > 0 ? (
              <div className="space-y-3">
                {historyItems.map((mission) => (
                <div key={mission.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {new Date(mission.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(mission.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${mission.commitment_outcome === 'missed' || mission.status === 'abandoned' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'bg-green-500/10 text-green-700 dark:text-green-300'}`}>
                        {mission.commitment_outcome === 'missed' || mission.status === 'abandoned' ? 'Not done' : 'Done'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">{mission.mission_goal}</p>
                    {mission.reflection_text?.trim() ? (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        Blocker: {mission.reflection_text.trim()}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-500">
                No accountability history yet. Set this week&apos;s commitment in the hero, then close it out here at the end of the week.
              </div>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link to="/weekly-mission">Open Weekly Commitment Workspace</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border border-dashed border-white/15 bg-white/[0.035] text-slate-100 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Set This Week&apos;s Commitment</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Write the one sentence you want to hold yourself to this week.
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
                Write Weekly Commitment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Your Weekly Commitment</DialogTitle>
                <DialogDescription>
                  Finish the sentence in your own words. Keep it to one outcome, not a task list.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">This week, I will...</label>
                  <Textarea
                    placeholder="e.g., run 10 customer interviews and identify the top buying trigger"
                    value={newMissionGoal}
                    onChange={(e) => setNewMissionGoal(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="bg-cyan-400/10 border border-cyan-400/20 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    Great commitments are outcome-focused, uncomfortable enough to matter, and small enough to finish this week.
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
                  {isSubmitting ? 'Saving...' : 'Save Commitment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Examples:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• This week, I will ship my waitlist page and send it to 20 target users</li>
              <li>• This week, I will complete 15 customer interviews and name the top pain point</li>
              <li>• This week, I will close 3 pilot calls with qualified prospects</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  const weekStart = new Date(currentMission.week_start_date);
  const weekEnd = new Date(currentMission.week_end_date);
  const daysRemaining = Math.ceil((weekEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const completionPercentage = currentMission.completion_percentage ?? 0;
  const isReviewed = currentMission.status !== 'active';
  const missedCommitment = currentMission.commitment_outcome === 'missed';

  if (isReviewed) {
    if (isCompact) {
      return (
        <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                <div>
                  <CardTitle className="text-base">Accountability Log</CardTitle>
                  <CardDescription className="text-xs">
                    Last review plus recent weekly commitments.
                  </CardDescription>
                </div>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-medium ${missedCommitment ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'bg-green-500/10 text-green-700 dark:text-green-300'}`}>
                {missedCommitment ? 'Not done' : 'Done'}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Last commitment</p>
              <p className="mt-2 text-sm font-medium leading-relaxed">{currentMission.mission_goal}</p>
              {currentMission.reflection_text?.trim() ? (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Blocker: {currentMission.reflection_text.trim()}
                </p>
              ) : null}
            </div>
            {historyItems.length > 0 ? (
              <div className="space-y-3">
                {historyItems.map((mission) => (
                  <div key={mission.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {new Date(mission.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(mission.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${mission.commitment_outcome === 'missed' || mission.status === 'abandoned' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'bg-green-500/10 text-green-700 dark:text-green-300'}`}>
                        {mission.commitment_outcome === 'missed' || mission.status === 'abandoned' ? 'Not done' : 'Done'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">{mission.mission_goal}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <Button asChild variant="outline" className="w-full">
              <Link to="/weekly-mission">Open Weekly Commitment Workspace</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle className="text-base">Weekly Commitment Review</CardTitle>
                <CardDescription className="text-xs">
                  {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </CardDescription>
              </div>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-medium ${missedCommitment ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'bg-green-500/10 text-green-700 dark:text-green-300'}`}>
              {missedCommitment ? 'Not done' : 'Done'}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">This week, I will</p>
            <p className="mt-2 text-sm font-medium leading-relaxed">{currentMission.mission_goal}</p>
          </div>

          {missedCommitment ? (
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-orange-500" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">What got in the way</p>
                  <p className="text-sm text-muted-foreground">
                    {currentMission.reflection_text?.trim() || 'No reflection saved yet.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Commitment closed</p>
                <p className="text-sm text-muted-foreground">You finished what you said you would do this week.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle className="text-base">{isCompact ? 'Accountability Log' : 'Weekly Commitment'}</CardTitle>
              <CardDescription className="text-xs">
                {isCompact
                  ? 'Support surface for closeout and recent history.'
                  : `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
              </CardDescription>
            </div>
          </div>

          {!isCompact ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openEditDialog}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Commitment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCompleteMission} disabled={isSubmitting}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Done
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openMissedDialog} className="text-orange-600 focus:text-orange-600">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Mark Not Done
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{isCompact ? 'Current commitment' : 'This week, I will'}</p>
          <p className="mt-2 text-sm font-medium leading-relaxed">{currentMission.mission_goal}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{completionPercentage.toFixed(0)}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

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

        {isCompact ? (
          <div className="flex flex-wrap gap-3 pt-2">
            <Button size="sm" onClick={handleCompleteMission} disabled={isSubmitting}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark Done
            </Button>
            <Button size="sm" variant="outline" onClick={openMissedDialog} disabled={isSubmitting}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Mark Not Done
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/weekly-mission">Open Full Workspace</Link>
            </Button>
          </div>
        ) : null}

        {isCompact && historyItems.length > 0 ? (
          <div className="space-y-3 border-t border-border/60 pt-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Recent weeks</p>
            {historyItems.map((mission) => (
              <div key={mission.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {new Date(mission.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(mission.week_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${mission.commitment_outcome === 'missed' || mission.status === 'abandoned' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'bg-green-500/10 text-green-700 dark:text-green-300'}`}>
                    {mission.commitment_outcome === 'missed' || mission.status === 'abandoned' ? 'Not done' : 'Done'}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">{mission.mission_goal}</p>
              </div>
            ))}
          </div>
        ) : null}

        {completionPercentage >= 80 && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-green-600">Almost there!</p>
              <p className="text-xs text-muted-foreground">You&apos;re {completionPercentage.toFixed(0)}% complete. Keep going!</p>
            </div>
          </div>
        )}

        {daysRemaining <= 1 && daysRemaining >= 0 && completionPercentage < 50 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-start gap-2">
            <Calendar className="h-4 w-4 text-orange-500 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-orange-600">Time&apos;s running out</p>
              <p className="text-xs text-muted-foreground">
                {daysRemaining === 0 ? 'Last day to complete your commitment' : '1 day left. Cut scope and finish the one outcome that matters.'}
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Edit Mission Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Weekly Commitment</DialogTitle>
            <DialogDescription>
              Keep the commitment honest. Tighten the wording if your real focus changed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">This week, I will...</label>
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

      <Dialog open={isMissedDialogOpen} onOpenChange={setIsMissedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Out This Week</DialogTitle>
            <DialogDescription>
              If you did not complete the commitment, note what got in the way so next week starts from reality.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">This week, I will</p>
              <p className="mt-2 text-sm font-medium leading-relaxed">{currentMission.mission_goal}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">What got in the way?</label>
              <Textarea
                value={missedReflection}
                onChange={(e) => setMissedReflection(e.target.value)}
                placeholder="e.g., I kept polishing the prototype instead of putting it in front of users."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsMissedDialogOpen(false);
                setMissedReflection('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleMissedMission} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Reflection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
