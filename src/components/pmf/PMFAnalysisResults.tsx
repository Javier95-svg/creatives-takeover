import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, TrendingUp, Users, AlertTriangle, Target, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import CustomerSegments from './CustomerSegments';
import ValidationExperiments from './ValidationExperiments';

interface MarketAnalysis {
  demand: {
    assessment: string;
    marketSize: string;
    growthProjection: string;
    trends: string[];
  };
  competitiveLandscape: {
    directCompetitors: Array<{
      name: string;
      strengths: string[];
      weaknesses: string[];
    }>;
    indirectCompetitors: string[];
    marketPositioning: string;
    competitiveIntensity: 'High' | 'Medium' | 'Low';
  };
  differentiation: {
    uniqueValue: string;
    competitiveAdvantages: string[];
    moats: string[];
    differentiationGaps: string[];
  };
  scalability: {
    expansionPotential: string;
    unitEconomics: string;
    growthConstraints: string[];
    scalabilityScore: string;
  };
  risks: {
    marketRisks: Array<{
      risk: string;
      severity: 'High' | 'Medium' | 'Low';
      mitigation: string;
    }>;
    executionRisks: Array<{
      risk: string;
      severity: 'High' | 'Medium' | 'Low';
      mitigation: string;
    }>;
    timingRisks: Array<{
      risk: string;
      severity: 'High' | 'Medium' | 'Low';
      mitigation: string;
    }>;
  };
}

interface PMFAnalysisResultsProps {
  marketAnalysis: MarketAnalysis;
  customerSegments?: Array<{
    name: string;
    demographics: string;
    psychographics: string;
    painPoints: string[];
    marketSize: string;
    accessibilityScore: number;
  }>;
  validationExperiments?: Array<{
    name: string;
    type: string;
    hypothesis: string;
    successMetrics: string[];
    estimatedTime: string;
    estimatedCost: string;
    priority: 'High' | 'Medium' | 'Low';
  }>;
}

