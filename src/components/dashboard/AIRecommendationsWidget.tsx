import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, AlertCircle, Target, Plus } from 'lucide-react';
import { useBizMapInsights } from '@/hooks/useBizMapInsights';
import { toast } from 'sonner';
import { useState } from 'react';

export const AIRecommendationsWidget = () => {
  const { recommendations, loading, convertToPriority } = useBizMapInsights();
  const [convertingIds, setConvertingIds] = useState<Set<string>>(new Set());

  const handleAddToPriorities = async (recommendation: any) => {
    setConvertingIds(prev => new Set(prev).add(recommendation.id));
    
    const success = await convertToPriority(recommendation);
    
    if (success) {
      toast.success('Added to your daily priorities! 🎯');
    } else {
      toast.error('Failed to add to priorities');
    }

    setConvertingIds(prev => {
      const next = new Set(prev);
      next.delete(recommendation.id);
      return next;
    });
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <Target className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            BizMap AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/95 border-dashed">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            BizMap AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-4">
              Start a BizMap AI conversation to get personalized recommendations
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/dream2plan">Start Planning</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95 border-primary/20 shadow-lg shadow-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="absolute -inset-1 bg-primary/20 rounded-full blur-sm -z-10 animate-pulse" />
          </div>
          BizMap AI Insights
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Personalized recommendations from your AI conversations
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="group relative p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-all hover:shadow-sm bg-gradient-to-br from-background to-muted/20"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getPriorityIcon(rec.priority)}
                </div>
                
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium leading-tight">
                      {rec.title}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={`flex-shrink-0 text-xs ${getPriorityColor(rec.priority)}`}
                    >
                      {rec.priority}
                    </Badge>
                  </div>
                  
                  {rec.suggestedAction && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {rec.suggestedAction}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 pt-1">
                    {rec.tags.slice(0, 2).map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="text-xs px-2 py-0"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs"
                onClick={() => handleAddToPriorities(rec)}
                disabled={convertingIds.has(rec.id)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add to Priorities
              </Button>
            </div>
          ))}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4"
          asChild
        >
          <a href="/dream2plan">
            <Sparkles className="h-4 w-4 mr-2" />
            Continue Planning
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};
