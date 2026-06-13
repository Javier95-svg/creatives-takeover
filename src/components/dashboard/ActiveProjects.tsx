import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FolderKanban, ArrowRight, Lightbulb, FileText, Code, CheckCircle2, Clock, Play } from 'lucide-react';
import { useChatSessions } from '@/hooks/useChatSessions';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { HelpTooltip } from '@/components/ui/HelpTooltip';

export const ActiveProjects = () => {
  const { sessions, loading } = useChatSessions();
  const [activeProjects, setActiveProjects] = useState<any[]>([]);

  useEffect(() => {
    // Get top 3 active (in-progress) projects
    const active = sessions
      .filter(s => !s.is_completed && s.current_step > 0)
      .slice(0, 3);
    setActiveProjects(active);
  }, [sessions]);

  const getProgressPercentage = (session: any) => {
    const totalSteps = 7;
    return Math.round((session.current_step / totalSteps) * 100);
  };

  const getProjectStage = (progress: number) => {
    if (progress >= 80) return { name: 'Refinement', color: 'text-success', bgColor: 'bg-success/10', borderColor: 'border-success/20', icon: CheckCircle2 };
    if (progress >= 60) return { name: 'Development', color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-warning/20', icon: Code };
    if (progress >= 40) return { name: 'Planning', color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-warning/20', icon: FileText };
    return { name: 'Ideation', color: 'text-info', bgColor: 'bg-info/10', borderColor: 'border-info/20', icon: Lightbulb };
  };

  const getNextStep = (currentStep: number) => {
    const steps = [
      'Define your business idea',
      'Identify your target market',
      'Analyze competition',
      'Plan your business model',
      'Set financial goals',
      'Create launch strategy',
      'Review and finalize'
    ];
    return steps[currentStep] || 'Complete your plan';
  };

  const getStatusBadge = (session: any) => {
    if (session.is_completed) return { label: 'Completed', variant: 'default' as const };
    if (session.current_step > 0) return { label: 'In Progress', variant: 'secondary' as const };
    return { label: 'Planning', variant: 'outline' as const };
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <FolderKanban className="h-4 w-4 text-primary" />
            </div>
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeProjects.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <FolderKanban className="h-4 w-4 text-primary" />
            </div>
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-sm">No active projects</p>
              <p className="text-xs text-muted-foreground">
                Start a new business plan to see it here
              </p>
            </div>
            <Link to="/bizmap-ai">
              <Button size="sm" className="mt-2">
                <FolderKanban className="h-4 w-4 mr-2" />
                Start Your First Project
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95 transition-all duration-300 hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center transition-transform duration-300">
              <FolderKanban className="h-4 w-4 text-primary" />
            </div>
            Active Projects
            <HelpTooltip
              content="Your active business planning projects from BizMap AI. Click any project to continue where you left off. Projects show progress, stage, and next steps."
              side="right"
            />
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs transition-all duration-300">
              {activeProjects.length} Active
            </Badge>
            {activeProjects.length > 0 && (
              <Link to="/projects-dashboard">
                <Button variant="ghost" size="sm" className="h-7 text-xs transition-all duration-300 hover:scale-105">
                  View All
                  <ArrowRight className="h-3 w-3 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeProjects.map((project, index) => {
            const progress = getProgressPercentage(project);
            const status = getStatusBadge(project);
            const stage = getProjectStage(progress);
            const StageIcon = stage.icon;
            const nextStep = getNextStep(project.current_step);
            const lastUpdated = project.updated_at || project.created_at;
            
            return (
              <Link
                key={project.id}
                to={`/bizmap-ai?session=${project.id}`}
                className="block animate-fade-in-up opacity-0"
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
              >
                <div className="group p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/50 hover:shadow-md hover:scale-[1.02] transition-all duration-300 [&_*]:pointer-events-none">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {project.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${stage.bgColor} ${stage.borderColor} ${stage.color}`}
                        >
                          <StageIcon className="h-3 w-3 mr-1" />
                          {stage.name}
                        </Badge>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold text-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Next Step & Metadata */}
                  <div className="pt-3 border-t border-border/50 space-y-2">
                    <div className="flex items-start gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Next: {nextStep}
                      </p>
                    </div>
                    {lastUpdated && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>

                  {/* Continue Button */}
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 hover:scale-105"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/bizmap-ai?session=${project.id}`;
                      }}
                    >
                      <Play className="h-3 w-3 mr-2 transition-transform duration-300 group-hover:translate-x-1" />
                      Continue Project
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