const PMFAnalysisResults: React.FC<PMFAnalysisResultsProps> = ({
  marketAnalysis,
  customerSegments,
  validationExperiments,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    demand: true,
    competitive: false,
    differentiation: false,
    scalability: false,
    risks: false,
    segments: false,
    experiments: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const severityColors = {
    High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const intensityColors = {
    High: 'text-red-600',
    Medium: 'text-yellow-600',
    Low: 'text-green-600',
  };

  return (
    <div className="space-y-6">
      {/* Market Demand Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <CardTitle>Market Demand Analysis (2026)</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('demand')}
            >
              {expandedSections.demand ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.demand && (
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Assessment</h4>
              <p className="text-sm text-muted-foreground">{marketAnalysis.demand.assessment}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Market Size</h4>
                <p className="text-sm text-muted-foreground">{marketAnalysis.demand.marketSize}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Growth Projection</h4>
                <p className="text-sm text-muted-foreground">{marketAnalysis.demand.growthProjection}</p>
              </div>
            </div>
            {marketAnalysis.demand.trends && marketAnalysis.demand.trends.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Key Trends</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {marketAnalysis.demand.trends.map((trend, index) => (
                    <li key={index}>{trend}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Competitive Landscape */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Competitive Landscape</CardTitle>
              <Badge className={cn(intensityColors[marketAnalysis.competitiveLandscape.competitiveIntensity])}>
                {marketAnalysis.competitiveLandscape.competitiveIntensity} Intensity
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('competitive')}
            >
              {expandedSections.competitive ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.competitive && (
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Market Positioning</h4>
              <p className="text-sm text-muted-foreground">{marketAnalysis.competitiveLandscape.marketPositioning}</p>
            </div>
            {marketAnalysis.competitiveLandscape.directCompetitors && marketAnalysis.competitiveLandscape.directCompetitors.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Direct Competitors</h4>
                <div className="space-y-4">
                  {marketAnalysis.competitiveLandscape.directCompetitors.map((competitor, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <h5 className="font-medium text-sm">{competitor.name}</h5>
                      {competitor.strengths && competitor.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-green-600 mb-1">Strengths:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                            {competitor.strengths.map((strength, i) => (
                              <li key={i}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {competitor.weaknesses && competitor.weaknesses.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-1">Weaknesses:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
                            {competitor.weaknesses.map((weakness, i) => (
                              <li key={i}>{weakness}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {marketAnalysis.competitiveLandscape.indirectCompetitors && marketAnalysis.competitiveLandscape.indirectCompetitors.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Indirect Competitors</h4>
                <div className="flex flex-wrap gap-2">
                  {marketAnalysis.competitiveLandscape.indirectCompetitors.map((competitor, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {competitor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Differentiation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle>Differentiation & Competitive Advantage</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('differentiation')}
            >
              {expandedSections.differentiation ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.differentiation && (
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Unique Value Proposition</h4>
              <p className="text-sm text-muted-foreground">{marketAnalysis.differentiation.uniqueValue}</p>
            </div>
            {marketAnalysis.differentiation.competitiveAdvantages && marketAnalysis.differentiation.competitiveAdvantages.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Competitive Advantages</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {marketAnalysis.differentiation.competitiveAdvantages.map((advantage, index) => (
                    <li key={index}>{advantage}</li>
                  ))}
                </ul>
              </div>
            )}
            {marketAnalysis.differentiation.moats && marketAnalysis.differentiation.moats.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Competitive Moats</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {marketAnalysis.differentiation.moats.map((moat, index) => (
                    <li key={index}>{moat}</li>
                  ))}
                </ul>
              </div>
            )}
            {marketAnalysis.differentiation.differentiationGaps && marketAnalysis.differentiation.differentiationGaps.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-orange-600">Differentiation Gaps</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {marketAnalysis.differentiation.differentiationGaps.map((gap, index) => (
                    <li key={index}>{gap}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Scalability */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <CardTitle>Scalability Potential</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('scalability')}
            >
              {expandedSections.scalability ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.scalability && (
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Expansion Potential</h4>
              <p className="text-sm text-muted-foreground">{marketAnalysis.scalability.expansionPotential}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Unit Economics</h4>
              <p className="text-sm text-muted-foreground">{marketAnalysis.scalability.unitEconomics}</p>
            </div>
            {marketAnalysis.scalability.growthConstraints && marketAnalysis.scalability.growthConstraints.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 text-orange-600">Growth Constraints</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {marketAnalysis.scalability.growthConstraints.map((constraint, index) => (
                    <li key={index}>{constraint}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>Risk Assessment</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('risks')}
            >
              {expandedSections.risks ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {expandedSections.risks && (
          <CardContent className="space-y-6">
            {/* Market Risks */}
            {marketAnalysis.risks.marketRisks && marketAnalysis.risks.marketRisks.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Market Risks
                </h4>
                <div className="space-y-3">
                  {marketAnalysis.risks.marketRisks.map((risk, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{risk.risk}</p>
                        <Badge className={cn("text-xs", severityColors[risk.severity])}>
                          {risk.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Mitigation: </span>
                        {risk.mitigation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Execution Risks */}
            {marketAnalysis.risks.executionRisks && marketAnalysis.risks.executionRisks.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Execution Risks
                </h4>
                <div className="space-y-3">
                  {marketAnalysis.risks.executionRisks.map((risk, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{risk.risk}</p>
                        <Badge className={cn("text-xs", severityColors[risk.severity])}>
                          {risk.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Mitigation: </span>
                        {risk.mitigation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timing Risks */}
            {marketAnalysis.risks.timingRisks && marketAnalysis.risks.timingRisks.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Timing Risks
                </h4>
                <div className="space-y-3">
                  {marketAnalysis.risks.timingRisks.map((risk, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{risk.risk}</p>
                        <Badge className={cn("text-xs", severityColors[risk.severity])}>
                          {risk.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Mitigation: </span>
                        {risk.mitigation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Customer Segments (Collapsible) */}
      {customerSegments && customerSegments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Customer Segments</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('segments')}
              >
                {expandedSections.segments ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show Details
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {expandedSections.segments && (
            <CardContent>
              <CustomerSegments
                segments={customerSegments}
                selectedSegment={customerSegments[0]?.name || null}
                onSelectSegment={() => {}}
              />
            </CardContent>
          )}
        </Card>
      )}

      {/* Validation Experiments (Collapsible) */}
      {validationExperiments && validationExperiments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Validation Experiments</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('experiments')}
              >
                {expandedSections.experiments ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    Show Details
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {expandedSections.experiments && (
            <CardContent>
              <ValidationExperiments experiments={validationExperiments} />
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};

export default PMFAnalysisResults;

