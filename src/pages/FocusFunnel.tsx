import { useEffect, useMemo, useRef, useState } from 'react';
import { useFocusFunnel } from '@/hooks/focus-funnel';
import { useAuth } from '@/contexts/AuthContext';
import { streamChat } from '@/hooks/useStreamingChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { SortableList } from '@/components/ui/sortable-list';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  Brain,
  CheckCircle2,
  FolderKanban,
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

type AiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const QUICK_PROMPTS = [
  'Prioritize my next actions for this week.',
  'Where am I leaking time or momentum?',
  'Help me decide what to cut or delegate.',
  'Draft next actions for the selected project.',
];

const FocusFunnel = () => {
  const { user } = useAuth();
  const {
    goals,
    projects,
    tasks,
    overdueTasks,
    error,
    createGoal,
    createProject,
    createTask,
    updateTaskStatus,
    reorderGoals,
    reorderProjects,
    reorderTasks,
  } = useFocusFunnel();

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);

  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiStreaming, setAiStreaming] = useState(false);
  const sessionIdRef = useRef(
    `focus_funnel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  useEffect(() => {
    if (!selectedGoalId && goals.length > 0) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);

  useEffect(() => {
    if (selectedProjectId) {
      const stillExists = projects.some((project) => project.id === selectedProjectId);
      if (!stillExists) {
        setSelectedProjectId(null);
      }
    }
  }, [projects, selectedProjectId]);

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) || null,
    [goals, selectedGoalId]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const visibleProjects = useMemo(
    () => (selectedGoalId ? projects.filter((project) => project.goal_id === selectedGoalId) : projects),
    [projects, selectedGoalId]
  );

  const visibleTasks = useMemo(() => {
    if (selectedProjectId) {
      return tasks.filter((task) => task.project_id === selectedProjectId);
    }
    if (selectedGoalId) {
      return tasks.filter((task) => task.goal_id === selectedGoalId);
    }
    return tasks;
  }, [tasks, selectedGoalId, selectedProjectId]);

  const focusSnapshot = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== 'done').length;
    const activeGoals = goals.filter((goal) => goal.status === 'active').length;
    const activeProjects = projects.filter((project) => project.status !== 'completed').length;
    return {
      activeGoals,
      activeProjects,
      openTasks,
      overdue: overdueTasks.length,
    };
  }, [goals, projects, tasks, overdueTasks]);

  const buildContextSummary = () => {
    const goalSummary = selectedGoal ? `Selected goal: ${selectedGoal.title}` : 'No goal selected';
    const projectSummary = selectedProject
      ? `Selected project: ${selectedProject.title}`
      : 'No project selected';
    const topTasks = visibleTasks.slice(0, 5).map((task) => `- ${task.title}`).join('\n') || 'None';

    return [
      `Goals active: ${focusSnapshot.activeGoals}`,
      `Projects active: ${focusSnapshot.activeProjects}`,
      `Open tasks: ${focusSnapshot.openTasks}`,
      `Overdue tasks: ${focusSnapshot.overdue}`,
      goalSummary,
      projectSummary,
      'Top tasks:',
      topTasks,
    ].join('\n');
  };

  const guidedPrompts = [
    {
      title: 'Define desired outcome',
      description: 'Clarify the outcome and success criteria.',
      buildPrompt: () =>
        'Help me define a clear desired outcome for the next 90 days. Ask 3 clarifying questions and suggest success metrics.',
    },
    {
      title: 'Map strategy',
      description: selectedGoal ? `Strategize for "${selectedGoal.title}".` : 'Create strategies for my outcome.',
      buildPrompt: () =>
        selectedGoal
          ? `Based on the desired outcome "${selectedGoal.title}", propose 3 strategies with tradeoffs.`
          : 'Propose 3 strategies to reach my desired outcome. Ask me what constraints you need.',
    },
    {
      title: 'Draft actions',
      description: selectedProject
        ? `Draft actions for "${selectedProject.title}".`
        : selectedGoal
          ? `Draft actions for "${selectedGoal.title}".`
          : 'Turn the strategy into actions.',
      buildPrompt: () =>
        selectedProject
          ? `Draft 5 next actions for the strategy "${selectedProject.title}", each with expected impact.`
          : selectedGoal
            ? `Draft 5 next actions for the desired outcome "${selectedGoal.title}", ordered by impact.`
            : 'Draft 5 next actions to move the strategy forward. Ask what context you need.',
    },
  ];

  const handleAddGoal = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to add a goal.', variant: 'destructive' });
      return;
    }
    if (!goalTitle.trim()) {
      toast({ title: 'Add a goal title', description: 'Give your desired outcome a clear name.' });
      return;
    }
    if (isSavingGoal) return;
    setIsSavingGoal(true);
    const created = await createGoal({ title: goalTitle.trim(), priority: 3 });
    if (created) {
      setGoalTitle('');
      setSelectedGoalId(created.id);
    } else {
      toast({ title: 'Unable to add goal', description: 'Please try again in a moment.', variant: 'destructive' });
    }
    setIsSavingGoal(false);
  };

  const handleAddProject = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to add a project.', variant: 'destructive' });
      return;
    }
    if (!selectedGoal) {
      toast({ title: 'Select a goal first', description: 'Projects live under a desired outcome.' });
      return;
    }
    if (!projectTitle.trim()) {
      toast({ title: 'Add a project title', description: 'Name the strategy you want to execute.' });
      return;
    }
    if (isSavingProject) return;
    setIsSavingProject(true);
    const created = await createProject({
      title: projectTitle.trim(),
      goal_id: selectedGoal.id,
      priority: 3,
    });
    if (created) {
      setProjectTitle('');
      setSelectedProjectId(created.id);
    } else {
      toast({ title: 'Unable to add project', description: 'Please try again in a moment.', variant: 'destructive' });
    }
    setIsSavingProject(false);
  };

  const handleAddTask = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to add a task.', variant: 'destructive' });
      return;
    }
    if (!taskTitle.trim()) {
      toast({ title: 'Add a task title', description: 'Capture the next action you want to take.' });
      return;
    }
    if (!selectedGoal && !selectedProject) {
      toast({ title: 'Select a goal or project', description: 'Tasks connect to your outcome or strategy.' });
      return;
    }
    if (isSavingTask) return;
    setIsSavingTask(true);
    const created = await createTask({
      title: taskTitle.trim(),
      goal_id: selectedGoal?.id,
      project_id: selectedProject?.id,
      priority: 'medium',
    });
    if (created) {
      setTaskTitle('');
    } else {
      toast({ title: 'Unable to add task', description: 'Please try again in a moment.', variant: 'destructive' });
    }
    setIsSavingTask(false);
  };

  const sendAiMessage = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? aiInput).trim();
    if (!prompt || aiStreaming) return;

    const userMessage: AiMessage = { role: 'user', content: prompt };
    setAiMessages((prev) => [...prev, userMessage, { role: 'assistant', content: '' }]);
    setAiInput('');
    setAiStreaming(true);

    const conversationHistory = [...aiMessages, userMessage].map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const focusContext = buildContextSummary();
    const payload = [
      'You are an AI co-founder focused on prioritization and decision support.',
      'Use the Focus Funnel context to draft next actions, reflect on tradeoffs, and clarify decisions.',
      '',
      'Focus Funnel context:',
      focusContext,
      '',
      `User request: ${prompt}`,
    ].join('\n');

    try {
      await streamChat(
        payload,
        sessionIdRef.current,
        conversationHistory,
        { goals: goals.map((goal) => goal.title) },
        user?.id ?? null,
        null,
        null,
        'freeform',
        undefined,
        (chunk) => {
          setAiMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0) {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: `${updated[lastIndex].content}${chunk}`,
              };
            }
            return updated;
          });
        },
        (fullMessage) => {
          setAiMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0) {
              updated[lastIndex] = { ...updated[lastIndex], content: fullMessage };
            }
            return updated;
          });
        },
        undefined,
        (error) => {
          setAiMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0) {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: error.message || 'Unable to reach AI partner right now.',
              };
            }
            return updated;
          });
        }
      );
    } finally {
      setAiStreaming(false);
    }
  };

  // Drag-and-drop reorder handlers
  const handleGoalsReorder = async (newGoals: typeof goals) => {
    const ids = newGoals.map((g) => g.id);
    const orders = newGoals.map((_, i) => i);
    await reorderGoals(ids, orders);
  };

  const handleProjectsReorder = async (newProjects: typeof visibleProjects) => {
    const ids = newProjects.map((p) => p.id);
    const orders = newProjects.map((_, i) => i);
    await reorderProjects(ids, orders);
  };

  const handleTasksReorder = async (newTasks: typeof visibleTasks) => {
    const ids = newTasks.map((t) => t.id);
    const orders = newTasks.map((_, i) => i);
    await reorderTasks(ids, orders);
  };

  return (
    <DashboardLayout
      title="Focus Funnel"
      subtitle="Break down goals into projects and next actions"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Badge variant="outline" className="text-xs uppercase tracking-wide text-muted-foreground">
            Desired Outcome &rarr; Strategy &rarr; Actions
          </Badge>
        </div>
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Focus Funnel is temporarily unavailable. {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/70 bg-card/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    value={goalTitle}
                    onChange={(event) => setGoalTitle(event.target.value)}
                    placeholder="Add a new goal"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleAddGoal}
                    disabled={isSavingGoal}
                  >
                    {isSavingGoal ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Goal'
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  {goals.length === 0 && (
                    <p className="text-sm text-muted-foreground">No goals yet.</p>
                  )}
                  <SortableList
                    items={goals}
                    onReorder={handleGoalsReorder}
                    className="space-y-2"
                    renderItem={(goal) => (
                      <button
                        type="button"
                        className={cn(
                          'w-full text-left rounded-md border px-3 py-2 text-sm transition-colors',
                          selectedGoalId === goal.id
                            ? 'border-primary/60 bg-primary/5'
                            : 'border-border/60 hover:border-primary/40'
                        )}
                        onClick={() => {
                          setSelectedGoalId(goal.id);
                          setSelectedProjectId(null);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{goal.title}</span>
                          <Badge variant="outline" className="text-[10px]">
                            P{goal.priority}
                          </Badge>
                        </div>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {goal.description}
                          </p>
                        )}
                      </button>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-primary" />
                  Projects
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    value={projectTitle}
                    onChange={(event) => setProjectTitle(event.target.value)}
                    placeholder={selectedGoal ? 'Add a project' : 'Select a goal first'}
                    disabled={!selectedGoal}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!selectedGoal || isSavingProject}
                    onClick={handleAddProject}
                  >
                    {isSavingProject ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Project'
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  {visibleProjects.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedGoal ? 'No projects yet.' : 'Select a goal to see projects.'}
                    </p>
                  )}
                  <SortableList
                    items={visibleProjects}
                    onReorder={handleProjectsReorder}
                    className="space-y-2"
                    renderItem={(project) => (
                      <button
                        type="button"
                        className={cn(
                          'w-full text-left rounded-md border px-3 py-2 text-sm transition-colors',
                          selectedProjectId === project.id
                            ? 'border-primary/60 bg-primary/5'
                            : 'border-border/60 hover:border-primary/40'
                        )}
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{project.title}</span>
                          <Badge variant="outline" className="text-[10px]">
                            P{project.priority}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </button>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Next Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder={selectedGoal ? 'Add a next action' : 'Select a goal or project'}
                    disabled={!selectedGoal && !selectedProject}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={(!selectedGoal && !selectedProject) || isSavingTask}
                    onClick={handleAddTask}
                  >
                    {isSavingTask ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Task'
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  {visibleTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedGoal ? 'No tasks yet.' : 'Select a goal to see tasks.'}
                    </p>
                  )}
                  <SortableList
                    items={visibleTasks}
                    onReorder={handleTasksReorder}
                    className="space-y-2"
                    renderItem={(task) => (
                      <div className="rounded-md border border-border/60 px-3 py-2 text-sm bg-background">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="font-medium">{task.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">
                                {task.priority}
                              </Badge>
                              {task.deadline && <span>Due {task.deadline}</span>}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={task.status === 'done' ? 'default' : 'outline'}
                            onClick={() =>
                              updateTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')
                            }
                          >
                            {task.status === 'done' ? 'Done' : 'Mark done'}
                          </Button>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    AI Partner
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Draft, reflect, and clarify your next move.
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Decision Support
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="rounded-md border border-border/60 px-2 py-1">
                  Goals: {focusSnapshot.activeGoals}
                </div>
                <div className="rounded-md border border-border/60 px-2 py-1">
                  Projects: {focusSnapshot.activeProjects}
                </div>
                <div className="rounded-md border border-border/60 px-2 py-1">
                  Open tasks: {focusSnapshot.openTasks}
                </div>
                <div className="rounded-md border border-border/60 px-2 py-1">
                  Overdue: {focusSnapshot.overdue}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Guided Flow
                  </p>
                  <div className="mt-2 space-y-2">
                    {guidedPrompts.map((step) => (
                      <Button
                        key={step.title}
                        variant="outline"
                        size="sm"
                        onClick={() => sendAiMessage(step.buildPrompt())}
                        className="w-full justify-start text-xs"
                      >
                        <Sparkles className="h-3 w-3 mr-2" />
                        <span className="font-medium">{step.title}</span>
                        <span className="ml-2 text-muted-foreground">{step.description}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      variant="outline"
                      size="sm"
                      onClick={() => sendAiMessage(prompt)}
                      className="text-xs"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {aiMessages.length === 0 && (
                  <div className="rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                    Ask your AI partner to prioritize work or surface where momentum is leaking.
                  </div>
                )}
                {aiMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm',
                      message.role === 'user'
                        ? 'bg-primary/10 text-foreground'
                        : 'bg-muted/60 text-muted-foreground'
                    )}
                  >
                    {message.content}
                  </div>
                ))}
                {aiStreaming && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Thinking...
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Textarea
                  value={aiInput}
                  onChange={(event) => setAiInput(event.target.value)}
                  placeholder="Ask for clarity, drafts, or decisions..."
                  rows={3}
                />
                <Button
                  className="w-full"
                  onClick={() => sendAiMessage()}
                  disabled={aiStreaming || !aiInput.trim()}
                >
                  Send to AI Partner
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FocusFunnel;
