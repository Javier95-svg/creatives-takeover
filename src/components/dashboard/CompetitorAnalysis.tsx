import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketValidationScore, CompetitorData, CompetitorGap } from '@/types/founderOS';
import { ExternalLink, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompetitorAnalysisProps {
  validation: MarketValidationScore | null;
}

export const CompetitorAnalysis = ({ validation }: CompetitorAnalysisProps) => {
  const competitors = (validation?.top_competitors || []) as CompetitorData[];
  const gaps = (validation?.competitor_gaps || []) as CompetitorGap[];

  if (!validation || competitors.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Competitor Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No competitor data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base">Competitor Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Top Competitors */}
          <div>
            <h3 className="text-sm font-medium mb-3">Top Competitors</h3>
            <div className="space-y-3">
              {competitors.slice(0, 3).map((competitor, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{competitor.name}</p>
                        {competitor.website && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => window.open(competitor.website, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {competitor.market_share && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Market Share: {competitor.market_share}%
                        </p>
                      )}
                    </div>
                  </div>

                  {competitor.strengths && competitor.strengths.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-success mb-1">Strengths:</p>
                      <div className="flex flex-wrap gap-1">
                        {competitor.strengths.slice(0, 3).map((strength, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {competitor.weaknesses && competitor.weaknesses.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-destructive mb-1">Weaknesses:</p>
                      <div className="flex flex-wrap gap-1">
                        {competitor.weaknesses.slice(0, 2).map((weakness, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {weakness}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Competitor Gaps / Opportunities */}
          {gaps.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Market Opportunities
              </h3>
              <div className="space-y-2">
                {gaps.slice(0, 3).map((gap, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg bg-primary/5"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium">{gap.category}</p>
                      <Badge
                        variant={
                          gap.opportunity_score >= 70 ? 'default' :
                          gap.opportunity_score >= 50 ? 'secondary' :
                          'outline'
                        }
                        className="text-xs"
                      >
                        {Math.round(gap.opportunity_score)}% opportunity
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{gap.gap_description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Difficulty:</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          gap.difficulty === 'low' ? 'text-success' :
                          gap.difficulty === 'medium' ? 'text-warning' :
                          'text-destructive'
                        }`}
                      >
                        {gap.difficulty}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Differentiation Opportunities */}
          {validation.differentiation_opportunities && validation.differentiation_opportunities.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Differentiation Opportunities
              </h3>
              <div className="space-y-1">
                {validation.differentiation_opportunities.slice(0, 3).map((opp, index) => (
                  <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{opp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

