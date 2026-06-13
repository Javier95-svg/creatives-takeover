import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, Target, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FounderOSIntegrationProps {
  sessionId: string;
  businessIdea: string;
  industry: string;
  targetMarket: string;
  onValidate: () => Promise<void>;
  onGenerateRoadmap: () => Promise<void>;
  validationComplete?: boolean;
  roadmapComplete?: boolean;
}

export const FounderOSIntegration = ({
  sessionId,
  businessIdea,
  industry,
  targetMarket,
  onValidate,
  onGenerateRoadmap,
  validationComplete = false,
  roadmapComplete = false,
}: FounderOSIntegrationProps) => {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Ready to Launch? 🚀</CardTitle>
            <CardDescription>
              Transform your idea into a 30-day launch plan
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your 30-day launch roadmap will be automatically generated when you complete the wizard above. Get validation, personalized tasks, and optional cohort support.
        </p>

        {/* Progress Status */}
        <div className="space-y-3">
          {/* Automatic Roadmap Generation */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Rocket className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-sm mb-1">📅 30-Day Launch Roadmap</div>
                <p className="text-xs text-muted-foreground mb-2">
                  Automatically generated from your wizard answers with personalized weekly goals and daily tasks
                </p>
                {roadmapComplete ? (
                  <Badge variant="default" className="text-xs">
                    ✅ Ready in Dashboard
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Generates after wizard completion
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Optional: Market Validation */}
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <Target className={`h-5 w-5 ${validationComplete ? 'text-success' : 'text-muted-foreground'}`} />
              <div>
                <div className="font-medium text-sm">Deep Market Validation</div>
                <div className="text-xs text-muted-foreground">Optional: Get validation score 0-100</div>
              </div>
            </div>
            {validationComplete ? (
              <Badge variant="default">Complete</Badge>
            ) : (
              <Button size="sm" variant="outline" onClick={onValidate}>
                Run Analysis
              </Button>
            )}
          </div>

          {/* Optional: Join Cohort */}
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">Join Founder Cohort</div>
                <div className="text-xs text-muted-foreground">Optional: Weekly accountability</div>
              </div>
            </div>
            <Badge variant="outline">Coming Soon</Badge>
          </div>
        </div>

        {/* Success Message */}
        {roadmapComplete && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🎉</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-success dark:text-success mb-1">
                  Your 30-Day Launch Roadmap is Ready!
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Personalized tasks for each week based on your business plan
                </p>
                <Button size="sm" onClick={() => navigate('/dashboard')} className="w-full">
                  View Roadmap in Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
