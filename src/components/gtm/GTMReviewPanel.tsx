import { useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { describeGTMPlanChanges, GTM_DECISION_LABELS } from '@/lib/gtmReviewDiff';
import type { GTMPlanV2, GTMReviewProposal, GTMWeeklyReview, GTMWeeklyReviewInput } from '@/lib/gtmV2';

const EMPTY_INPUT: GTMWeeklyReviewInput = { wins: '', misses: '', objections: '', customerLanguage: '', blockers: '', notes: '' };

const MAIN_QUESTIONS = [
  ['wins', 'What worked?', 'Replies, messages or people that got a response.'],
  ['misses', 'What missed?', 'What you tried that got little or nothing back.'],
  ['customerLanguage', 'Words customers used', 'Their exact words for the problem or what they want.'],
] as const;

const MORE_QUESTIONS = [
  ['objections', 'Why people said no', 'The reasons buyers gave for waiting or declining.'],
  ['blockers', 'What slowed you down', 'Time, assets, product, access or tracking.'],
  ['notes', 'Anything else', 'What the numbers do not explain.'],
] as const;

interface GTMReviewPanelProps {
  plan: GTMPlanV2;
  weeklyReview: GTMWeeklyReview | null;
  reviewProposal: GTMReviewProposal | null;
  isReviewing: boolean;
  onPreview: (input: GTMWeeklyReviewInput) => Promise<void>;
  onApply: () => Promise<void>;
  onDismiss: () => void;
}

function WeekColumn({ title, week }: { title: string; week: { objective: string; actions: string[] } | null }) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {week ? (
        <>
          <p className="mt-1 font-medium text-foreground">{week.objective}</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {week.actions.map((action) => <li key={action}>{action}</li>)}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Nothing planned yet.</p>
      )}
    </div>
  );
}

/** Weekly check-in, then a side-by-side of the current and proposed week. Nothing is saved until Apply. */
export default function GTMReviewPanel({ plan, weeklyReview, reviewProposal, isReviewing, onPreview, onApply, onDismiss }: GTMReviewPanelProps) {
  const [input, setInput] = useState<GTMWeeklyReviewInput>(weeklyReview?.reviewInput ?? EMPTY_INPUT);
  const changes = useMemo(() => reviewProposal?.review.adaptation
    ? describeGTMPlanChanges(plan, reviewProposal.proposedPlan, reviewProposal.review.adaptation.week)
    : null, [plan, reviewProposal]);

  const field = ([key, label, placeholder]: readonly [keyof GTMWeeklyReviewInput, string, string]) => (
    <div key={key} className="space-y-1.5">
      <Label htmlFor={`gtm-review-${key}`}>{label}</Label>
      <Textarea
        id={`gtm-review-${key}`}
        rows={2}
        value={input[key]}
        placeholder={placeholder}
        onChange={(event) => setInput((current) => ({ ...current, [key]: event.target.value }))}
      />
    </div>
  );

  if (reviewProposal) {
    const review = reviewProposal.review;
    return (
      <section className="space-y-5 rounded-xl border border-primary/30 bg-card p-4 sm:p-6" aria-labelledby="gtm-proposal-title">
        <div>
          <p className="text-sm font-medium text-primary">Proposed for week {review.adaptation?.week ?? ''}</p>
          <h2 id="gtm-proposal-title" className="mt-1 text-xl font-semibold text-foreground">
            {GTM_DECISION_LABELS[review.decision]}: {review.nextBestAction}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{review.evidenceSummary}</p>
        </div>

        {changes ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <WeekColumn title="Now" week={changes.current} />
            <WeekColumn title="Proposed" week={changes.proposed} />
          </div>
        ) : null}

        {changes && (changes.playChanges.length > 0 || changes.assumptionsAdded.length > 0 || changes.assumptionsRemoved.length > 0 || changes.draftsRewritten > 0) ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium text-foreground">Also changes</p>
            <ul className="space-y-1 text-muted-foreground">
              {changes.playChanges.map((item) => <li key={item}>{item}</li>)}
              {changes.assumptionsAdded.map((item) => <li key={`add-${item}`}>New guess to test: {item}</li>)}
              {changes.assumptionsRemoved.map((item) => <li key={`drop-${item}`}>Drops the guess: {item}</li>)}
              {changes.draftsRewritten > 0 ? <li>{changes.draftsRewritten === 1 ? 'Rewrites 1 outreach draft.' : `Rewrites ${changes.draftsRewritten} outreach drafts.`}</li> : null}
            </ul>
          </div>
        ) : null}

        {review.adaptation?.rationale ? <p className="text-sm text-muted-foreground">Why: {review.adaptation.rationale}</p> : null}

        <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
          <Button type="button" disabled={isReviewing} onClick={() => void onApply()}>
            {isReviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="mr-2 h-4 w-4" aria-hidden="true" />}
            Apply to my plan
          </Button>
          <Button type="button" variant="ghost" disabled={isReviewing} onClick={onDismiss}>Dismiss</Button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">How did this week go?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your Traction Engine result decides whether to keep going, change one thing or stop. These notes shape what changes. You will see the proposal before anything is saved.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">{MAIN_QUESTIONS.map(field)}</div>
        <DashboardDisclosure title="More questions" summary="Optional">
          <div className="grid gap-4 sm:grid-cols-3">{MORE_QUESTIONS.map(field)}</div>
        </DashboardDisclosure>
        <Button type="button" disabled={isReviewing} onClick={() => void onPreview(input)}>
          {isReviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          See next week&apos;s changes
        </Button>
      </section>

      {weeklyReview ? (
        <section className="space-y-2 rounded-xl border border-border/60 bg-card p-4 sm:p-6">
          <p className="text-sm font-medium text-muted-foreground">Last review, week of {weeklyReview.weekStart}</p>
          <h2 className="text-lg font-semibold text-foreground">{GTM_DECISION_LABELS[weeklyReview.decision]}: {weeklyReview.nextBestAction}</h2>
          <p className="text-sm text-muted-foreground">{weeklyReview.evidenceSummary}</p>
          {weeklyReview.adaptation ? (
            <div className="pt-2 text-sm">
              <p className="font-medium text-foreground">Week {weeklyReview.adaptation.week} updated: {weeklyReview.adaptation.nextObjective}</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {weeklyReview.adaptation.nextActions.map((action) => <li key={action}>{action}</li>)}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
