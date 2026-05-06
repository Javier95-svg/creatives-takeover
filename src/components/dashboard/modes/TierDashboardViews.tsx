import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  Flame,
  Library,
  Rocket,
  Target,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklyMissionPanel } from '../decision-engine/WeeklyMissionPanel';
import { TodaysMissionWidget } from '../TodaysMissionWidget';
import { QuotaCounterWidgets } from '../QuotaCounterWidgets';
import { MomentumMeter } from '../MomentumMeter';
import type { PersonalizedRecommendation } from '@/hooks/usePersonalizedDashboard';
import type { IcpDashboardSnapshot } from '@/lib/icpDraftArtifacts';
import {
  RookieEmptyState,
  StarterEmptyState,
  RisingOnboardingStrip,
  ProInvestorMotionEmpty,
} from './ModeEmptyStates';

const RISING_ONBOARDING_DISMISSED_KEY = 'ct_rising_onboarding_dismissed';

interface TierDashboardViewProps {
  userId: string;
  founderName: string;
  startupName?: string | null;
  creativeNiche?: string;
  businessStage?: string;
  streak: number;
  tasksCompletedToday: number;
  totalTasksToday: number;
  weeklyProgress: number;
  tasksCompletedThisWeek: number;
  totalTasksThisWeek: number;
  activeSprints: number;
  completedSessions: number;
  totalCheckIns: number;
  recommendations: PersonalizedRecommendation[];
  icpSummary?: IcpDashboardSnapshot | null;
}

type ActionItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  label: string;
};

type SummaryItem = {
  label: string;
  value: string;
  caption: string;
  icon: typeof Target;
};

type LinkItem = {
  label: string;
  description: string;
  href: string;
};

function SummaryStrip({ items }: { items: SummaryItem[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.label} className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                <p className="text-xl font-semibold text-foreground">{item.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{item.caption}</p>
          </div>
        );
      })}
    </div>
  );
}

function SidePanelCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
      <CardHeader className="space-y-3">
        <Badge variant="outline" className="w-fit">{eyebrow}</Badge>
        <div className="space-y-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function LinkListCard({
  eyebrow,
  title,
  description,
  links,
}: {
  eyebrow: string;
  title: string;
  description: string;
  links: LinkItem[];
}) {
  return (
    <SidePanelCard eyebrow={eyebrow} title={title} description={description}>
      <div className="space-y-3">
        {links.map((link) => (
          <Link
            key={link.label}
            to={link.href}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-4 transition-colors hover:border-primary/30 hover:bg-background"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{link.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </SidePanelCard>
  );
}

export function ProModeView({
  streak,
  weeklyProgress,
  tasksCompletedThisWeek,
  completedSessions,
  totalCheckIns,
  recommendations,
  startupName,
}: TierDashboardViewProps) {
  const hasInvestorActivity = completedSessions > 0 || totalCheckIns > 0;
  const actionItems = buildActionItems(recommendations, [
    {
      id: 'pro-angels',
      title: 'Open the Angels Network first',
      description: 'Warm investor proximity is the highest-leverage difference in Pro, so it belongs at the top of the queue.',
      href: '/community/angels',
      label: 'Warm intro',
    },
    {
      id: 'pro-deck',
      title: 'Pressure-test the pitch before outreach',
      description: 'Use the analyzer and templates before you send investor communication into the market.',
      href: '/pitch-deck-analyzer',
      label: 'Deck review',
    },
    {
      id: 'pro-research',
      title: 'Refresh your investor map',
      description: 'Keep VC and accelerator research tied to your actual fundraising narrative and current traction.',
      href: '/insighta',
      label: 'Research',
    },
  ]);

  return (
    <div className="space-y-6">
      <Card className="border-primary/25 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 shadow-xl dark:border-primary/30">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-2xl text-white">
              <Rocket className="h-5 w-5 text-primary" />
              {startupName ? `War Room — ${startupName}` : 'Pro War Room'}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/20 text-primary-foreground">Fundraising mode</Badge>
            </div>
          </div>
          <CardDescription className="max-w-3xl text-slate-300">
            Pro should feel like a command surface for investor motion. Open the Focus Funnel for stage map, Your Tasks for execution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SummaryStrip
            items={[
              { label: 'Mission status', value: `${weeklyProgress.toFixed(0)}%`, caption: 'The weekly commitment is the command object for this room.', icon: BarChart3 },
              { label: 'Execution', value: String(tasksCompletedThisWeek), caption: 'Only actions that move the commitment forward belong here.', icon: CheckCircle2 },
              { label: 'Operating rhythm', value: streak > 0 ? `${streak} day streak` : 'Needs attention', caption: 'Consistency matters, but the hero carries the real accountability signal.', icon: Flame },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
        <div className="space-y-6">
          <div id="weekly-mission">
            <WeeklyMissionPanel variant="compact" />
          </div>
          <div id="mode-fundraising">
            <FundraisingActionGrid />
          </div>
          <div id="your-tasks">
            <TodaysMissionWidget compact />
          </div>
        </div>

        <div className="space-y-6">
          {hasInvestorActivity ? (
            <ActionRadarCard
              title="Investor priorities"
              description="The next move, ranked. Open Focus Funnel for the full stage map."
              actions={actionItems}
            />
          ) : (
            <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-primary" />
                  Investor priorities
                </CardTitle>
                <CardDescription>Start your investor motion below — this panel will rank your next moves as you go.</CardDescription>
              </CardHeader>
              <CardContent>
                <ProInvestorMotionEmpty />
              </CardContent>
            </Card>
          )}

          <div id="mode-support">
            <LinkListCard
              eyebrow="Side panel"
              title="Founder access and support"
              description="Support stays reachable without competing with the War Room for attention."
              links={[
                { label: 'Angels Network', description: 'Open the investor layer when you are ready to move a relationship forward.', href: '/community/angels' },
                { label: 'Founder support', description: 'Use community support for blockers, feedback, and quick operator help.', href: '/community' },
                { label: 'Saved Mentors', description: 'Keep mentorship follow-up in its own sidebar workspace, not in the War Room.', href: '/saved-mentors' },
              ]}
            />
          </div>

          <div id="mode-usage" className="space-y-6">
            <QuotaCounterWidgets />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: typeof Target;
}) {
  return (
    <Card className="border-border/70 bg-card/80 backdrop-blur-sm shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{caption}</p>
      </CardContent>
    </Card>
  );
}

function ActionRadarCard({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: ActionItem[];
}) {
  return (
    <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => (
          <div key={action.id} className="rounded-xl border border-border/60 bg-background/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{index === 0 ? 'Now' : index === 1 ? 'Next' : 'Then'}</p>
              <Badge variant="outline">{action.label}</Badge>
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">{action.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{action.description}</p>
            <Button asChild size="sm" variant="ghost" className="mt-3 px-0 text-primary hover:bg-transparent">
              <Link to={action.href}>
                Open
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function UnlockValueCard({
  eyebrow,
  title,
  description,
  bullets,
  ctaLabel,
  ctaHref,
}: {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card">
      <CardHeader>
        <Badge variant="outline" className="w-fit">{eyebrow}</Badge>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm text-muted-foreground">
          {bullets.map((bullet) => (
            <div key={bullet} className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
              {bullet}
            </div>
          ))}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={ctaHref}>{ctaLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function FundraisingActionGrid() {
  const actions = [
    {
      title: 'Angels Network',
      description: 'Open the warm investor layer reserved for Pro founders.',
      href: '/community/angels',
    },
    {
      title: 'Pitch Deck Analyzer',
      description: 'Pressure-test your deck before investor outreach.',
      href: '/pitch-deck-analyzer',
    },
    {
      title: 'Email Templates',
      description: 'Use investor-ready templates for follow-ups and warm intros.',
      href: '/email-templates',
    },
    {
      title: 'Insighta Research',
      description: 'Review current VC and accelerator signals before you reach out.',
      href: '/insighta',
    },
  ];

  return (
    <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Fundraising Command Layer
        </CardTitle>
        <CardDescription>Move from research to outreach without leaving the premium dashboard workflow.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.title}
            to={action.href}
            className="rounded-xl border border-border/60 bg-background/70 p-4 transition-colors hover:border-primary/30 hover:bg-background"
          >
            <p className="text-sm font-semibold text-foreground">{action.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{action.description}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function buildActionItems(
  recommendations: PersonalizedRecommendation[],
  fallbackActions: ActionItem[]
) {
  const mappedRecommendations = recommendations
    .filter((item) => !item.is_completed && !item.is_dismissed)
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      href: item.action_url?.startsWith('/') ? item.action_url : '/dashboard',
      label: `P${item.priority}`,
    }));

  return mappedRecommendations.length > 0 ? mappedRecommendations : fallbackActions;
}

export function RookieModeView({ founderName, recommendations, icpSummary, totalCheckIns, completedSessions }: TierDashboardViewProps) {
  const isEmptyState = totalCheckIns === 0 && completedSessions === 0 && !icpSummary;

  if (isEmptyState) {
    return <RookieEmptyState founderName={founderName} />;
  }
  const actionItems = buildActionItems(recommendations, [
    {
      id: 'rookie-icp',
      title: 'Finish your ICP first',
      description: 'The dashboard keeps Stage 1 as the single priority because every later unlock depends on customer clarity.',
      href: '/icp-builder',
      label: 'Stage 1',
    },
    {
      id: 'rookie-mentor',
      title: 'Use your discovery call intentionally',
      description: 'Treat your included mentorship slot as a checkpoint after you can clearly describe your customer and problem.',
      href: '/community',
      label: 'Included',
    },
    {
      id: 'rookie-upgrade',
      title: 'Preview the next operating layer',
      description: 'Starter opens waitlist, PMF, and a more structured dashboard once you have the basics pinned down.',
      href: '/pricing',
      label: 'Upgrade path',
    },
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div id="mode-welcome">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/12 via-card to-card shadow-sm">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit">Rookie Mode</Badge>
            <CardTitle className="text-2xl sm:text-3xl">
              {icpSummary
                ? `Welcome, ${founderName}. Your ICP is already shaping the next move.`
                : `Welcome, ${founderName}. Start with the founder signal that matters most.`}
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm sm:text-base">
              {icpSummary
                ? `You already have a draft for ${icpSummary.personaName}. Keep the next steps tied to ${icpSummary.corePainPoint} instead of falling back to generic founder advice.`
                : 'This dashboard is intentionally quiet. Nail Stage 1 first so every later move has a real customer behind it.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Today&apos;s Priority</p>
              <p className="mt-1 text-lg font-semibold">
                {icpSummary
                  ? `Execute against the ${icpSummary.roleLine} pain you already identified.`
                  : 'Define your ICP before touching build or growth tools.'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {icpSummary
                  ? `The dashboard is using your ${icpSummary.industry} draft as the first planning signal.`
                  : 'A sharp ICP tells the rest of the platform what to prioritize for you next.'}
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
            <Link to={icpSummary ? '/dashboard/files' : '/icp-builder'}>
                {icpSummary ? 'Open My Files' : 'Open ICP Builder'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div id="mode-usage" className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ActionRadarCard
          title="Next Steps"
          description="The dashboard collapses the path to the few actions that actually matter at Rookie level."
          actions={actionItems}
        />
        <QuotaCounterWidgets />
      </div>

      <div className="rounded-2xl border border-dashed border-border/60 bg-background/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">See where you stand on the Startup Development Cycle</p>
            <p className="text-sm text-muted-foreground">
              Open Focus Funnel for the full stage map — what's done, active, and what unlocks next.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard/focus-funnel">Open Focus Funnel</Link>
          </Button>
        </div>
      </div>

      <div id="mode-preview" className="grid gap-4 md:grid-cols-2">
        <UnlockValueCard
          eyebrow="Starter Unlock"
          title="Move from clarity into traction"
          description="The next paid tier is about structured validation, not feature sprawl."
          bullets={[
            'Waitlist Maker for first demand capture',
            'PMF Lab for early feedback loops',
            '2 discovery calls and 2 co-founder posts each cycle',
          ]}
          ctaLabel="Compare Starter"
          ctaHref="/pricing"
        />
        <UnlockValueCard
          eyebrow="Longer Path"
          title="See where Rising leads"
          description="The later build and launch stages stay visible so the dashboard teaches the system before you unlock it."
          bullets={[
            'MVP Builder and Tech Stack in Stage 4',
            'GTM Strategist and Directories in Stage 5',
            'Broader research and fundraising workflows later on',
          ]}
          ctaLabel="See Rising unlocks"
          ctaHref="/pricing"
        />
      </div>
    </div>
  );
}

export function StarterModeView({
  userId,
  founderName,
  tasksCompletedToday,
  totalTasksToday,
  weeklyProgress,
  activeSprints,
  completedSessions,
  streak,
  totalCheckIns,
  recommendations,
  icpSummary,
}: TierDashboardViewProps) {
  const isEmptyState = totalCheckIns === 0 && completedSessions === 0 && !icpSummary;

  if (isEmptyState) {
    return <StarterEmptyState founderName={founderName} />;
  }
  const tasksRemainingToday = Math.max(totalTasksToday - tasksCompletedToday, 0);
  const actionItems = buildActionItems(recommendations, [
    {
      id: 'starter-waitlist',
      title: 'Launch demand capture this week',
      description: 'Use Waitlist Maker to get real names and messaging feedback before you broaden scope.',
      href: '/waitlist',
      label: 'Stage 2',
    },
    {
      id: 'starter-pmf',
      title: 'Pressure-test your PMF signal',
      description: 'PMF Lab should become the feedback loop that keeps this dashboard honest.',
      href: '/pmf-lab',
      label: 'Stage 3',
    },
    {
      id: 'starter-upgrade',
      title: 'Prepare for the Rising cockpit',
      description: 'Rising removes the staged guardrails and opens build, launch, and deeper research workflows.',
      href: '/pricing',
      label: 'Next tier',
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.85fr]">
        <div className="space-y-6">
          <Card id="mode-tasks" className="border-border/70 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Pending Tasks
              </CardTitle>
              <CardDescription>Short-horizon planning with less hand-holding and more structure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="font-medium text-foreground">Today</p>
                <p className="mt-1 text-muted-foreground">
                  {tasksRemainingToday > 0
                    ? `${tasksRemainingToday} task${tasksRemainingToday === 1 ? '' : 's'} still need action today.`
                    : 'Today is clear. Use the spare time to refine your next PMF input.'}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="font-medium text-foreground">Mission</p>
                <p className="mt-1 text-muted-foreground">Your weekly mission is {weeklyProgress.toFixed(0)}% complete. Keep the work sequential so the dashboard can enforce the right order.</p>
              </div>
            </CardContent>
          </Card>
          <ActionRadarCard
            title="Recommended Sequence"
            description="Starter keeps the work ordered so signal quality does not collapse under too many tools."
            actions={actionItems}
          />
        </div>
        <div className="space-y-6">
          <div id="mode-usage">
            <QuotaCounterWidgets />
          </div>
          {userId ? (
            <MomentumMeter
              userId={userId}
              stats={{
                activeSprints,
                completedSessions,
                currentStreak: streak,
                totalCheckIns,
              }}
            />
          ) : null}
          <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Library className="h-5 w-5 text-primary" />
                Prompt Library Shortcut
              </CardTitle>
              <CardDescription>Starter introduces five practical templates for near-term execution.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Browse five starter templates built for outreach, PMF feedback loops, and next-step planning.
              </div>
              <Button asChild variant="outline">
                <Link to="/prompt-library">Open library</Link>
              </Button>
            </CardContent>
          </Card>
          <UnlockValueCard
            eyebrow="Next Upgrade"
            title="Rising opens the full product cockpit"
            description="Once the market signal exists, the next tier removes the sequential dashboard feel and opens parallel execution."
            bullets={[
              'All five stages active at once',
              'MVP Builder, Tech Stack, GTM Strategist, and Directories',
              '10 VC and 10 accelerator profile views per cycle',
            ]}
            ctaLabel="Compare Rising"
            ctaHref="/pricing"
          />
        </div>
      </div>
    </div>
  );
}

export function RisingModeView({
  userId,
  streak,
  tasksCompletedToday,
  totalTasksToday,
  weeklyProgress,
  tasksCompletedThisWeek,
  totalTasksThisWeek,
  activeSprints,
  completedSessions,
  totalCheckIns,
  recommendations,
}: TierDashboardViewProps) {
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
    try { return Boolean(localStorage.getItem(RISING_ONBOARDING_DISMISSED_KEY)); } catch { return false; }
  });
  const showOnboardingStrip = totalCheckIns === 0 && completedSessions === 0 && !onboardingDismissed;
  const modeConfig = getDashboardModeConfig('rising');
  const navigate = useNavigate();

  function handleDismissOnboarding() {
    try { localStorage.setItem(RISING_ONBOARDING_DISMISSED_KEY, '1'); } catch { /* silent */ }
    setOnboardingDismissed(true);
  }
  const todayCompletion = totalTasksToday > 0 ? Math.round((tasksCompletedToday / totalTasksToday) * 100) : 0;
  const weeklyCompletion = totalTasksThisWeek > 0 ? Math.round((tasksCompletedThisWeek / totalTasksThisWeek) * 100) : 0;
  const actionItems = buildActionItems(recommendations, [
    {
      id: 'rising-build',
      title: 'Push the build lane forward',
      description: 'Use MVP Builder and Tech Stack to convert validated signal into something founders can actually test.',
      href: '/mvp-builder',
      label: 'Stage 4',
    },
    {
      id: 'rising-gtm',
      title: 'Pressure-test launch readiness',
      description: 'GTM Strategist and Directories should turn traction into a repeatable motion this week.',
      href: '/go-to-market',
      label: 'Stage 5',
    },
    {
      id: 'rising-research',
      title: 'Use research where it changes decisions',
      description: 'Investor and accelerator browsing should inform actual sequencing, not become passive browsing.',
      href: '/insighta',
      label: 'Research',
    },
  ]);

  return (
    <div className="space-y-6">
      {showOnboardingStrip && (
        <RisingOnboardingStrip onDismiss={handleDismissOnboarding} />
      )}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Compass className="h-5 w-5 text-primary" />
                Rising Mode
              </CardTitle>
              <Badge variant="outline">No credit prompts here</Badge>
            </div>
            <CardDescription>
              Full operating cockpit for parallel workstreams, milestone pressure, and community engagement.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Today</p>
              <p className="mt-1 text-lg font-semibold">{todayCompletion}% executed</p>
              <p className="text-sm text-muted-foreground">Keep one active build lane moving.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">This Week</p>
              <p className="mt-1 text-lg font-semibold">{weeklyCompletion}% complete</p>
              <p className="text-sm text-muted-foreground">Mission progress across all active workstreams.</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live Sprints</p>
              <p className="mt-1 text-lg font-semibold">{activeSprints}</p>
              <p className="text-sm text-muted-foreground">Parallel threads the platform is helping you move.</p>
            </div>
          </CardContent>
        </Card>
        <div id="mode-usage">
          <QuotaCounterWidgets />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.85fr]">
        <div className="space-y-6">
          <div id="weekly-mission">
            <WeeklyMissionPanel />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div id="decision-sprint">
              <DecisionSprintCard />
            </div>
            <div id="focus-funnel">
              <FocusFunnelWidget compact onOpenAIPartner={() => navigate('/dashboard/focus-funnel')} />
            </div>
          </div>
          <div id="your-tasks">
            <TodaysMissionWidget compact />
          </div>
        </div>
        <div className="space-y-6">
          <div id="mode-tools">
            <ToolLauncherGrid
              title="All BizMap Tools"
              description="Every core BizMap tool is surfaced here so you can work in parallel instead of waiting for the next unlock."
            />
          </div>
          <ActionRadarCard
            title="Priority Radar"
            description="The Rising workspace is denser, but it still needs a ranked next-step list instead of noise."
            actions={actionItems}
          />
          <Card id="mode-stage" className="border-border/70 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Full Stage Overview</CardTitle>
              <CardDescription>Stages no longer force a sequence. Use the order that best matches the startup pressure you are under this week.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {STAGE_DEFINITIONS.filter((stage) => modeConfig.activeStages.includes(stage.id)).map((stage) => (
                <div key={stage.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stage {stage.id}</p>
                    <p className="text-sm font-semibold text-foreground">{stage.title}</p>
                  </div>
                  <Badge variant="secondary">Open</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <InsightaActivityCard />
            <CommunityActivityCard />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Tasks Completed This Week" value={String(tasksCompletedThisWeek)} caption="Progress through operational work" icon={CheckCircle2} />
        <MetricCard label="Stage Progress" value={`${weeklyProgress.toFixed(0)}%`} caption="Mission and stage momentum" icon={BarChart3} />
        <MetricCard label="Community Activity" value={streak > 0 ? `${streak} day streak` : 'Start today'} caption="Consistency still matters, even in Rising" icon={Flame} />
      </div>
      {userId ? (
        <MomentumMeter
          userId={userId}
          stats={{
            activeSprints,
            completedSessions,
            currentStreak: streak,
            totalCheckIns,
          }}
        />
      ) : null}
    </div>
  );
}
