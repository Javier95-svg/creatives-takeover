import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, XCircle, FileText, MessageSquare, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProblemSolutionFitProps {
  fit: {
    alignmentScore: number;
    reasoning: string;
    gaps: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  surveys: {
    primarySegment: string;
    questions: string[];
  };
  interviewScripts: {
    opening: string[];
    problemExploration: string[];
    solutionValidation: string[];
    pricingSensitivity: string[];
    closing: string[];
  };
  onExportSurvey: () => void;
  onExportInterviewScript: () => void;
}

const ProblemSolutionFit: React.FC<ProblemSolutionFitProps> = ({
  fit,
  surveys,
  interviewScripts,
  onExportSurvey,
  onExportInterviewScript,
}) => {
  const scoreColor =
    fit.alignmentScore >= 70 ? 'text-success' :
    fit.alignmentScore >= 50 ? 'text-warning' :
    'text-destructive';

  const scoreBgColor =
    fit.alignmentScore >= 70 ? 'bg-success' :
    fit.alignmentScore >= 50 ? 'bg-warning' :
    'bg-destructive';

  return (
    <div className="space-y-6">
      {/* Alignment Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Problem-Solution Fit Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Alignment Score</span>
              <span className={cn("text-2xl font-bold", scoreColor)}>
                {fit.alignmentScore}/100
              </span>
            </div>
            <Progress value={fit.alignmentScore} className="h-3" />
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Analysis</p>
            <p className="text-sm text-muted-foreground">{fit.reasoning}</p>
          </div>
        </CardContent>
      </Card>

      {/* Strengths */}
      {fit.strengths.length > 0 && (
        <Card className="border-success/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-success">
              <CheckCircle2 className="w-4 h-4" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {fit.strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Gaps & Weaknesses */}
      {(fit.gaps.length > 0 || fit.weaknesses.length > 0) && (
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-warning">
              <AlertCircle className="w-4 h-4" />
              Gaps & Weaknesses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fit.gaps.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Key Gaps</p>
                <ul className="space-y-2">
                  {fit.gaps.map((gap, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {fit.weaknesses.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Weaknesses</p>
                <ul className="space-y-2">
                  {fit.weaknesses.map((weakness, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {fit.recommendations.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {fit.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Surveys & Interview Scripts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              PMF Survey
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {surveys.questions.length} questions for {surveys.primarySegment}
            </p>
            <Button onClick={onExportSurvey} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download Survey
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Interview Script
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Complete customer discovery script with {interviewScripts.opening.length + interviewScripts.problemExploration.length + interviewScripts.solutionValidation.length + interviewScripts.pricingSensitivity.length + interviewScripts.closing.length} questions
            </p>
            <Button onClick={onExportInterviewScript} variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download Script
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProblemSolutionFit;

