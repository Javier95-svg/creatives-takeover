import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { CohortInviteCard, type CohortInvite } from '@/components/cohort/CohortInviteCard';
import { FounderCohortScreen, type CohortCheckinValues, type FounderCohortSource } from '@/components/cohort/FounderCohortView';
import ProgramDashboard from '@/components/cohort/ProgramDashboard';
import { ENTERPRISE_DEMO } from '@/data/enterprisePage';
import { DEMO_COHORT_ID, DEMO_USER_ID, demoCohort, demoDashboard } from '@/lib/pilotDemo';
import { WindowDots } from './EnterpriseVisuals';
import { PILOT_DEMO_ANCHORS, usePilotDemo } from '@/lib/pilotDemoContext';

// The /enterprise pilot demo (2026-10-24): the real cohort screens, on sample
// data, played by the visitor. State lives in PilotDemoContext; nothing is
// saved and nothing reaches the database.

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** An app window like the product screenshots, marked as a live demo. */
function DemoWindow({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="ent-window ent-demo" aria-label={`${title}, live demo`}>
      <div className="ent-window__bar">
        <WindowDots />
        <span className="ent-window__title">{title}</span>
        <span className="ent-example is-live">
          {ENTERPRISE_DEMO.tag}<span className="ent-example__more">{ENTERPRISE_DEMO.tagMore}</span>
        </span>
      </div>
      <div className="ent-demo__body">{children}</div>
    </section>
  );
}

/** What to try next, with an optional action beside it. */
function DemoCue({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <p className="ent-demo__cue" aria-live="polite">
      <i className="ent-hotspot__dot" aria-hidden="true" />
      <span>{children}</span>
      {action}
    </p>
  );
}

function useDemoCohort() {
  return useMemo(() => demoCohort(new Date()), []);
}

/** Step 2: the invitation a founder opens, with the consent. */
export function JoinDemo({ tryIt }: { tryIt: string }) {
  const { state, dispatch, track, scrollTo } = usePilotDemo();
  const cohort = useDemoCohort();
  const invite: CohortInvite = {
    kind: 'member',
    cohortId: DEMO_COHORT_ID,
    cohortName: cohort.cohortName,
    programName: cohort.programName,
    startDate: cohort.startDate,
    endDate: cohort.endDate,
    status: 'active',
    alreadyJoined: Boolean(state.joinedAt),
  };

  const join = () => {
    dispatch({ type: 'join', at: new Date().toISOString() });
    track('joined');
    toast.success(`You joined ${cohort.programName}. Your founder view is open below.`);
  };

  return (
    <div>
      <DemoCue
        action={state.joinedAt ? (
          <button type="button" className="ent-demo__link" onClick={() => scrollTo('founder')}>{ENTERPRISE_DEMO.joinedCta}</button>
        ) : null}
      >
        {state.joinedAt ? 'You’re in. Your program can now see your progress.' : tryIt}
      </DemoCue>
      <DemoWindow id={PILOT_DEMO_ANCHORS.join} title="Founder invitation">
        <CohortInviteCard
          invite={invite}
          signedIn
          agreed={state.agreed}
          onAgreedChange={(agreed) => dispatch({ type: 'agree', agreed })}
          joining={false}
          error={null}
          onJoin={join}
          onGoToDashboard={() => scrollTo('founder')}
          consentId="demo-cohort-consent"
          headingLevel="h3"
        />
      </DemoWindow>
    </div>
  );
}

/** Step 3: the founder's cohort view. Locked until the visitor joins. */
export function FounderDemo({ tryIt }: { tryIt: string }) {
  const { state, dispatch, track, scrollTo } = usePilotDemo();
  const cohort = useDemoCohort();
  const locked = !state.joinedAt;
  const screenRef = useRef<HTMLDivElement>(null);

  // While locked, the screen behind the overlay can't be tabbed into.
  useEffect(() => {
    if (screenRef.current) screenRef.current.inert = locked;
  }, [locked]);

  const source: FounderCohortSource = {
    stage: 'IDENTITY',
    doneTaskIds: new Set(state.doneTaskIds),
    toggleTask: (taskId, completed) => {
      dispatch({ type: 'toggleTask', taskId, done: completed, at: new Date().toISOString() });
      track('task_toggled');
    },
    togglingTask: false,
    canAct: !locked,
    checkin: state.checkin
      ? {
        week_number: 1,
        wins: state.checkin.wins,
        blockers: state.checkin.blockers,
        next_week_goals: state.checkin.nextWeekGoals,
        help_needed: state.checkin.helpNeeded,
      }
      : null,
    submitCheckin: async (values: CohortCheckinValues) => {
      dispatch({ type: 'sendCheckin', checkin: values, at: new Date().toISOString() });
      track('checkin_sent');
      // The product's own message, then a look at where it went.
      toast.success('Week 1 check-in sent to your program.');
      window.setTimeout(() => scrollTo('program'), reducedMotion() ? 0 : 700);
    },
    shareUserId: null,
  };

  return (
    <div>
      <DemoCue
        action={state.checkin ? (
          <button type="button" className="ent-demo__link" onClick={() => scrollTo('program')}>{ENTERPRISE_DEMO.sentCta}</button>
        ) : null}
      >
        {state.checkin ? 'Sent. Your program reads it on its dashboard.' : tryIt}
      </DemoCue>
      <DemoWindow id={PILOT_DEMO_ANCHORS.founder} title="Founder view">
        <div className={locked ? 'ent-demo__locked' : undefined}>
          <div ref={screenRef} aria-hidden={locked || undefined}>
            {/* Remounts on join and on Start over, so typed text and edits clear. */}
            <FounderCohortScreen key={state.joinedAt ?? 'locked'} cohort={cohort} source={source} taskLinks={false} headingLevel="h3" />
          </div>
          {locked ? (
            <div className="ent-demo__lock">
              <p>{ENTERPRISE_DEMO.locked}</p>
              <button type="button" className="ent-btn ent-btn--ghost" onClick={() => scrollTo('join')}>{ENTERPRISE_DEMO.lockedCta}</button>
            </div>
          ) : null}
        </div>
      </DemoWindow>
    </div>
  );
}

/** Step 4: the program dashboard, with the visitor's own row once they've joined. */
export function ProgramDemo({ tryIt, tryItJoined }: { tryIt: string; tryItJoined: string }) {
  const { state, dispatch, track, scrollTo } = usePilotDemo();
  const data = useMemo(() => demoDashboard(state, new Date()), [state]);
  const started = Boolean(state.agreed || state.joinedAt);

  const reset = () => {
    dispatch({ type: 'reset' });
    track('reset');
    scrollTo('join');
  };

  return (
    <div>
      <DemoCue
        action={started ? (
          <button type="button" className="ent-demo__link" onClick={reset}>
            <RotateCcw aria-hidden="true" />
            {ENTERPRISE_DEMO.reset}
          </button>
        ) : null}
      >
        {state.joinedAt ? tryItJoined : tryIt}
      </DemoCue>
      <DemoWindow id={PILOT_DEMO_ANCHORS.program} title="Program dashboard">
        <ProgramDashboard
          key={state.joinedAt ?? 'sample'}
          cohortId={DEMO_COHORT_ID}
          data={data}
          demo
          highlightUserId={state.joinedAt ? DEMO_USER_ID : undefined}
          onDemoAction={track}
          headingLevel="h3"
        />
      </DemoWindow>
    </div>
  );
}
