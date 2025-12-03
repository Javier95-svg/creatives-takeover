import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, BookOpen, Clock, CheckSquare, ArrowRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const resources = [
  {
    name: 'Project Templates',
    icon: FolderKanban,
    color: 'text-[hsl(var(--blue-primary))]',
    bgColor: 'bg-[hsl(var(--blue-primary))]/10',
    hoverBgColor: 'group-hover/item:bg-[hsl(var(--blue-primary))]/20',
    link: '/dashboard',
  },
  {
    name: 'Planning Guides',
    icon: BookOpen,
    color: 'text-[hsl(var(--red-primary))]',
    bgColor: 'bg-[hsl(var(--red-primary))]/10',
    hoverBgColor: 'group-hover/item:bg-[hsl(var(--red-primary))]/20',
    link: '/prompt-library',
  },
  {
    name: 'Time Tracker',
    icon: Clock,
    color: 'text-[hsl(var(--blue-primary))]',
    bgColor: 'bg-[hsl(var(--blue-primary))]/10',
    hoverBgColor: 'group-hover/item:bg-[hsl(var(--blue-primary))]/20',
    link: '/dashboard',
  },
  {
    name: 'Task Manager',
    icon: CheckSquare,
    color: 'text-[hsl(var(--green-primary))]',
    bgColor: 'bg-[hsl(var(--green-primary))]/10',
    hoverBgColor: 'group-hover/item:bg-[hsl(var(--green-primary))]/20',
    link: '/dashboard',
  },
];

export const QuickResources = () => {
  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-secondary" />
          </div>
          Quick Resources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {resources.map((resource, idx) => (
            <Link
              key={idx}
              to={resource.link}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-all cursor-pointer group/item"
            >
              <div
                className={`w-10 h-10 rounded-lg ${resource.bgColor} ${resource.hoverBgColor} flex items-center justify-center transition-colors`}
              >
                <resource.icon className={`w-5 h-5 ${resource.color}`} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{resource.name}</div>
                <div className="text-xs text-muted-foreground">Quick access</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover/item:text-[hsl(var(--blue-primary))] transition-colors" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

