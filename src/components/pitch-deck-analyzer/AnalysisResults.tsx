import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Lightbulb, Star, MessageSquare, ListChecks, Workflow, Award, ClipboardList } from 'lucide-react';
import {
  PitchDeckGuestResult,
  PitchDeckDeepDetail,
  METRIC_DEFINITIONS,
  getVerdictColor,
} from '@/types/pitchDeckAnalyzer';
import { MetricsGrid } from './MetricsGrid';
import { toast } from 'sonner';

const DIMENSION_LABELS: Record<string, string> = Object.fromEntries(
  METRIC_DEFINITIONS.map((m) => [m.key, m.name]),
);

const severityClasses: Record<string, string> = {
  high: 'bg-destructive-subtle text-destructive border-destructive',
  medium: 'bg-warning-subtle text-warning border-warning',
  low: 'bg-info-subtle text-info border-border-info',
};

interface AnalysisResultsProps {
  // Accepts a saved analysis (with id) or an anonymous guest result (no id).
  analysis: PitchDeckGuestResult & { id?: string };
  onSubmitFeedback?: (rating: number, feedback?: string) => Promise<boolean>;
  onStartNew: () => void;
  // When true, the result belongs to an anonymous visitor: hide the feedback form
  // and render the signup CTA instead.
  isGuest?: boolean;
  guestCta?: React.ReactNode;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysis,
  onSubmitFeedback,
  onStartNew,
  isGuest = false,
  guestCta,
}) => {
  const [userRating, setUserRating] = useState<number>(0);
  const [userFeedback, setUserFeedback] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Deep ("Full Investor Audit") detail rides in key_insights (jsonb).
  const deep = (analysis.keyInsights ?? {}) as PitchDeckDeepDetail;
  const dimensions = deep.dimensions ?? {};
  const dimensionKeys = (Object.keys(dimensions) as Array<keyof typeof dimensions>).filter(
    (key) => dimensions[key],
  );
  const slideChecklist = deep.slideChecklist;
  const actionPlan = deep.actionPlan ?? [];
  const narrativeFlow = deep.narrativeFlow;
  const benchmark = deep.benchmark;
  const guestFindings = [
    ...analysis.weaknesses,
    ...analysis.recommendations,
    ...analysis.strengths,
  ].filter(Boolean).slice(0, 3);

  const handleSubmitFeedback = async () => {
    if (userRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!onSubmitFeedback) return;
    setSubmittingFeedback(true);
    const success = await onSubmitFeedback(userRating, userFeedback);
    if (success) {
      setUserFeedback('');
    }
    setSubmittingFeedback(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Overall Score Card */}
      <Card className="border-2">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Score Display */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold mb-1">Overall Deck Score</h2>
                <p className="text-muted-foreground">Your pitch deck analysis results</p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-bold text-primary">{analysis.overallScore}</span>
                <span className="text-3xl text-muted-foreground">/100</span>
              </div>
              <Badge className={`text-sm px-4 py-1.5 ${getVerdictColor(analysis.verdict)}`}>
                {analysis.verdict}
              </Badge>
            </div>

            {/* Circular Progress Indicator */}
            <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="96"
                  cy="96"
                  r="85"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-muted-foreground/20"
                />
                {/* Progress circle */}
                <circle
                  cx="96"
                  cy="96"
                  r="85"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 85}`}
                  strokeDashoffset={`${2 * Math.PI * 85 * (1 - analysis.overallScore / 100)}`}
                  className={`transition-all duration-1000 ${
                    analysis.overallScore >= 85 ? 'text-success' :
                    analysis.overallScore >= 70 ? 'text-info' :
                    analysis.overallScore >= 55 ? 'text-warning' :
                    'text-destructive'
                  }`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold">{analysis.overallScore}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isGuest && (
        <>
          <Card className="border-primary/25">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Top Findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {guestFindings.length > 0 ? (
                <ul className="space-y-3">
                  {guestFindings.map((finding, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your full deck breakdown is ready, including slide coverage, narrative flow, and prioritized fixes.
                </p>
              )}
            </CardContent>
          </Card>
          {guestCta ?? null}
        </>
      )}

      {!isGuest && (
      <>
      {/* Metrics Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Metric Breakdown</span>
            <Badge variant="outline" className="font-normal">6 Dimensions</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MetricsGrid subScores={analysis.subScores} />
        </CardContent>
      </Card>

      {/* Insights Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Strengths */}
        {analysis.strengths.length > 0 && (
          <Card className="border-success bg-success-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <CheckCircle2 className="h-5 w-5" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Weaknesses */}
        {analysis.weaknesses.length > 0 && (
          <Card className="border-warning bg-warning-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <Card className="border-info bg-info-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-info">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.recommendations.map((recommendation, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-info shrink-0 mt-0.5" />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Prioritized Action Plan */}
      {actionPlan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Prioritized Action Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {actionPlan.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {item.priority ?? idx + 1}
                  </span>
                  <div className="text-sm">
                    <p className="font-medium">{item.action}</p>
                    {item.impact && <p className="text-muted-foreground mt-0.5">{item.impact}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Per-dimension findings */}
      {dimensionKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Detailed Findings</span>
              <Badge variant="outline" className="font-normal">Evidence-backed</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {dimensionKeys.map((key) => {
              const detail = dimensions[key];
              if (!detail) return null;
              return (
                <div key={String(key)} className="rounded-xl border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-sm">{DIMENSION_LABELS[String(key)] ?? String(key)}</h3>
                    <div className="flex items-center gap-2">
                      {detail.band && (
                        <Badge variant="outline" className="font-normal">{detail.band}</Badge>
                      )}
                      <span className="text-sm font-bold text-primary">{detail.score}</span>
                    </div>
                  </div>
                  {detail.findings && detail.findings.length > 0 && (
                    <ul className="space-y-2">
                      {detail.findings.map((finding, idx) => (
                        <li key={idx} className="text-sm">
                          <div className="flex items-start gap-2">
                            {finding.severity && (
                              <Badge variant="outline" className={`shrink-0 text-[10px] uppercase ${severityClasses[finding.severity] ?? ''}`}>
                                {finding.severity}
                              </Badge>
                            )}
                            <span>{finding.text}</span>
                          </div>
                          {finding.evidence && (
                            <p className="text-xs text-muted-foreground italic mt-1 ml-1">"{finding.evidence}"</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {detail.fix && (
                    <p className="mt-3 flex items-start gap-2 text-sm text-info">
                      <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{detail.fix}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Slide checklist + narrative flow */}
      {(slideChecklist || narrativeFlow) && (
        <div className="grid md:grid-cols-2 gap-6">
          {slideChecklist && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  Slide Coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {slideChecklist.present && slideChecklist.present.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Present</p>
                    <div className="flex flex-wrap gap-1.5">
                      {slideChecklist.present.map((slide) => (
                        <Badge key={slide} variant="outline" className="bg-success-subtle text-success border-success font-normal capitalize">
                          {slide}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {slideChecklist.missing && slideChecklist.missing.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Missing</p>
                    <div className="flex flex-wrap gap-1.5">
                      {slideChecklist.missing.map((slide) => (
                        <Badge key={slide} variant="outline" className="bg-warning-subtle text-warning border-warning font-normal capitalize">
                          {slide}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {narrativeFlow && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  Narrative Flow
                  {typeof narrativeFlow.score === 'number' && (
                    <Badge variant="outline" className="font-bold ml-auto">{narrativeFlow.score}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{narrativeFlow.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Benchmark */}
      {benchmark?.comparison && (
        <Card className="border-info bg-info-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-info">
              <Award className="h-5 w-5" />
              Benchmark
              {benchmark.stage && (
                <Badge variant="outline" className="font-normal capitalize ml-2">{benchmark.stage}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{benchmark.comparison}</p>
          </CardContent>
        </Card>
      )}

      {/* Anonymous visitors see the signup CTA in place of the feedback form. */}
      {isGuest ? (
        guestCta ?? null
      ) : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            How accurate was this analysis?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Star Rating */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => setUserRating(rating)}
                className="transition-all hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    rating <= userRating
                      ? 'fill-warning text-warning'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
            {userRating > 0 && (
              <span className="text-sm text-muted-foreground ml-2">
                ({userRating} {userRating === 1 ? 'star' : 'stars'})
              </span>
            )}
          </div>

          {/* Optional Feedback */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Optional: Tell us more (optional)
            </label>
            <Textarea
              placeholder="What did we get right? What could we improve?"
              value={userFeedback}
              onChange={(e) => setUserFeedback(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSubmitFeedback}
              disabled={submittingFeedback || userRating === 0}
            >
              {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </Button>
            <Button
              variant="outline"
              onClick={onStartNew}
            >
              Analyze Another Deck
            </Button>
          </div>
        </CardContent>
      </Card>
      )}
      </>
      )}
    </div>
  );
};
