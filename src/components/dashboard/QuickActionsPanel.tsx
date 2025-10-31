import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, TrendingUp, Users, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const actions = [
  {
    title: 'New Project',
    description: 'Start a new creative project',
    icon: PlusCircle,
    link: '/bizmap-ai',
    color: 'from-blue-500/20 to-blue-500/5',
    iconColor: 'text-blue-500',
  },
  {
    title: 'Funding',
    description: 'Explore funding opportunities',
    icon: TrendingUp,
    link: '/blog?category=funding',
    color: 'from-green-500/20 to-green-500/5',
    iconColor: 'text-green-500',
  },
  {
    title: 'Community',
    description: 'Connect with creators',
    icon: Users,
    link: '/community',
    color: 'from-purple-500/20 to-purple-500/5',
    iconColor: 'text-purple-500',
  },
  {
    title: 'Resources',
    description: 'Learn and grow',
    icon: BookOpen,
    link: '/resources',
    color: 'from-orange-500/20 to-orange-500/5',
    iconColor: 'text-orange-500',
  },
];

export const QuickActionsPanel = () => {
  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link key={action.title} to={action.link}>
              <Button
                variant="outline"
                className="w-full h-auto p-4 flex flex-col items-start gap-2 hover:bg-accent transition-all group"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
