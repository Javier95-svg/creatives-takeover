import type { ReactNode } from 'react';
import { CalendarDays, Check, Lock, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export type CohortInvite = {
  kind: 'member' | 'staff';
  cohortId: string;
  cohortName: string;
  programName: string | null;
  startDate: string;
  endDate: string;
  status: string;
  alreadyJoined: boolean;
};

// What a founder agrees to share by joining; mirrors cohort_dashboard_v1.
const COHORT_SHARED = ['Your name and email', 'Your stage and completed tasks', 'Counts of assumptions, interviews, evidence, experiments and decisions', 'Your weekly check-ins'];
const COHORT_PRIVATE = ['Your files and saved work', 'The details of your idea', 'Your messages'];

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * The invitation a program sends: who it's from, what is shared and what stays
 * private, the consent and the join button. Used by /join/:code with the real
 * invite, and by the /enterprise demo with a sample one, so both always match.
 */
export function CohortInviteCard({
  invite,
  signedIn,
  agreed,
  onAgreedChange,
  joining,
  error,
  onJoin,
  onGoToDashboard,
  signedOutActions,
  consentId = 'cohort-consent',
  headingLevel = 'h1',
}: {
  invite: CohortInvite;
  signedIn: boolean;
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
  joining: boolean;
  error: string | null;
  onJoin: () => void;
  onGoToDashboard: () => void;
  /** Sign-up and sign-in links for visitors without an account. */
  signedOutActions?: ReactNode;
  /** Unique per page, so two cards never share a checkbox id. */
  consentId?: string;
  /** h1 on the join page; lower inside another page. */
  headingLevel?: 'h1' | 'h2' | 'h3';
}) {
  const isStaff = invite.kind === 'staff';
  const Heading = headingLevel;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {isStaff ? 'Program staff invitation' : 'Cohort invitation'}
      </p>
      <Heading className="mt-3 font-space-grotesk text-3xl font-semibold tracking-tight text-foreground">
        {invite.programName || invite.cohortName}
      </Heading>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {invite.programName ? (
          <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" aria-hidden="true" />{invite.cohortName}</span>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {formatDate(invite.startDate)} – {formatDate(invite.endDate)}
        </span>
      </p>

      {invite.alreadyJoined ? (
        <div className="mt-8">
          <p className="text-foreground">You’re already in this cohort.</p>
          <Button className="mt-4" onClick={onGoToDashboard}>Go to your dashboard</Button>
        </div>
      ) : (
        <>
          {isStaff ? (
            <p className="mt-6 text-foreground">
              As program staff you’ll see every founder’s progress and weekly check-ins on your dashboard. You won’t see their files, ideas or messages.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">Shared with your program</p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {COHORT_SHARED.map((item) => (
                    <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">Stays private</p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {COHORT_PRIVATE.map((item) => (
                    <li key={item} className="flex items-start gap-2"><Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {signedIn ? (
            <div className="mt-6 space-y-4">
              {!isStaff ? (
                <label htmlFor={consentId} className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
                  <Checkbox id={consentId} checked={agreed} onCheckedChange={(value) => onAgreedChange(value === true)} className="mt-0.5" />
                  I agree to share my progress and weekly check-ins with {invite.programName || 'this program'} and the Creatives Takeover team.
                  You can leave the cohort and stop sharing at any time from your dashboard.
                </label>
              ) : null}
              {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
              <Button size="lg" className="w-full" disabled={joining || (!isStaff && !agreed)} onClick={onJoin}>
                {joining ? 'Joining…' : isStaff ? 'Join as program staff' : 'Join the cohort'}
              </Button>
            </div>
          ) : (
            signedOutActions
          )}
        </>
      )}
    </div>
  );
}
