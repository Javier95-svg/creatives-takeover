import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, ArrowRight } from 'lucide-react';
import { useChatSessions } from '@/hooks/useChatSessions';
import { Link } from 'react-router-dom';

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
            <FolderKanban className="h-5 w-5 text-primary" />
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
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
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                Create Project
              </Badge>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <FolderKanban className="h-4 w-4 text-primary" />
            </div>
            Active Projects
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {activeProjects.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeProjects.map((project) => {
            const progress = getProgressPercentage(project);
            const status = getStatusBadge(project);
            return (
              <div
                key={project.id}
                className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold mb-1">{project.title}</div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={status.variant} className="text-xs">
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

