import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Zap, Users, Target } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useSprints } from '@/hooks/useSprints';
import { useCommitments } from '@/hooks/useCommitments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
  const { createSprint, createSprintTasks } = useSprints();
  const { 
    userActiveCommitments, 
    createCommitment, 
    verifyCommitment, 
    resolveCommitment, 
    cancelCommitment 
  } = useCommitments();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCommitmentCreator, setShowCommitmentCreator] = useState(false);
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

      if (error) throw error;

      if (data?.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
        setGeneratedTasks(data.tasks);
        
        toast({
          title: "Tasks Generated!",
          description: `Generated ${data.tasks.length} actionable tasks from your idea`,
        });
      } else {
        toast({
          title: "No Tasks Generated",
          description: "The AI didn't return any tasks. Please try with a more detailed description.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      toast({
        title: "Generation Failed",
        description: error?.message || "Failed to generate tasks. Please try again.",
        variant: "destructive",
      });
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

    try {
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

      toast({
        title: "Sprint Created!",
        description: "Your sprint is ready. Time to start shipping!",
      });

      onSprintCreated?.(sprint.id);
    } catch (error) {
      console.error('Error creating sprint:', error);
    }
  };

  const handleCommitmentCreated = async (data: any) => {
    const result = await createCommitment(data);
    if (result) {
      setShowCommitmentCreator(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Sprint Setup</TabsTrigger>
          <TabsTrigger value="tasks">AI Tasks</TabsTrigger>
          <TabsTrigger value="commitments">Commitments ({userActiveCommitments.length})</TabsTrigger>
        </TabsList>

        {/* Sprint Setup Tab */}
        <TabsContent value="setup" className="mt-6">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Sprint Setup
              </CardTitle>
              <CardDescription>
                Define your sprint goals and timeline
              </CardDescription>
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
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, startDate: date }))}
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
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, endDate: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

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

                <Button
                  onClick={handleCreateSprint}
                  disabled={!formData.title.trim()}
                  size="lg"
                  className="w-full mt-6"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Create Sprint & Start Shipping
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Tasks Tab */}
        <TabsContent value="tasks" className="mt-6">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-secondary" />
                AI Task Generator
              </CardTitle>
              <CardDescription>
                Let AI break down your idea into actionable tasks
              </CardDescription>
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
                  readOnly={businessPlanData ? true : false}
                />
              </div>
              
              {businessPlanData && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border-l-4 border-primary">
                  <p className="font-medium text-primary mb-1">✓ Business Plan Integrated</p>
                  <p>Your comprehensive business plan has been automatically loaded to generate highly targeted sprint tasks.</p>
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
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-green-600">
                    ✓ Generated {generatedTasks.length} Tasks
                  </Label>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {generatedTasks.map((task, index) => (
                      <div key={index} className="text-xs p-2 bg-muted rounded border-l-2 border-primary">
                        <div className="font-medium">{task.title}</div>
                        <div className="text-muted-foreground">{task.estimated_hours}h • {task.priority}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commitments Tab */}
        <TabsContent value="commitments" className="mt-6 space-y-6">
          {showCommitmentCreator ? (
            <CommitmentCreator
              onCommitmentCreated={handleCommitmentCreated}
              onCancel={() => setShowCommitmentCreator(false)}
            />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Public Commitments</CardTitle>
                      <CardDescription>
                        Stake credits on your goals for accountability and rewards
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowCommitmentCreator(true)}>
                      <Target className="w-4 h-4 mr-2" />
                      New Commitment
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {userActiveCommitments.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="mb-4">No active commitments yet</p>
                      <Button onClick={() => setShowCommitmentCreator(true)}>
                        Create Your First Commitment
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Active Commitments */}
              {userActiveCommitments.length > 0 && (
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
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SprintPlanner;