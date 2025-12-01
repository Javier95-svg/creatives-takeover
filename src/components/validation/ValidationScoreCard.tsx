import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { MarketValidationScore } from '@/types/founderOS';

interface ValidationScoreCardProps {
  validation: MarketValidationScore;
  showDetails?: boolean;
}

export const ValidationScoreCard = ({ validation, showDetails = true }: ValidationScoreCardProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-[hsl(var(--green-primary))]';
    if (score >= 50) return 'text-yellow-500';
    return 'text-[hsl(var(--red-primary))]';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 75) return 'bg-[hsl(var(--green-primary))]/10';
    if (score >= 50) return 'bg-yellow-500/10';
    return 'bg-[hsl(var(--red-primary))]/10';
  };

  const getValidationLevel = (score: number) => {
    if (score >= 75) return { text: 'Strong Validation', icon: CheckCircle2, color: 'text-[hsl(var(--green-primary))]' };
    if (score >= 50) return { text: 'Moderate Validation', icon: AlertCircle, color: 'text-yellow-500' };
    return { text: 'Needs Improvement', icon: AlertCircle, color: 'text-[hsl(var(--red-primary))]' };
  };

  const level = getValidationLevel(validation.overall_validation_score);
  const LevelIcon = level.icon;

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Market Validation Score</CardTitle>
            <CardDescription>Your idea's market readiness assessment</CardDescription>
          </div>
          <Badge variant={validation.confidence_level === 'high' ? 'default' : 'secondary'}>
            {validation.confidence_level} confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score Gauge */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className={`w-48 h-48 rounded-full ${getScoreBgColor(validation.overall_validation_score)} flex items-center justify-center border-4 border-primary/20`}>
              <div className="text-center">
                <div className={`text-5xl font-bold ${getScoreColor(validation.overall_validation_score)}`}>
                  {validation.overall_validation_score}
                </div>
                <div className="text-sm text-muted-foreground mt-1">out of 100</div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Level */}
        <div className="flex items-center justify-center gap-2">
          <LevelIcon className={`h-5 w-5 ${level.color}`} />
          <span className={`text-lg font-semibold ${level.color}`}>{level.text}</span>
        </div>

        {showDetails && (
          <>
            {/* Score Breakdown */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold text-sm text-muted-foreground">Score Breakdown</h4>
              
              {/* Market Size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[hsl(var(--blue-primary))]" />
                    Market Size
                  </span>
                  <span className={`font-semibold ${getScoreColor(validation.market_size_score)}`}>
                    {validation.market_size_score}/100
                  </span>
                </div>
                <Progress value={validation.market_size_score} className="h-2" />
              </div>

              {/* Competition */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-orange-500" />
                    Competition Intensity
                  </span>
                  <span className={`font-semibold ${getScoreColor(100 - validation.competition_score)}`}>
                    {validation.competition_score}/100
                  </span>
                </div>
                <Progress value={validation.competition_score} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {validation.competitor_count || 0} direct competitors identified
                </p>
              </div>

              {/* Demand */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--green-primary))]" />
                    Market Demand
                  </span>
                  <span className={`font-semibold ${getScoreColor(validation.demand_score)}`}>
                    {validation.demand_score}/100
                  </span>
                </div>
                <Progress value={validation.demand_score} className="h-2" />
              </div>
            </div>

            {/* Market Size Display */}
            {validation.estimated_market_size_usd && (
              <div className="pt-4 border-t">
                <div className="bg-muted/50 rounded-lg p-6">
                  <div className="text-sm text-muted-foreground">Estimated Market Size</div>
                  <div className="text-2xl font-bold mt-1">
                    ${(validation.estimated_market_size_usd / 1_000_000_000).toFixed(1)}B
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Total addressable market</div>
                </div>
              </div>
            )}

            {/* Differentiation Opportunities */}
            {validation.differentiation_opportunities.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-sm text-muted-foreground mb-3">
                  Key Opportunities
                </h4>
                <div className="space-y-2">
                  {validation.differentiation_opportunities.slice(0, 3).map((opp, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{opp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Date */}
            <div className="text-xs text-muted-foreground text-center pt-4 border-t">
              Last updated: {new Date(validation.validation_date).toLocaleDateString()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
