import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MarketValidationScore } from '@/types/founderOS';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useMemo } from 'react';

interface ValidationScoreGaugeProps {
  validation: MarketValidationScore | null;
  showBreakdown?: boolean;
}

export const ValidationScoreGauge = ({ validation, showBreakdown = true }: ValidationScoreGaugeProps) => {
  const score = validation?.overall_validation_score || 0;
  
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-[hsl(var(--green-primary))]';
    if (score >= 50) return 'text-warning';
    return 'text-[hsl(var(--red-primary))]';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 70) return 'bg-[hsl(var(--green-primary))]/10';
    if (score >= 50) return 'bg-warning/10';
    return 'bg-[hsl(var(--red-primary))]/10';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Strong';
    if (score >= 50) return 'Moderate';
    return 'Weak';
  };

  const breakdown = useMemo(() => {
    if (!validation) return null;
    
    return {
      marketSize: validation.market_size_score || 0,
      competition: validation.competition_score || 0,
      demand: validation.demand_score || 0,
    };
  }, [validation]);

  if (!validation) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>No validation data available</p>
            <p className="text-sm mt-2">Run a market validation to see your scores</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Main Score Display */}
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${getScoreBgColor(score)} mb-4`}>
              <div className="text-center">
                <p className={`text-4xl font-bold ${getScoreColor(score)}`}>
                  {Math.round(score)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">/ 100</p>
              </div>
            </div>
            <p className={`text-lg font-semibold ${getScoreColor(score)}`}>
              {getScoreLabel(score)} Validation
            </p>
            {validation.business_idea && (
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                {validation.business_idea.length > 60 
                  ? `${validation.business_idea.substring(0, 60)}...`
                  : validation.business_idea}
              </p>
            )}
          </div>

          {/* Score Breakdown */}
          {showBreakdown && breakdown && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Market Size</span>
                  <span className="font-medium">{Math.round(breakdown.marketSize)}/100</span>
                </div>
                <Progress value={breakdown.marketSize} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Competition</span>
                  <span className="font-medium">{Math.round(breakdown.competition)}/100</span>
                </div>
                <Progress value={breakdown.competition} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Demand</span>
                  <span className="font-medium">{Math.round(breakdown.demand)}/100</span>
                </div>
                <Progress value={breakdown.demand} className="h-2" />
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            {validation.estimated_market_size_usd && (
              <div>
                <p className="text-xs text-muted-foreground">Market Size</p>
                <p className="text-sm font-medium">
                  ${(validation.estimated_market_size_usd / 1_000_000).toFixed(1)}M
                </p>
              </div>
            )}
            {validation.competitor_count !== undefined && (
              <div>
                <p className="text-xs text-muted-foreground">Competitors</p>
                <p className="text-sm font-medium">{validation.competitor_count}</p>
              </div>
            )}
          </div>

          {/* Confidence Level */}
          {validation.confidence_level && (
            <div className="flex items-center justify-center gap-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <span className={`text-xs font-medium capitalize ${
                validation.confidence_level === 'high' ? 'text-[hsl(var(--green-primary))]' :
                validation.confidence_level === 'medium' ? 'text-warning' :
                'text-[hsl(var(--red-primary))]'
              }`}>
                {validation.confidence_level}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

