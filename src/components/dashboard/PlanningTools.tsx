import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ListTodo, Flag, TrendingUp, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

const tools = [
  {
    name: 'Timeline View',
    icon: Calendar,
    color: 'text-primary',
    description: 'Visual roadmap',
    link: '/dashboard',
  },
  {
    name: 'Task Board',
    icon: ListTodo,
    color: 'text-secondary',
    description: 'Kanban style',
    link: '/dashboard',
  },
  {
    name: 'Milestones',
    icon: Flag,
    color: 'text-accent',
    description: 'Track goals',
    link: '/dashboard',
  },
  {
    name: 'Analytics',
    icon: TrendingUp,
    color: 'text-[hsl(var(--green-primary))]',
    description: 'Progress insights',
    link: '/dashboard',
  },
];

export const PlanningTools = () => {
  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Target className="h-4 w-4 text-accent" />
          </div>
          Planning Tools
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {tools.map((tool, idx) => (
              <Link
                key={idx}
                to={tool.link}
                className="p-4 bg-muted/30 rounded-lg text-center border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
              >
                <tool.icon className={`w-6 h-6 ${tool.color} mx-auto mb-2`} />
                <div className="text-sm font-semibold mb-1">{tool.name}</div>
                <div className="text-xs text-muted-foreground">{tool.description}</div>
              </Link>
            ))}
          </div>
          <div className="pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              Customize your dashboard layout and add project sections that matter to you
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

