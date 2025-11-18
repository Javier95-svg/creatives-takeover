import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMarketValidation } from '@/hooks/useMarketValidation';
import { ValidationScoreGauge } from './ValidationScoreGauge';
import { CompetitorAnalysis } from './CompetitorAnalysis';
import { DemandTrends } from './DemandTrends';
import { BarChart3, RefreshCw, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

export const MarketValidationHub = () => {
  const { latestValidation, validationScores, averageScore, scoreTrend, isLoading, triggerValidation, isTriggering } = useMarketValidation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    business_idea: '',
    industry: '',
    target_market: '',
  });

  const handleTriggerValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.business_idea.trim()) {
      return;
    }

    triggerValidation({
      business_idea: formData.business_idea,
      industry: formData.industry || undefined,
      target_market: formData.target_market || undefined,
    });

    setFormData({
      business_idea: '',
      industry: '',
      target_market: '',
    });
    setIsDialogOpen(false);
  };

  const getTrendIcon = () => {
    if (scoreTrend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (scoreTrend < 0) return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
    return null;
  };

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          Market Validation
        </CardTitle>
        <div className="flex items-center gap-2">
          {latestValidation && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {getTrendIcon()}
              {scoreTrend !== 0 && (
                <span className={scoreTrend > 0 ? 'text-green-600' : 'text-red-600'}>
                  {scoreTrend > 0 ? '+' : ''}{scoreTrend.toFixed(1)} pts
                </span>
              )}
            </div>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" disabled={isTriggering}>
                <RefreshCw className={`h-4 w-4 ${isTriggering ? 'animate-spin' : ''}`} />
                {latestValidation ? 'Re-validate' : 'Validate Market'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Market Validation</DialogTitle>
                <DialogDescription>
                  Validate your business idea by analyzing market size, competition, and demand.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTriggerValidation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business_idea">Business Idea *</Label>
                  <Textarea
                    id="business_idea"
                    required
                    value={formData.business_idea}
                    onChange={(e) => setFormData(prev => ({ ...prev, business_idea: e.target.value }))}
                    placeholder="Describe your business idea in 1-2 sentences..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry (Optional)</Label>
                  <Input
                    id="industry"
                    value={formData.industry}
                    onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                    placeholder="e.g., SaaS, E-commerce, Healthcare"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_market">Target Market (Optional)</Label>
                  <Input
                    id="target_market"
                    value={formData.target_market}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_market: e.target.value }))}
                    placeholder="e.g., Small businesses, Enterprise, Consumers"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isTriggering}>
                  {isTriggering ? 'Validating...' : 'Start Validation'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded" />
          </div>
        ) : !latestValidation ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No validation data yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Run a market validation to see your business idea's potential
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              Start First Validation
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Validation Score Gauge */}
            <ValidationScoreGauge validation={latestValidation} />

            {/* Tabs for Detailed Analysis */}
            <Tabs defaultValue="competitors" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="competitors">Competitors</TabsTrigger>
                <TabsTrigger value="trends">Demand Trends</TabsTrigger>
              </TabsList>
              <TabsContent value="competitors" className="mt-4">
                <CompetitorAnalysis validation={latestValidation} />
              </TabsContent>
              <TabsContent value="trends" className="mt-4">
                <DemandTrends validation={latestValidation} />
              </TabsContent>
            </Tabs>

            {/* Validation History */}
            {validationScores.length > 1 && (
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground mb-2">Validation History</p>
                <div className="space-y-2">
                  {validationScores.slice(0, 3).map((score, index) => (
                    <div
                      key={score.id}
                      className="flex items-center justify-between p-2 border rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{Math.round(score.overall_validation_score)}</span>
                        <span className="text-muted-foreground">
                          {format(new Date(score.validation_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {index === 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Latest
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

