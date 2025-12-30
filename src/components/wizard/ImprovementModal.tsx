/**
 * Improvement Modal Component
 * Shows detailed improvement suggestions for wizard answers
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { AnswerQuality } from '@/services/answerQualityService';

interface ImprovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quality: AnswerQuality;
  originalAnswer: string;
  stepTitle: string;
  examples?: string[];
  onSubmitImprovement: (improvedAnswer: string) => void;
}

export const ImprovementModal: React.FC<ImprovementModalProps> = ({
  open,
  onOpenChange,
  quality,
  originalAnswer,
  stepTitle,
  examples = [],
  onSubmitImprovement,
}) => {
  const [improvedAnswer, setImprovedAnswer] = useState(originalAnswer);
  const [showExamples, setShowExamples] = useState(false);

  const handleSubmit = () => {
    onSubmitImprovement(improvedAnswer);
    onOpenChange(false);
  };

  const handleDismiss = () => {
    onOpenChange(false);
  };

  const getScoreColor = () => {
    if (quality.score >= 80) return 'text-green-600';
    if (quality.score >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Improve Your Answer
          </DialogTitle>
          <DialogDescription>
            Enhance your answer for <span className="font-semibold">{stepTitle}</span> with specific suggestions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Score */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`text-3xl font-bold ${getScoreColor()}`}>
                {quality.score}
              </div>
              <div>
                <p className="text-sm font-medium">Current Quality Score</p>
                <p className="text-xs text-muted-foreground">Out of 100</p>
              </div>
            </div>
            <Badge variant={quality.level === 'excellent' ? 'default' : 'secondary'} className="text-xs">
              {quality.level === 'excellent' ? 'Excellent' : quality.level === 'good' ? 'Good' : 'Needs Work'}
            </Badge>
          </div>

          {/* Feedback */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              What's Working
            </h4>
            <div className="space-y-2">
              {quality.feedback.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          {quality.suggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                How to Improve
              </h4>
              <div className="space-y-2">
                {quality.suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-md"
                  >
                    <TrendingUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Score Breakdown</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">Word Count</p>
                <p className="text-lg font-semibold">{quality.analysis.wordCount}/20</p>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">Specificity</p>
                <p className="text-lg font-semibold">{quality.analysis.specificityScore}/30</p>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">Relevance</p>
                <p className="text-lg font-semibold">{quality.analysis.relevanceScore}/20</p>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground">Completeness</p>
                <p className="text-lg font-semibold">{quality.analysis.completenessScore}/30</p>
              </div>
            </div>
          </div>

          {/* Examples */}
          {examples.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="text-sm font-semibold flex items-center gap-2 text-primary hover:underline"
              >
                <Lightbulb className="w-4 h-4" />
                {showExamples ? 'Hide' : 'Show'} Example Answers
              </button>
              {showExamples && (
                <div className="space-y-2">
                  {examples.map((example, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900 rounded-md text-sm"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p>{example}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Edit Answer */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Edit Your Answer</h4>
            <Textarea
              value={improvedAnswer}
              onChange={(e) => setImprovedAnswer(e.target.value)}
              rows={6}
              className="resize-none"
              placeholder="Revise your answer using the suggestions above..."
            />
            <p className="text-xs text-muted-foreground">
              Word count: {improvedAnswer.trim().split(/\s+/).length}
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
          >
            Keep Original
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={improvedAnswer.trim() === originalAnswer.trim()}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Use Improved Answer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImprovementModal;
