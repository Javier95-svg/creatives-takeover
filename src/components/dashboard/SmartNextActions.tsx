import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNextBestActions, type ActionUrgency } from '@/hooks/useNextBestActions';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { BIZMAP_STAGES, type BizMapStage } from '@/lib/bizmapStages';

const URGENCY_STYLES: Record<ActionUrgency, string> = {
  high: 'bg-red-500/10 text-red-600 border-red-500/20',
  medium: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  low: 'bg-muted text-muted-foreground border-border',
};

const URGENCY_DOT: Record<ActionUrgency, string> = {
  high: 'bg-red-500',
  medium: 'bg-orange-400',
  low: 'bg-muted-foreground/40',
};

export function SmartNextActions() {
  const actions = useNextBestActions();
  const { currentStage } = useBizMapProgress();
  const stageDef = BIZMAP_STAGES.find((s) => s.id === (currentStage as BizMapStage));

  return (
    <Card className="border-primary/20 bg-card/90">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" />
            Next Best Actions
          </CardTitle>
          <p className="text-xs text-muted-foreground">Personalized for you</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {actions.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            You're all caught up! Keep building.
          </div>
        ) : (
          actions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.id}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/70 p-3"
              >
                {/* Urgency dot */}
                <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${URGENCY_DOT[action.urgency]}`} />

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <Icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground leading-snug flex-1">
                      {action.title}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">{action.description}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="text-xs text-muted-foreground/70 italic">
                      {action.reason}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-caption px-1.5 py-0 ${URGENCY_STYLES[action.urgency]}`}
                    >
                      {action.urgency}
                    </Badge>
                    <Badge variant="outline" className="text-caption px-1.5 py-0">
                      ~{action.estimatedMinutes} min
                    </Badge>
                  </div>
                </div>

                <Link to={action.actionRoute} className="shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                    Go <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            );
          })
        )}

        {stageDef && (
          <p className="pt-1 text-center text-xs text-muted-foreground">
            Based on your Stage {stageDef.numeral}: {stageDef.title} journey
          </p>
        )}
      </CardContent>
    </Card>
  );
}
