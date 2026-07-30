import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { trackRetentionEvent } from '@/lib/retentionSystem';

type NegativeReason = 'already_completed' | 'wrong_stage' | 'wrong_goal' | 'too_much_time';

const REASONS: Array<[NegativeReason, string]> = [
  ['already_completed', 'Already completed'],
  ['wrong_stage', 'Wrong stage'],
  ['wrong_goal', 'Wrong goal'],
  ['too_much_time', 'Too much time'],
];

export function RecommendationFeedback({
  surface,
  recommendationKey,
  metadata = {},
}: {
  surface: 'daily_mission' | 'first_action';
  recommendationKey: string;
  metadata?: Record<string, unknown>;
}) {
  const { user } = useAuth();
  const [showReasons, setShowReasons] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = (relevance: 'helpful' | 'not_relevant', reason?: NegativeReason) => {
    if (!user?.id || submitted) return;
    setSubmitted(true);
    setShowReasons(false);
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
            {REASONS.map(([reason, label]) => (
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
