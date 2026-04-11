import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, CheckCircle2, Flag, Target, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PartnerMatchingModal } from '@/components/social/PartnerMatchingModal';
import { useAuth } from '@/contexts/AuthContext';
import { useMentorRecommendations } from '@/hooks/useMentorRecommendations';
import { captureEvent } from '@/lib/analytics';
import { trackActivity } from '@/lib/activity';
import { useWeeklyMission } from '@/hooks/decision-engine/useWeeklyMission';
import { buildMentorMarketplaceRoute, type MentorRecommendationTrack } from '@/lib/mentorDemand';
import { getMentorProfileUrl } from '@/utils/mentorSlug';

interface DashboardAccountabilityHeroProps {
  founderName: string;
  businessStage?: string | null;
  currentStreak: number;
}

function formatWeekRange(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function getMentorTrackForStage(stage?: string | null): MentorRecommendationTrack {
  const normalizedStage = stage?.trim().toLowerCase() ?? '';

  if (normalizedStage.includes('fundrais')) {
    return 'fundraising';
  }

  if (normalizedStage.includes('mvp') || normalizedStage.includes('prototype') || normalizedStage.includes('build')) {
    return 'mvp';
  }

  if (normalizedStage.includes('launch') || normalizedStage.includes('gtm') || normalizedStage.includes('market') || normalizedStage.includes('sales')) {
    return 'gtm';
  }

  return 'validation';
}

interface AccountabilityInterventionPanelProps {
  mentorTrack: MentorRecommendationTrack;
  missionGoal?: string;
  businessStage?: string | null;
  title: string;
  description: string;
  mentorRoute: string;
  onMentorClick: () => void;
  onPartnerClick: () => void;
}

function AccountabilityInterventionPanel({
  mentorTrack,
  missionGoal,
  businessStage,
  title,
  description,
  mentorRoute,
  onMentorClick,
  onPartnerClick,
}: AccountabilityInterventionPanelProps) {
  const { loading, recommendations } = useMentorRecommendations(
    {
      track: mentorTrack,
      targetAudience: businessStage ?? undefined,
      summaryInsight: description,
      extraKeywords: missionGoal ? [missionGoal] : undefined,
    },
    {
      limit: 1,
      source: 'dashboard-accountability-phase2-intervention',
    },
  );

  const recommendedMentor = recommendations[0];
  const mentorProfileRoute = recommendedMentor
    ? getMentorProfileUrl(recommendedMentor.mentor.id, recommendedMentor.mentor.name)
    : mentorRoute;
  const mentorCtaLabel = recommendedMentor
    ? `Talk to ${recommendedMentor.mentor.name}`
    : 'Browse Matching Mentors';

  return (
    <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
        <AlertTriangle className="h-4 w-4" />
        {title}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      <div className="mt-4 rounded-2xl border border-border/60 bg-background/85 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Outside pressure</p>
        {loading ? (
          <div className="mt-3 space-y-2 animate-pulse">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        ) : recommendedMentor ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-semibold text-foreground">Recommended mentor: {recommendedMentor.mentor.name}</p>
            <p className="text-sm leading-6 text-muted-foreground">{recommendedMentor.reason}</p>
            {recommendedMentor.matchedExpertise.length > 0 ? (
              <p className="text-xs leading-5 text-muted-foreground">
                Best-fit expertise: {recommendedMentor.matchedExpertise.join(', ')}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Browse mentors already filtered to the kind of pressure this week needs.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link to={mentorProfileRoute} onClick={onMentorClick}>
            {mentorCtaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" onClick={onPartnerClick}>
          Find Accountability Partner
        </Button>
      </div>
    </div>
  );
}

export function DashboardAccountabilityHero({ founderName, businessStage, currentStreak }: DashboardAccountabilityHeroProps) {
  const { user } = useAuth();
  const { currentMission, recentMissions, isLoading, error } = useWeeklyMission();
  const [isPartnerMatchingOpen, setIsPartnerMatchingOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="h-10 w-3/4 rounded bg-muted" />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="h-20 rounded-2xl bg-muted/80" />
              <div className="h-20 rounded-2xl bg-muted/80" />
              <div className="h-20 rounded-2xl bg-muted/80" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20 bg-card/90 shadow-sm">
        <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary">Weekly accountability</Badge>
            <h2 className="font-space-grotesk text-2xl font-semibold tracking-tight">Your weekly commitment could not load.</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Open the full weekly commitment page to set or review it directly.
            </p>
          </div>
          <Button asChild>
            <Link to="/weekly-mission">
              Open Weekly Commitment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isActive = currentMission?.status === 'active';
  const isReviewed = Boolean(currentMission && currentMission.status !== 'active');
  const missedCommitment = currentMission?.commitment_outcome === 'missed';
  const daysRemaining = currentMission
    ? Math.ceil((new Date(currentMission.week_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const mentorTrack = getMentorTrackForStage(businessStage);
  const mentorRoute = buildMentorMarketplaceRoute({
    track: mentorTrack,
    source: 'dashboard-accountability-phase2',
  });
  const reviewedRecentMissions = recentMissions.filter((mission) => mission.status !== 'active');
  const recentMissedMissions = reviewedRecentMissions.filter(
    (mission) => mission.commitment_outcome === 'missed' || mission.status === 'abandoned',
  );
  const repeatedMissPattern = recentMissedMissions.length >= 2;
  const repeatedMissSummary = repeatedMissPattern
    ? `${recentMissedMissions.length} missed commitments in the last ${reviewedRecentMissions.length} reviewed weeks`
    : null;

  const consistencySignal = currentStreak >= 7
    ? {
        label: 'Locked in',
        detail: `${currentStreak}-day streak`,
        description: 'You have a real rhythm. Protect it by closing the commitment before adding new work.',
      }
    : currentStreak >= 3
    ? {
        label: 'Building rhythm',
        detail: `${currentStreak}-day streak`,
        description: 'The habit is forming. Keep the week narrow enough to finish.',
      }
    : currentStreak >= 1
    ? {
        label: 'Fragile rhythm',
        detail: `${currentStreak}-day streak`,
        description: 'A little consistency is there, but the week can still slip if the commitment stays vague.',
      }
    : {
        label: 'No rhythm yet',
        detail: '0-day streak',
        description: 'You need a shorter commitment and one concrete action today to create momentum.',
      };

  const isStuck = Boolean(
    repeatedMissPattern ||
    (currentMission && (
      missedCommitment ||
      (isActive && daysRemaining !== null && daysRemaining <= 0 && currentStreak === 0)
    )),
  );
  const isAtRisk = Boolean(
    !repeatedMissPattern &&
    currentMission &&
    !isStuck &&
    isActive &&
    daysRemaining !== null &&
    daysRemaining <= 2 &&
    (currentStreak <= 1 || recentMissedMissions.length >= 1),
  );

  const interventionTitle = repeatedMissPattern
    ? 'This is becoming a pattern.'
    : isStuck
    ? 'You look stuck. Do not solve this week alone.'
    : isAtRisk
    ? 'This week is drifting.'
    : null;
  const interventionDescription = repeatedMissPattern
    ? `You have missed multiple recent commitments. ${repeatedMissSummary}. Break the pattern with outside pressure and a smaller next commitment.`
    : isStuck
    ? 'The commitment either missed or ran out of runway with no execution rhythm. Get outside pressure before next week repeats this one.'
    : isAtRisk
    ? recentMissedMissions.length >= 1
      ? 'You still have time, but the last missed week plus a weak execution signal suggest this commitment is slipping toward another miss.'
      : 'You still have time, but the signal says the week is losing shape. Pressure-test the next move now instead of waiting for the review.'
    : null;
  const interventionState = isStuck ? 'stuck' : isAtRisk ? 'at_risk' : 'on_track';

  const trackInterventionClick = (target: 'mentor' | 'partner') => {
    captureEvent('dashboard_accountability_intervention_clicked', {
      target,
      state: interventionState,
      mentorTrack,
      missionStatus: currentMission?.status ?? 'none',
      commitmentOutcome: currentMission?.commitment_outcome ?? null,
    });

    void trackActivity(
      'dashboard_accountability_intervention_clicked',
      {
        target,
        state: interventionState,
        mentorTrack,
        missionStatus: currentMission?.status ?? 'none',
        commitmentOutcome: currentMission?.commitment_outcome ?? null,
      },
      user?.id,
    );
  };

  const heroTitle = !currentMission
    ? `${founderName}, set the one outcome that should shape this week.`
    : isActive
    ? `This week, ${founderName}, you said you would:`
    : missedCommitment
    ? `${founderName}, this week closed short.`
    : `${founderName}, you closed the week on your word.`;

  const heroDescription = !currentMission
    ? 'Write one commitment before the rest of the dashboard competes for attention.'
    : isActive
    ? 'Keep this sentence visible. The rest of the dashboard should help you finish it.'
    : missedCommitment
    ? 'Review what blocked the week, then tighten the next commitment until it is finishable.'
    : 'Use that momentum to pick the next bottleneck and commit to one clear finish line.';

  const primaryActionLabel = !currentMission
    ? 'Set Weekly Commitment'
    : isActive
    ? 'Open Commitment'
    : 'Review Commitment';

  const statusLabel = !currentMission
    ? 'Not set'
    : isActive
    ? 'In play'
    : missedCommitment
    ? 'Not done'
    : 'Done';

  const statusClassName = !currentMission
    ? 'bg-secondary text-secondary-foreground'
    : isActive
    ? 'bg-primary/12 text-primary border-primary/20'
    : missedCommitment
    ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20'
    : 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20';

  const reflection = currentMission?.reflection_text?.trim();

  return (
    <Card className="border-primary/25 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.16),_transparent_40%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--card))_62%)] shadow-lg shadow-primary/5">
      <CardContent className="p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary hover:bg-primary/10">
                Weekly accountability
              </Badge>
              {businessStage ? <Badge variant="outline">{businessStage}</Badge> : null}
            </div>

            <div className="space-y-3">
              <h2 className="font-space-grotesk text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {heroTitle}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {heroDescription}
              </p>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/85 p-5 shadow-sm backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">This week, I will</p>
              <p className="mt-3 text-lg font-semibold leading-8 text-foreground sm:text-xl">
                {currentMission?.mission_goal || 'Set the single outcome you are willing to be judged on this week.'}
              </p>
              {isReviewed && reflection ? (
                <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm leading-6 text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2 font-medium text-orange-700 dark:text-orange-300">
                    <AlertTriangle className="h-4 w-4" />
                    What got in the way
                  </div>
                  <p>{reflection}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex w-full max-w-xl flex-col gap-4 xl:min-w-[340px] xl:max-w-[360px]">
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Target className="h-3.5 w-3.5" />
                  Status
                </div>
                <div className={`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${statusClassName}`}>
                  {statusLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Consistency
                </div>
                <p className="text-sm font-semibold text-foreground">{consistencySignal.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{consistencySignal.detail}</p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Week
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {currentMission ? formatWeekRange(currentMission.week_start_date, currentMission.week_end_date) : 'Current week'}
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {isReviewed && !missedCommitment ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Flag className="h-3.5 w-3.5" />}
                  Accountability
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {!currentMission
                    ? 'One promise not set yet'
                    : isActive
                    ? daysRemaining === null
                      ? 'Week in motion'
                      : daysRemaining > 1
                      ? `${daysRemaining} days left`
                      : daysRemaining === 1
                      ? '1 day left'
                      : daysRemaining === 0
                      ? 'Last day'
                      : 'Week overdue'
                    : missedCommitment
                    ? 'Reset from reality'
                    : 'Closed with follow-through'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {isStuck ? <AlertTriangle className="h-3.5 w-3.5 text-orange-500" /> : <Flag className="h-3.5 w-3.5" />}
                Execution signal
              </div>
              <p className="text-sm font-semibold text-foreground">
                {isStuck ? 'Stuck' : isAtRisk ? 'At risk' : 'On track'}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {repeatedMissSummary ?? (isStuck || isAtRisk ? interventionDescription : consistencySignal.description)}
              </p>
            </div>

            {interventionTitle && interventionDescription ? (
              <AccountabilityInterventionPanel
                mentorTrack={mentorTrack}
                missionGoal={currentMission?.mission_goal}
                businessStage={businessStage}
                title={interventionTitle}
                description={interventionDescription}
                mentorRoute={mentorRoute}
                onMentorClick={() => trackInterventionClick('mentor')}
                onPartnerClick={() => {
                  trackInterventionClick('partner');
                  setIsPartnerMatchingOpen(true);
                }}
              />
            ) : null}

            <Button asChild size="lg" className="h-12 justify-between px-5 text-sm font-semibold">
              <Link to="/weekly-mission">
                {primaryActionLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
      <PartnerMatchingModal open={isPartnerMatchingOpen} onOpenChange={setIsPartnerMatchingOpen} />
    </Card>
  );
}