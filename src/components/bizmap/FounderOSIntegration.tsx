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
          Get real-time market validation, AI-powered roadmap, and join a founder cohort for accountability.
        </p>

        {/* Action Steps */}
        <div className="space-y-3">
          {/* Step 1: Validate */}
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <Target className={`h-5 w-5 ${validationComplete ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div>
                <div className="font-medium text-sm">Validate Your Idea</div>
                <div className="text-xs text-muted-foreground">Get market validation score 0-100</div>
              </div>
            </div>
            {validationComplete ? (
              <Badge variant="default">Complete</Badge>
            ) : (
              <Button size="sm" onClick={onValidate}>
                Validate
              </Button>
            )}
          </div>

          {/* Step 2: Generate Roadmap */}
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <Rocket className={`h-5 w-5 ${roadmapComplete ? 'text-green-500' : 'text-muted-foreground'}`} />
              <div>
                <div className="font-medium text-sm">Create 30-Day Roadmap</div>
                <div className="text-xs text-muted-foreground">AI-generated sprint plan</div>
              </div>
            </div>
            {roadmapComplete ? (
              <Badge variant="default">Complete</Badge>
            ) : (
              <Button size="sm" onClick={onGenerateRoadmap} disabled={!validationComplete}>
                Generate
              </Button>
            )}
          </div>

          {/* Step 3: Join Cohort */}
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">Join Founder Cohort</div>
                <div className="text-xs text-muted-foreground">Weekly accountability & support</div>
              </div>
            </div>
            <Badge variant="outline">Optional</Badge>
          </div>
        </div>

        {/* View Founder OS Button */}
        {(validationComplete || roadmapComplete) && (
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate('/founder-os')}
          >
            Open Founder OS Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
