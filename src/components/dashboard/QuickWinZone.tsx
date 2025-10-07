import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, CheckCircle, Clock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickWin {
  id: string;
  title: string;
  description: string;
  timeEstimate: string;
  creditCost?: number;
  action: string;
  actionLink: string;
  icon: any;
  category: 'action' | 'learn' | 'connect';
}

export const QuickWinZone = () => {
  const quickWins: QuickWin[] = [
    {
      id: '1',
      title: 'Start a 7-Day Sprint',
      description: 'Build momentum with a focused weekly goal',
      timeEstimate: '5 min',
      action: 'Start Sprint',
      actionLink: '/software',
      icon: Rocket,
      category: 'action'
    },
    {
      id: '2',
      title: 'Complete Business Assessment',
      description: 'Get personalized insights about your idea',
      timeEstimate: '10 min',
      creditCost: 1,
      action: 'Get Insights',
      actionLink: '/dream2plan',
      icon: CheckCircle,
      category: 'learn'
    },
    {
      id: '3',
      title: 'Join Community',
      description: 'Connect with fellow entrepreneurs',
      timeEstimate: '2 min',
      action: 'Explore',
      actionLink: '/community',
      icon: Zap,
      category: 'connect'
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'action': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'learn': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'connect': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default: return 'bg-muted';
    }
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Quick Wins
        </CardTitle>
        <CardDescription>Small actions, big impact</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {quickWins.map((win, index) => (
            <div
              key={win.id}
              className="group p-4 rounded-lg border bg-card hover:bg-accent/5 hover:shadow-md transition-all duration-300 hover-scale"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <win.icon className="h-5 w-5 text-primary" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {win.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {win.description}
                      </p>
                    </div>
                    <Badge variant="outline" className={getCategoryColor(win.category)}>
                      {win.category}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {win.timeEstimate}
                      </span>
                      {win.creditCost && (
                        <Badge variant="secondary" className="text-xs">
                          {win.creditCost} credit
                        </Badge>
                      )}
                    </div>
                    
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      asChild
                    >
                      <Link to={win.actionLink}>
                        {win.action}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
