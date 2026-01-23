import { useEffect, useMemo, useRef, useState } from 'react';
import { useFocusFunnel } from '@/hooks/focus-funnel';
import { useAuth } from '@/contexts/AuthContext';
import { streamChat } from '@/hooks/useStreamingChat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Brain,
  CheckCircle2,
  FolderKanban,
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react';

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
    createGoal,
    createProject,
    createTask,
    updateTaskStatus,
  } = useFocusFunnel();

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [taskTitle, setTaskTitle] = useState('');

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-space-grotesk text-3xl sm:text-4xl font-semibold tracking-tight">
              Focus Funnel
            </h1>
            <p className="text-muted-foreground mt-1">
              Break down goals into projects and next actions, with an AI partner to keep momentum.
            </p>
          </div>
          <Badge variant="outline" className="text-xs uppercase tracking-wide text-muted-foreground">
            Goals -> Projects -> Next Actions
          </Badge>
        </div>

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
                    onClick={async () => {
                      if (!goalTitle.trim()) return;
                      const created = await createGoal({ title: goalTitle.trim(), priority: 3 });
                      if (created) {
                        setGoalTitle('');
                        setSelectedGoalId(created.id);
                      }
                    }}
                  >
                    Add Goal
                  </Button>
                </div>

                <div className="space-y-2">
                  {goals.length === 0 && (
                    <p className="text-sm text-muted-foreground">No goals yet.</p>
                  )}
                  {goals.map((goal) => (
                    <button
                      key={goal.id}
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
                  ))}
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
                    disabled={!selectedGoal}
                    onClick={async () => {
                      if (!projectTitle.trim() || !selectedGoal) return;
                      const created = await createProject({
                        title: projectTitle.trim(),
                        goal_id: selectedGoal.id,
                        priority: 3,
                      });
                      if (created) {
                        setProjectTitle('');
                        setSelectedProjectId(created.id);
                      }
                    }}
                  >
                    Add Project
                  </Button>
                </div>

                <div className="space-y-2">
                  {visibleProjects.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedGoal ? 'No projects yet.' : 'Select a goal to see projects.'}
                    </p>
                  )}
                  {visibleProjects.map((project) => (
                    <button
                      key={project.id}
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
                  ))}
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
                    disabled={!selectedGoal && !selectedProject}
                    onClick={async () => {
                      if (!taskTitle.trim()) return;
                      await createTask({
                        title: taskTitle.trim(),
                        goal_id: selectedGoal?.id,
                        project_id: selectedProject?.id,
                        priority: 'medium',
                      });
                      setTaskTitle('');
                    }}
                  >
                    Add Task
                  </Button>
                </div>

                <div className="space-y-2">
                  {visibleTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedGoal ? 'No tasks yet.' : 'Select a goal to see tasks.'}
                    </p>
                  )}
                  {visibleTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-md border border-border/60 px-3 py-2 text-sm"
                    >
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
                  ))}
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
    </div>
  );
};

export default FocusFunnel;
