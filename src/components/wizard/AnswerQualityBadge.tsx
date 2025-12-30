/**
 * Answer Quality Badge Component
 * Displays non-blocking quality feedback for wizard answers
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { AnswerQuality, getQualityLevelColor, getScoreBadgeColor } from '@/services/answerQualityService';

interface AnswerQualityBadgeProps {
  quality: AnswerQuality;
  onImprove?: () => void;
  compact?: boolean;
}

export const AnswerQualityBadge: React.FC<AnswerQualityBadgeProps> = ({
  quality,
  onImprove,
  compact = false,
}) => {
  const colors = getQualityLevelColor(quality.level);
  const scoreBadgeColor = getScoreBadgeColor(quality.score);

  const getIcon = () => {
    switch (quality.level) {
      case 'excellent':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'good':
        return <TrendingUp className="w-3.5 h-3.5" />;
      case 'needs-improvement':
        return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  const getLabel = () => {
    switch (quality.level) {
      case 'excellent':
        return 'Excellent Answer';
      case 'good':
        return 'Good Answer';
      case 'needs-improvement':
        return 'Could Be Better';
    }
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
              >
                {getIcon()}
                <span>{quality.score}</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <div className="font-semibold">{getLabel()} ({quality.score}/100)</div>
              <div className="text-xs space-y-1">
                {quality.feedback.map((item, idx) => (
                  <p key={idx} className="text-muted-foreground">{item}</p>
                ))}
              </div>
              {quality.suggestions.length > 0 && onImprove && (
                <button
                  onClick={onImprove}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  See suggestions →
                </button>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
      <div className="flex items-center gap-2 flex-1">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${scoreBadgeColor} text-white font-bold text-sm`}>
          {quality.score}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {getIcon()}
            <span className={`text-sm font-semibold ${colors.text}`}>{getLabel()}</span>
          </div>
          <div className="text-xs space-y-0.5">
            {quality.feedback.slice(0, 2).map((item, idx) => (
              <p key={idx} className="text-muted-foreground">{item}</p>
            ))}
          </div>
        </div>
      </div>

      {quality.suggestions.length > 0 && onImprove && (
        <button
          onClick={onImprove}
          className={`text-xs px-3 py-1.5 rounded-md border font-medium hover:bg-background/50 transition-colors ${colors.text} ${colors.border}`}
        >
          Improve
        </button>
      )}
    </div>
  );
};

export default AnswerQualityBadge;
