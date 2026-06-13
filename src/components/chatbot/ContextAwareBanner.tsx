/**
 * Context-Aware Welcome Banner
 * Shows personalized greeting based on founder profile and progress
 */

import { useAggregatedContext } from '@/hooks/useEnhancedContext';
import { AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

export function ContextAwareBanner() {
  const { context, isLoading } = useAggregatedContext();

  if (isLoading || !context) return null;

  const { founderProfile, progressMetrics, insights } = context;

  // Don't show if no profile yet
  if (!founderProfile) return null;

  // Determine message based on context
  let message = '';
  let icon = <TrendingUp className="h-4 w-4" />;
  let color = 'bg-info-subtle border-info text-info';

  if (insights.criticalBlockers.length > 0) {
    message = `⚠️ You have ${insights.criticalBlockers.length} critical blocker(s) that need attention.`;
    icon = <AlertCircle className="h-4 w-4" />;
    color = 'bg-destructive-subtle border-destructive text-destructive';
  } else if (progressMetrics.onTrack) {
    message = `🎯 Great! You're on Day ${progressMetrics.currentDay}/30 and on track with ${progressMetrics.completedMilestones.length} milestones completed.`;
    icon = <CheckCircle2 className="h-4 w-4" />;
    color = 'bg-success-subtle border-success text-success';
  } else if (progressMetrics.currentDay > 0) {
    message = `📊 Day ${progressMetrics.currentDay}/30 - Let's get you back on track! ${progressMetrics.completedMilestones.length} milestones done.`;
    icon = <TrendingUp className="h-4 w-4" />;
    color = 'bg-warning-subtle border-warning text-warning';
  } else {
    message = `👋 Welcome back! Let's continue building your business plan.`;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${color}`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}
