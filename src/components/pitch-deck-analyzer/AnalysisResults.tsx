import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MetricsGrid } from './MetricsGrid';
import { getVerdictColor, PitchDeckAnalysis } from '@/types/pitchDeckAnalyzer';
import {
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  RotateCcw,
  Star,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';

interface AnalysisResultsProps {
  analysis: PitchDeckAnalysis;
  onSubmitFeedback: (rating: number, feedback?: string) => Promise<boolean>;
  onStartNew: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 86;
  const strokeDashoffset = circumference * (1 - score / 100);

  return (
    <div className="relative h-52 w-52">
      <svg className="h-full w-full -rotate-90">
        <circle
          cx="104"
          cy="104"
          r="86"
          stroke="currentColor"
          strokeWidth="14"
          fill="none"
          className="text-white/10"
        />
        <circle
          cx="104"
          cy="104"
          r="86"
          stroke="currentColor"
          strokeWidth="14"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-cyan-300 transition-all duration-1000"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold text-white">{score}</span>
        <span className="text-sm text-white/70">out of 100</span>
      </div>
    </div>
  );
}

function InsightCard({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-[24px] border border-border/60 bg-background/75 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium leading-6 text-foreground">
        {value || 'Not detected'}
      </p>
    </div>
  );
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysis,
  onSubmitFeedback,
  onStartNew,
}) => {
  const [userRating, setUserRating] = useState(0);
  const [userFeedback, setUserFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const handleSubmitFeedback = async () => {
    if (userRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmittingFeedback(true);
    const success = await onSubmitFeedback(userRating, userFeedback);
    if (success) {
      setUserFeedback('');
    }
    setSubmittingFeedback(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,#081421_0%,#10263d_44%,#18364f_100%)] px-6 py-8 text-white shadow-[0_50px_120px_-70px_rgba(8,20,33,1)] sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.25),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.15),transparent_22%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/60">
              Analysis complete
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {analysis.fileName}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78 sm:text-base">
              {analysis.keyInsights?.summary ||
                'Your deck has been parsed, scored, and reviewed for investor readiness.'}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge className={`border px-4 py-1.5 text-sm ${getVerdictColor(analysis.verdict)}`}>
                {analysis.verdict}
              </Badge>
              <span className="text-sm text-white/70">
                {analysis.keyInsights?.deckReadiness}
              </span>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <ScoreRing score={analysis.overallScore} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard label="Target market" value={analysis.keyInsights?.targetMarket} />
        <InsightCard label="Value proposition" value={analysis.keyInsights?.uniqueValueProp} />
        <InsightCard label="Funding stage" value={analysis.keyInsights?.fundingStage} />
        <InsightCard label="Ask detected" value={analysis.keyInsights?.askAmount} />
      </section>

      <section className="rounded-[32px] border border-border/60 bg-background/80 p-5 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.85)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Score breakdown
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">Where the deck wins and where it leaks confidence</h3>
          </div>
          <Badge variant="outline" className="rounded-full px-4 py-1.5">
            6 dimensions
          </Badge>
        </div>

        <MetricsGrid subScores={analysis.subScores} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-emerald-500/20 bg-emerald-500/5 p-6">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-lg font-semibold">What is already working</h3>
            </div>
            <div className="mt-4 space-y-3">
              {analysis.strengths.map((strength, index) => (
                <div key={`${strength}-${index}`} className="flex items-start gap-3 text-sm leading-6">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{strength}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-amber-500/20 bg-amber-500/5 p-6">
            <div className="flex items-center gap-2 text-amber-700">
              <TriangleAlert className="h-5 w-5" />
              <h3 className="text-lg font-semibold">What will hurt investor conviction</h3>
            </div>
            <div className="mt-4 space-y-3">
              {analysis.weaknesses.map((weakness, index) => (
                <div key={`${weakness}-${index}`} className="flex items-start gap-3 text-sm leading-6">
                  <TriangleAlert className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                  <span>{weakness}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-sky-500/20 bg-sky-500/5 p-6">
          <div className="flex items-center gap-2 text-sky-700">
            <Lightbulb className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Highest-leverage recommendations</h3>
          </div>
          <div className="mt-4 space-y-4">
            {analysis.recommendations.map((recommendation, index) => (
              <div
                key={`${recommendation}-${index}`}
                className="rounded-[24px] border border-sky-500/15 bg-background/70 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sm font-semibold text-sky-700">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6">{recommendation}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InsightCard
              label="Detected sections"
              value={analysis.keyInsights?.detectedSections?.join(', ')}
            />
            <InsightCard
              label="Missing sections"
              value={analysis.keyInsights?.missingSections?.join(', ')}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-border/60 bg-background/80 p-6 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.85)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <h3 className="text-lg font-semibold">How accurate was this analysis?</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Feedback helps calibrate scoring and improve the recommendations founders receive.
            </p>
          </div>

          <Button variant="outline" onClick={onStartNew} className="rounded-2xl">
            <RotateCcw className="mr-2 h-4 w-4" />
            Analyze another deck
          </Button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => setUserRating(rating)}
                className="rounded-full p-1 transition-transform duration-150 hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    rating <= userRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
            {userRating > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                {userRating}/5 accuracy rating
              </span>
            )}
          </div>

          <Textarea
            placeholder="What felt right? What missed the mark?"
            value={userFeedback}
            onChange={(event) => setUserFeedback(event.target.value)}
            rows={4}
            className="rounded-2xl"
          />

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSubmitFeedback}
              disabled={submittingFeedback || userRating === 0}
              className="rounded-2xl"
            >
              <Target className="mr-2 h-4 w-4" />
              {submittingFeedback ? 'Submitting...' : 'Submit feedback'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
