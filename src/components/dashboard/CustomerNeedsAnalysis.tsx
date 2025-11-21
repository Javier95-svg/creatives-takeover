import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketValidationScore, CustomerNeedsData } from '@/types/founderOS';
import { Users, AlertCircle, Target, TrendingUp, CheckCircle } from 'lucide-react';

interface CustomerNeedsAnalysisProps {
  validation: MarketValidationScore | null;
}

export const CustomerNeedsAnalysis = ({ validation }: CustomerNeedsAnalysisProps) => {
  const customerNeeds = validation?.customer_needs_data as CustomerNeedsData | undefined;

  if (!validation || !customerNeeds) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Customer Needs & Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No customer needs data available</p>
            <p className="text-xs mt-2">Customer analysis will appear after running market validation</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-500/10 border-red-500/20';
      case 'medium':
        return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20';
      case 'low':
        return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 70) return 'text-green-600 bg-green-500/10';
    if (importance >= 40) return 'text-yellow-600 bg-yellow-500/10';
    return 'text-blue-600 bg-blue-500/10';
  };

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Customer Needs & Requirements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Primary Customer Needs */}
          {customerNeeds.primary_needs && customerNeeds.primary_needs.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Primary Customer Needs
              </h3>
              <div className="space-y-2">
                {customerNeeds.primary_needs.map((need, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 border rounded-lg bg-primary/5"
                  >
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-foreground">{need}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Requirements */}
          {customerNeeds.key_requirements && customerNeeds.key_requirements.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Key Requirements
              </h3>
              <div className="space-y-2">
                {customerNeeds.key_requirements.map((requirement, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm text-foreground">{requirement}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pain Points */}
          {customerNeeds.pain_points && customerNeeds.pain_points.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Customer Pain Points
              </h3>
              <div className="space-y-2">
                {customerNeeds.pain_points.map((painPoint, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg ${getSeverityColor(painPoint.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium">{painPoint.point}</p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getSeverityColor(painPoint.severity)}`}
                      >
                        {painPoint.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buying Factors */}
          {customerNeeds.buying_factors && customerNeeds.buying_factors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Purchase Decision Factors
              </h3>
              <div className="space-y-2">
                {customerNeeds.buying_factors
                  .sort((a, b) => b.importance - a.importance)
                  .map((factor, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">{factor.factor}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getImportanceColor(factor.importance)}`}
                        >
                          {Math.round(factor.importance)}% importance
                        </Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full ${getImportanceColor(factor.importance)}`}
                          style={{ width: `${factor.importance}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Customer Segments */}
          {customerNeeds.customer_segments && customerNeeds.customer_segments.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Customer Segments
              </h3>
              <div className="space-y-3">
                {customerNeeds.customer_segments.map((segment, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg bg-secondary/5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">{segment.segment}</h4>
                      {segment.size && (
                        <Badge variant="outline" className="text-xs">
                          {segment.size} segment
                        </Badge>
                      )}
                    </div>
                    {segment.needs && segment.needs.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {segment.needs.map((need, needIndex) => (
                          <div key={needIndex} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{need}</span>
                          </div>
                        ))}
                      </div>
                    )}
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

