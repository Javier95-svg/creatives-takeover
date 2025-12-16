import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, CheckCircle2, ArrowRight, AlertTriangle, Zap, Shield, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PMFAnalysis {
  pmfScore: {
    overall: number;
    verdict: 'Strong Fit' | 'Moderate Fit' | 'Weak Fit';
    subScores: {
      demand: number;
      differentiation: number;
      timing: number;
      executionRisk: number;
    };
    reasoning: string;
  };
  marketAnalysis?: {
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
  };
  problemSolutionFit?: {
    alignmentScore: number;
    reasoning: string;
    gaps: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  nextSteps?: Array<{
    priority: 'High' | 'Medium' | 'Low';
    action: string;
    description: string;
    estimatedTime?: string;
  }>;
}

interface PMFScoreProps {
  score: {
    overall: number;
    verdict: 'Strong Fit' | 'Moderate Fit' | 'Weak Fit';
    subScores: {
      demand: number;
      differentiation: number;
      timing: number;
      executionRisk: number;
    };
    reasoning: string;
  };
  nextSteps?: Array<{
    priority: 'High' | 'Medium' | 'Low';
    action: string;
    description: string;
    estimatedTime?: string;
  }>;
  analysis?: PMFAnalysis;
}

const PMFScore: React.FC<PMFScoreProps> = ({ score, nextSteps = [], analysis }) => {
  const verdict = score.verdict || (score.overall >= 70 ? 'Strong Fit' : score.overall >= 50 ? 'Moderate Fit' : 'Weak Fit');
  
  const scoreColor = 
    score.overall >= 70 ? 'text-green-600' :
    score.overall >= 50 ? 'text-yellow-600' :
    'text-red-600';

  const scoreBgColor = 
    score.overall >= 70 ? 'bg-green-500' :
    score.overall >= 50 ? 'bg-yellow-500' :
    'bg-red-500';

  const verdictBadgeColor = 
    verdict === 'Strong Fit' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    verdict === 'Moderate Fit' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  const subScoreItems = [
    { label: 'Demand', value: score.subScores?.demand || 0, description: 'Market demand strength for 2026' },
    { label: 'Differentiation', value: score.subScores?.differentiation || 0, description: 'Competitive uniqueness and defensibility' },
    { label: 'Timing', value: score.subScores?.timing || 0, description: 'Market timing and readiness' },
    { label: 'Execution Risk', value: score.subScores?.executionRisk || 0, description: 'Execution feasibility (higher = lower risk)' },
  ];

  const priorityColors = {
    High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const severityColors = {
    High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    Low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  };

  // Aggregate strengths from all analysis sections
  const aggregateStrengths = () => {
    const strengths: string[] = [];
    
    if (analysis?.marketAnalysis) {
      const { demand, differentiation, scalability, competitiveLandscape } = analysis.marketAnalysis;
      
      // Market demand strengths
      if (demand?.assessment && score.subScores?.demand >= 60) {
        strengths.push(`Strong market demand: ${demand.assessment.substring(0, 100)}...`);
      }
      
      // Competitive advantages
      if (differentiation?.competitiveAdvantages) {
        differentiation.competitiveAdvantages.forEach(adv => {
          strengths.push(`Competitive advantage: ${adv}`);
        });
      }
      
      // Competitive moats
      if (differentiation?.moats) {
        differentiation.moats.forEach(moat => {
          strengths.push(`Competitive moat: ${moat}`);
        });
      }
      
      // Scalability potential
      if (scalability?.expansionPotential && score.subScores?.executionRisk >= 60) {
        strengths.push(`Scalability potential: ${scalability.expansionPotential.substring(0, 100)}...`);
      }
    }
    
    // Problem-solution fit strengths
    if (analysis?.problemSolutionFit?.strengths) {
      analysis.problemSolutionFit.strengths.forEach(strength => {
        strengths.push(`Problem-solution alignment: ${strength}`);
      });
    }
    
    return strengths;
  };

  // Aggregate weaknesses from all analysis sections
  const aggregateWeaknesses = () => {
    const weaknesses: Array<{ text: string; severity?: 'High' | 'Medium' | 'Low'; category: string }> = [];
    
    if (analysis?.marketAnalysis) {
      const { risks, differentiation, scalability } = analysis.marketAnalysis;
      
      // Market risks
      if (risks?.marketRisks) {
        risks.marketRisks.forEach(risk => {
          weaknesses.push({
            text: risk.risk,
            severity: risk.severity,
            category: 'Market Risk'
          });
        });
      }
      
      // Execution risks
      if (risks?.executionRisks) {
        risks.executionRisks.forEach(risk => {
          weaknesses.push({
            text: risk.risk,
            severity: risk.severity,
            category: 'Execution Risk'
          });
        });
      }
      
      // Timing risks
      if (risks?.timingRisks) {
        risks.timingRisks.forEach(risk => {
          weaknesses.push({
            text: risk.risk,
            severity: risk.severity,
            category: 'Timing Risk'
          });
        });
      }
      
      // Differentiation gaps
      if (differentiation?.differentiationGaps) {
        differentiation.differentiationGaps.forEach(gap => {
          weaknesses.push({
            text: gap,
            category: 'Differentiation Gap'
          });
        });
      }
      
      // Growth constraints
      if (scalability?.growthConstraints) {
        scalability.growthConstraints.forEach(constraint => {
          weaknesses.push({
            text: constraint,
            category: 'Growth Constraint'
          });
        });
      }
    }
    
    // Problem-solution fit gaps and weaknesses
    if (analysis?.problemSolutionFit) {
      if (analysis.problemSolutionFit.gaps) {
        analysis.problemSolutionFit.gaps.forEach(gap => {
          weaknesses.push({
            text: gap,
            category: 'Problem-Solution Gap'
          });
        });
      }
      
      if (analysis.problemSolutionFit.weaknesses) {
        analysis.problemSolutionFit.weaknesses.forEach(weakness => {
          weaknesses.push({
            text: weakness,
            category: 'Problem-Solution Weakness'
          });
        });
      }
    }
    
    return weaknesses;
  };

  const strengths = aggregateStrengths();
  const weaknesses = aggregateWeaknesses();

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Product-Market Fit Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold",
                scoreBgColor,
                "text-white"
              )}>
                {score.overall}
              </div>
            </div>
            <Badge className={cn("text-sm px-4 py-1", verdictBadgeColor)}>
              {verdict}
            </Badge>
            <div className="text-center max-w-2xl">
              <p className="text-sm text-muted-foreground">{score.reasoning}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subScoreItems.map((item, index) => {
            const percentage = item.value;
            const itemColor = 
              percentage >= 70 ? 'text-green-600' :
              percentage >= 50 ? 'text-yellow-600' :
              'text-red-600';

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{item.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  <span className={cn("font-bold text-lg", itemColor)}>
                    {item.value}/100
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Strengths Section */}
      {analysis && strengths.length > 0 && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Weaknesses Section */}
      {analysis && weaknesses.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              Areas of Concern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weaknesses.map((weakness, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded-lg border",
                    weakness.severity ? severityColors[weakness.severity] : "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">{weakness.category}</span>
                    {weakness.severity && (
                      <Badge className={cn("text-xs", severityColors[weakness.severity])}>
                        {weakness.severity}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">{weakness.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Analysis Summary */}
      {analysis && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4" />
              Final Analysis & Market Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Overall Assessment</h4>
              <p className="text-sm text-muted-foreground">
                {score.reasoning}
              </p>
            </div>
            
            {analysis.marketAnalysis && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Market Position
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {analysis.marketAnalysis.competitiveLandscape?.marketPositioning || 'Market positioning analysis available in detailed view.'}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Scalability Outlook
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {analysis.marketAnalysis.scalability?.expansionPotential || 'Scalability analysis available in detailed view.'}
                  </p>
                </div>
              </div>
            )}
            
            {analysis.problemSolutionFit && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Problem-Solution Alignment
                </h4>
                <p className="text-sm text-muted-foreground">
                  {analysis.problemSolutionFit.reasoning}
                </p>
              </div>
            )}
            
            <div className="pt-2 border-t">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Go-to-Market Readiness
              </h4>
              <p className="text-sm text-muted-foreground">
                {score.overall >= 70 
                  ? "Your product shows strong market fit indicators. Focus on execution and scaling strategies to maximize market opportunity."
                  : score.overall >= 50
                  ? "Your product shows moderate market fit. Address key weaknesses and validate critical assumptions before full market launch."
                  : "Your product needs significant refinement before market launch. Focus on addressing critical gaps and strengthening your value proposition."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {nextSteps && nextSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Recommended Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nextSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Badge className={cn("text-xs", priorityColors[step.priority])}>
                      {step.priority}
                    </Badge>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">{step.action}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    {step.estimatedTime && (
                      <p className="text-xs text-muted-foreground italic">Estimated time: {step.estimatedTime}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PMFScore;

