import { useEffect, useMemo, useRef, useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  recommendationDecisionKey,
  recordRecommendationDecision,
  recordRecommendationFeedback,
  type RecommendationFeedbackReason,
  type RecommendationSurface,
} from '@/lib/recommendationLearning';
import { trackRetentionEvent } from '@/lib/retentionSystem';

const BASE_REASONS: Array<[RecommendationFeedbackReason, string]> = [
  ['already_completed', 'Already completed'],
  ['wrong_stage', 'Wrong stage'],
  ['wrong_goal', 'Wrong goal'],
  ['too_much_time', 'Too much time'],
];

const SOCIAL_REASONS: Array<[RecommendationFeedbackReason, string]> = [
  ['already_contacted', 'Already contacted'],
  ['not_right_person', 'Not the right person'],
  ['remind_later', 'Remind me later'],
];

export function RecommendationFeedback({
  surface,
  recommendationKey,
  metadata = {},
  recordExposure = true,
}: {
  surface: RecommendationSurface;
  recommendationKey: string;
  metadata?: Record<string, unknown>;
  recordExposure?: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showReasons, setShowReasons] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const recordedExposureKey = useRef<string | null>(null);
  const selectedToolKey = useMemo(() => {
    const activationIntent = metadata.activation_intent;
    if (typeof activationIntent === 'string' && activationIntent.trim()) return activationIntent;
    return surface;
  }, [metadata.activation_intent, surface]);
  const reasons = recommendationKey.startsWith('social:') ? SOCIAL_REASONS : BASE_REASONS;

  useEffect(() => {
    setSubmitted(false);
    setShowReasons(false);
  }, [recommendationKey]);

  useEffect(() => {
    if (!user?.id || !recordExposure) return;
    const decisionKey = recommendationDecisionKey(surface, recommendationKey);
    if (recordedExposureKey.current === decisionKey) return;
    recordedExposureKey.current = decisionKey;
    void recordRecommendationDecision({
      decisionKey,
      surface,
      candidates: [{ key: recommendationKey, toolKey: selectedToolKey }],
      selectedKey: recommendationKey,
      selectedToolKey,
      deterministicKey: recommendationKey,
      policyVersion: 'surface_baseline_v1',
      assignment: 'baseline',
    }).catch(() => {
      // Feedback remains available while the additive learning migration rolls out.
      recordedExposureKey.current = null;
    });
  }, [recordExposure, recommendationKey, selectedToolKey, surface, user?.id]);

  const submit = (relevance: 'helpful' | 'not_relevant', reason?: RecommendationFeedbackReason) => {
    if (!user?.id || submitted) return;
    setSubmitted(true);
    setShowReasons(false);
    void recordRecommendationFeedback({
      recommendationKey,
      surface,
      relevance,
      reason,
    })
      .then(() => {
        if (surface === 'command_center' && relevance === 'not_relevant') {
          return queryClient.invalidateQueries({ queryKey: ['dashboard-action-ranking'] });
        }
        return undefined;
      })
      .catch(() => {
        // Retention analytics below remains the backwards-compatible fallback.
      });
    void trackRetentionEvent('dashboard_recommendation_feedback', {
      user_id: user.id,
      surface,
      recommendation_key: recommendationKey,
      relevance,
      reason: reason ?? null,
      context_version: 1,
      ...metadata,
    });
  };

  if (submitted) {
    return <p className="text-xs text-muted-foreground" role="status">Thanks — this will improve future recommendations.</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs text-muted-foreground">Was this relevant?</span>
      <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => submit('helpful')}>
        <ThumbsUp className="h-3 w-3" />Helpful
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => setShowReasons(true)}>
        <ThumbsDown className="h-3 w-3" />Not relevant
      </Button>
      {showReasons ? (
        <div className="basis-full pt-1" role="group" aria-label="Why was this recommendation not relevant?">
          <p className="mb-1.5 text-xs text-muted-foreground">What was off?</p>
          <div className="flex flex-wrap gap-1.5">
            {reasons.map(([reason, label]) => (
              <Button key={reason} type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => submit('not_relevant', reason)}>
                {label}
              </Button>
            ))}
            <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowReasons(false)}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
