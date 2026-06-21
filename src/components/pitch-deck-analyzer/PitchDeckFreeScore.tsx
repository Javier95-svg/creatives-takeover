import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Gauge } from 'lucide-react';
import { PitchDeckFreeResult, getVerdictColor } from '@/types/pitchDeckAnalyzer';
import { MetricsGrid } from './MetricsGrid';

interface PitchDeckFreeScoreProps {
  result: PitchDeckFreeResult;
}

// The anonymous / free "Quick Score" — a real (not placeholder) snapshot: the
// weighted score, the 6 investor dimensions, and the single biggest strength +
// highest-impact fix grounded in the user's own deck. The deep audit (full
// findings, slide checklist, action plan, benchmark) is unlocked after sign up.
export const PitchDeckFreeScore: React.FC<PitchDeckFreeScoreProps> = ({ result }) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Score header */}
      <Card className="border-2">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center sm:items-start gap-3 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <Gauge className="h-4 w-4" />
                Quick Score
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-bold text-primary">{result.overallScore}</span>
                <span className="text-3xl text-muted-foreground">/100</span>
              </div>
              <Badge className={`text-sm px-4 py-1.5 ${getVerdictColor(result.verdict)}`}>
                {result.verdict}
              </Badge>
              <p className="text-sm text-muted-foreground max-w-sm">
                A snapshot across the 6 dimensions investors weigh. Unlock the Full Investor
                Audit for slide-by-slide findings and a prioritized fix plan.
              </p>
            </div>

            <div className="relative h-40 w-40 sm:h-48 sm:w-48 shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 192 192">
                <circle cx="96" cy="96" r="85" stroke="currentColor" strokeWidth="12" fill="none" className="text-muted-foreground/20" />
                <circle
                  cx="96"
                  cy="96"
                  r="85"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 85}`}
                  strokeDashoffset={`${2 * Math.PI * 85 * (1 - result.overallScore / 100)}`}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ${
                    result.overallScore >= 85
                      ? 'text-success'
                      : result.overallScore >= 70
                        ? 'text-info'
                        : result.overallScore >= 55
                          ? 'text-warning'
                          : 'text-destructive'
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl sm:text-4xl font-bold">{result.overallScore}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 6 dimensions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Dimension Scores</span>
            <Badge variant="outline" className="font-normal">6 Dimensions</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MetricsGrid subScores={result.subScores} />
        </CardContent>
      </Card>

      {/* Top strength + top fix (grounded in the deck) */}
      <div className="grid md:grid-cols-2 gap-6">
        {result.topStrength && (
          <Card className="border-success bg-success-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                Biggest Strength
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.topStrength.dimension && (
                <Badge variant="outline" className="font-normal">{result.topStrength.dimension}</Badge>
              )}
              <p className="text-sm">{result.topStrength.text}</p>
              {result.topStrength.evidence && (
                <p className="text-xs text-muted-foreground italic">"{result.topStrength.evidence}"</p>
              )}
            </CardContent>
          </Card>
        )}

        {result.topFix && (
          <Card className="border-warning bg-warning-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                Highest-Impact Fix
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.topFix.dimension && (
                <Badge variant="outline" className="font-normal">{result.topFix.dimension}</Badge>
              )}
              <p className="text-sm">{result.topFix.text}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
