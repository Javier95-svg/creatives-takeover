import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Lightbulb, Star, MessageSquare, Download } from 'lucide-react';
import { PitchDeckAnalysis, getVerdictColor } from '@/types/pitchDeckAnalyzer';
import { MetricsGrid } from './MetricsGrid';
import { toast } from 'sonner';

interface AnalysisResultsProps {
  analysis: PitchDeckAnalysis;
  onSubmitFeedback: (rating: number, feedback?: string) => Promise<boolean>;
  onStartNew: () => void;
}

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  analysis,
  onSubmitFeedback,
  onStartNew
}) => {
  const [userRating, setUserRating] = useState<number>(0);
  const [userFeedback, setUserFeedback] = useState<string>('');
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
                    analysis.overallScore >= 85 ? 'text-green-500' :
                    analysis.overallScore >= 70 ? 'text-blue-500' :
                    analysis.overallScore >= 55 ? 'text-yellow-500' :
                    'text-red-500'
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
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Weaknesses */}
        {analysis.weaknesses.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-700">
                <AlertTriangle className="h-5 w-5" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
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
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.recommendations.map((recommendation, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Lightbulb className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Feedback Form */}
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
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
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
    </div>
  );
};
