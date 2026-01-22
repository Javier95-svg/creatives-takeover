import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Zap, Users, Target, CheckCircle2, ArrowDown, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { useSprints } from '@/hooks/useSprints';
import { useCommitments } from '@/hooks/useCommitments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import CommitmentCreator from './CommitmentCreator';
import CommitmentCard from './CommitmentCard';

interface SprintPlannerProps {
  onSprintCreated?: (sprintId: string) => void;
  businessPlanData?: {
    answers: any;
    launchReport?: string;
    successScore?: any;
  };
}

const SprintPlanner: React.FC<SprintPlannerProps> = ({ onSprintCreated, businessPlanData }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshBalance } = useCredits();
  const { ensureCredits, handleCreditError } = useCreditActions();
  const { createSprint, createSprintTasks, sprints, fetchSprints } = useSprints();
  const { checkFeatureAccess } = useFeatureGating();
  const { 
    userActiveCommitments, 
    createCommitment, 
    verifyCommitment, 
    resolveCommitment, 
    cancelCommitment 
  } = useCommitments();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showCommitmentCreator, setShowCommitmentCreator] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: businessPlanData?.answers?.overview ? 
      `Launch: ${businessPlanData.answers.overview.split(' ').slice(0, 6).join(' ')}...` : '',
    description: businessPlanData?.answers?.goals || '',
    fuzzyIdea: businessPlanData ? 
      `Business Overview: ${businessPlanData.answers?.overview || ''}\n\nTarget Market: ${businessPlanData.answers?.market || ''}\n\nSolution: ${businessPlanData.answers?.solution || ''}\n\nGoals: ${businessPlanData.answers?.goals || ''}` : '',
    isPublic: false,
    communityVisible: false,
    startDate: new Date(),
    endDate: addDays(new Date(), 14),
  });

  const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);

  const handleGenerateTasks = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to generate sprint tasks",
        variant: "destructive",
      });
      return;
    }

    if (!formData.fuzzyIdea.trim()) {
      toast({
        title: "Missing Information",
        description: "Please describe your idea to generate tasks",
        variant: "destructive",
      });
      return;
    }

    // Check credits before proceeding
    const requiredCredits = ensureCredits('SPRINT_TASK_GENERATION', {
      featureName: 'Sprint Task Generation',
    });
    if (requiredCredits === null) return;

    try {
      setIsGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('sprint-task-generator', {
        body: {
          fuzzyIdea: formData.fuzzyIdea,
          sprintTitle: formData.title,
          sprintDuration: Math.ceil((formData.endDate.getTime() - formData.startDate.getTime()) / (1000 * 3600 * 24)),
          businessPlan: businessPlanData?.answers,
          launchReport: businessPlanData?.launchReport,
          successScore: businessPlanData?.successScore
        }
      });

      if (error) {
        // Handle credit errors specifically
        if (handleCreditError(error, data, 'SPRINT_TASK_GENERATION', { featureName: 'Sprint Task Generation' })) {
          throw new Error('Insufficient credits');
        }
        throw error;
      }

      if (data?.error) {
        if (handleCreditError(null, data, 'SPRINT_TASK_GENERATION', { featureName: 'Sprint Task Generation' })) {
          throw new Error('Insufficient credits');
        }
        throw new Error(data.error);
      }

      if (data?.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
        setGeneratedTasks(data.tasks);
        
        toast({
          title: "Tasks Generated!",
          description: `Generated ${data.tasks.length} actionable tasks (Used ${requiredCredits} credits)`,
        });
        await refreshBalance();
      } else {
        toast({
          title: "No Tasks Generated",
          description: "The AI didn't return any tasks. Please try with a more detailed description.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate tasks. Please try again.";
      if (!errorMessage.includes('credits')) {
        toast({
          title: "Generation Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateSprint = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a sprint title",
        variant: "destructive",
      });
      return;
    }

    // Validate dates
    if (formData.endDate < formData.startDate) {
      setDateError("End date must be after start date");
      toast({
        title: "Invalid Dates",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    // Check for unlimited sprints access
    const unlimitedAccess = checkFeatureAccess('unlimited_sprints');
    if (!unlimitedAccess.hasAccess) {
      // Count active sprints
      const activeSprints = sprints?.filter(s => s.status === 'active' || s.status === 'planning') || [];
      if (activeSprints.length >= 1) {
        toast({
          title: "Sprint Limit Reached",
          description: unlimitedAccess.message || "Free tier is limited to 1 active sprint. Upgrade for unlimited sprints.",
          variant: "destructive",
        });
        // Optionally navigate to pricing
        setTimeout(() => {
          window.location.href = '/pricing';
        }, 2000);
        return;
      }
    }

    try {
      setIsCreating(true);
      const sprint = await createSprint({
        title: formData.title,
        description: formData.description,
        start_date: format(formData.startDate, 'yyyy-MM-dd'),
        end_date: format(formData.endDate, 'yyyy-MM-dd'),
        status: 'planning',
        is_public: formData.isPublic,
        community_visible: formData.communityVisible,
      });

      if (!sprint) return;

      if (generatedTasks.length > 0) {
        await createSprintTasks(sprint.id, generatedTasks);
      }

      setFormData({
        title: '',
        description: '',
        fuzzyIdea: '',
        isPublic: false,
        communityVisible: false,
        startDate: new Date(),
        endDate: addDays(new Date(), 14),
      });
      setGeneratedTasks([]);

      // Refresh sprints list
      await fetchSprints();

      toast({
        title: "Sprint Created!",
        description: "Your sprint is ready. Time to start shipping!",
      });

      onSprintCreated?.(sprint.id);
    } catch (error) {
      console.error('Error creating sprint:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create sprint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCommitmentCreated = async (data: any) => {
    const result = await createCommitment(data);
    if (result) {
      setShowCommitmentCreator(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold creatives-font bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {businessPlanData ? 'Turn Your Plan Into Action' : 'AI Sprint Planner'}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {businessPlanData ? 
            'Your business plan is ready! Now let\'s create actionable 2-week sprints to bring it to life.' :
            'Transform your fuzzy ideas into actionable 2-week sprints with time-boxed tasks and community accountability'
          }
        </p>
      </div>

      {/* STEP 1: Sprint Basics */}
      <div className="relative">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <CardHeader className="relative">
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
                formData.title.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {formData.title.trim() ? <CheckCircle2 className="w-5 h-5" /> : "1"}
              </div>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Sprint Basics
                </CardTitle>
                <CardDescription>
                  Define your sprint goals and timeline
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Sprint Title</Label>
              <Input
                id="title"
                placeholder="e.g., Launch My SaaS MVP"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional context about your sprint goals..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.startDate, 'MMM dd, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => {
                        if (date) {
                          setFormData(prev => {
                            const newStartDate = date;
                            let newEndDate = prev.endDate;
                            // If new start date is after end date, adjust end date
                            if (newStartDate > prev.endDate) {
                              newEndDate = addDays(newStartDate, 14);
                            }
                            setDateError(null);
                            return { ...prev, startDate: newStartDate, endDate: newEndDate };
                          });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.endDate, 'MMM dd, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => {
                        if (date) {
                          setFormData(prev => {
                            if (date < prev.startDate) {
                              setDateError("End date must be after start date");
                              return prev;
                            }
                            setDateError(null);
                            return { ...prev, endDate: date };
                          });
                        }
                      }}
                      initialFocus
                      disabled={(date) => date < formData.startDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {dateError && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md border border-destructive/20">
                {dateError}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Make Public</Label>
                  <p className="text-sm text-muted-foreground">Others can view this sprint</p>
                </div>
                <Switch
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Community Accountability</Label>
                  <p className="text-sm text-muted-foreground">Enable community nudges</p>
                </div>
                <Switch
                  checked={formData.communityVisible}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, communityVisible: checked }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Visual Connector */}
        <div className="flex justify-center my-4">
          <ArrowDown className="w-6 h-6 text-muted-foreground/40 animate-bounce" />
        </div>
      </div>

      {/* STEP 2: AI Task Generation */}
      <div className="relative">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5" />
          <CardHeader className="relative">
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
                generatedTasks.length > 0 ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {generatedTasks.length > 0 ? <CheckCircle2 className="w-5 h-5" /> : "2"}
              </div>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-secondary" />
                  AI Task Generation
                </CardTitle>
                <CardDescription>
                  Save hours of planning - let AI break down your idea into actionable tasks
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fuzzyIdea">
                {businessPlanData ? 'Your Business Plan Summary' : 'Describe Your Fuzzy Idea'}
              </Label>
              <Textarea
                id="fuzzyIdea"
                placeholder={businessPlanData ? 
                  "Your business plan details are pre-loaded. You can edit or add more context..." :
                  "I want to build a food delivery app for my local area. I have some basic coding skills but I'm not sure where to start or what steps to take..."
                }
                value={formData.fuzzyIdea}
                onChange={(e) => setFormData(prev => ({ ...prev, fuzzyIdea: e.target.value }))}
                rows={6}
                className="resize-none"
              />
            </div>
            
            {businessPlanData && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border-l-4 border-primary">
                <p className="font-medium text-primary mb-1">✓ Business Plan Integrated</p>
                <p>Your comprehensive business plan has been automatically loaded. You can edit or add more context to refine the task generation.</p>
              </div>
            )}

            <Button
              onClick={handleGenerateTasks}
              disabled={isGenerating || !formData.fuzzyIdea.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generating Tasks...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Sprint Tasks
                </>
              )}
            </Button>

            {generatedTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Generated {generatedTasks.length} Tasks
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGeneratedTasks([])}
                    className="text-xs h-7"
                  >
                    Clear
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3 bg-muted/30">
                  {generatedTasks.map((task, index) => (
                    <div key={index} className="text-sm p-3 bg-background rounded border border-border hover:border-primary/50 transition-colors">
                      <div className="font-medium mb-1">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.estimated_hours}h
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {task.priority}
                        </Badge>
                        {task.tags && task.tags.length > 0 && (
                          <span className="text-xs">Tags: {task.tags.slice(0, 2).join(', ')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  ✓ Tasks are ready to be added to your sprint. You can create the sprint now or generate more tasks.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visual Connector */}
        <div className="flex justify-center my-4">
          <ArrowDown className="w-6 h-6 text-muted-foreground/40 animate-bounce" />
        </div>
      </div>

      {/* STEP 3: Public Commitments (Optional) */}
      <div className="relative">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <CardHeader className="relative">
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0",
                userActiveCommitments.length > 0 ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              )}>
                {userActiveCommitments.length > 0 ? <CheckCircle2 className="w-5 h-5" /> : "3"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-accent" />
                    Public Commitments
                  </CardTitle>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Optional
                  </span>
                </div>
                <CardDescription>
                  Stake credits on your goals - earn 10% bonus for achievement, verified by community
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            {showCommitmentCreator ? (
              <CommitmentCreator
                onCommitmentCreated={handleCommitmentCreated}
                onCancel={() => setShowCommitmentCreator(false)}
              />
            ) : (
              <>
                {userActiveCommitments.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground mb-4">No active commitments yet</p>
                    <Button onClick={() => setShowCommitmentCreator(true)} variant="outline">
                      <Target className="w-4 h-4 mr-2" />
                      Make Your First Commitment
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-sm font-medium">
                        Your Active Commitments ({userActiveCommitments.length})
                      </Label>
                      <Button onClick={() => setShowCommitmentCreator(true)} size="sm">
                        <Target className="w-4 h-4 mr-2" />
                        New Commitment
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {userActiveCommitments.map(commitment => (
                        <CommitmentCard
                          key={commitment.id}
                          commitment={commitment}
                          onVerify={verifyCommitment}
                          onResolve={resolveCommitment}
                          onCancel={cancelCommitment}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Final CTA */}
      <Card className="relative overflow-hidden border-2 border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10" />
        <CardContent className="relative py-8">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Ready to Start Shipping?</h3>
              <p className="text-sm text-muted-foreground">
                {generatedTasks.length > 0 
                  ? `Your sprint has ${generatedTasks.length} AI-generated tasks ready to go`
                  : 'Create your sprint and add tasks as you go'}
              </p>
            </div>
            <Button
              onClick={handleCreateSprint}
              disabled={!formData.title.trim() || isCreating || !!dateError}
              size="lg"
              className="w-full max-w-md mx-auto text-lg h-14"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Sprint...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5 mr-2" />
                  Create Sprint & Start Shipping
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default SprintPlanner;
