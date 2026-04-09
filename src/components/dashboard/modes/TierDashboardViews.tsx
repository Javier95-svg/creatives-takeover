import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Compass,
  Flame,
  FolderOpen,
  Library,
  MessageSquare,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklyMissionPanel } from '../decision-engine/WeeklyMissionPanel';
import { DecisionSprintCard } from '../DecisionSprintCard';
import { TodaysMissionWidget } from '../TodaysMissionWidget';
import { FocusFunnelWidget } from '@/components/focus-funnel/FocusFunnelWidget';
import { QuotaCounterWidgets } from '../QuotaCounterWidgets';
import { MomentumMeter } from '../MomentumMeter';
import type { PersonalizedRecommendation } from '@/hooks/usePersonalizedDashboard';
import { getDashboardModeConfig } from '@/config/planPermissions';

interface TierDashboardViewProps {
  userId: string;
  founderName: string;
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
}

type ActionItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  label: string;
};

type StageDefinition = {
  id: number;
  title: string;
  summary: string;
  href?: string;
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

const STAGE_DEFINITIONS: StageDefinition[] = [
  { id: 1, title: 'Define your ICP', summary: 'Clarify who you are building for.', href: '/icp-builder' },
  { id: 2, title: 'Launch a Waitlist', summary: 'Capture early demand and outreach signals.', href: '/waitlist' },
  { id: 3, title: 'Pressure Test PMF', summary: 'Use PMF Lab to validate early traction.', href: '/pmf-lab' },
  { id: 4, title: 'Build Your Stack', summary: 'Move into MVP Builder and Tech Stack execution.' },
  { id: 5, title: 'Go To Market', summary: 'Coordinate GTM Strategist and Directories.' },
];

const TOOL_LINKS = [
  { label: 'ICP Builder', href: '/icp-builder', icon: Target },
  { label: 'Waitlist Maker', href: '/waitlist', icon: MessageSquare },
  { label: 'PMF Lab', href: '/pmf-lab', icon: Compass },
  { label: 'MVP Builder', href: '/mvp-builder', icon: Rocket },
  { label: 'Tech Stack', href: '/tech-stack', icon: Wrench },
  { label: 'GTM Strategist', href: '/go-to-market', icon: TrendingUp },
  { label: 'Directories', href: '/directories', icon: FolderOpen },
];

function StageProgressPanel({
  activeStages,
  previewStages,
  title,
  description,
}: {
  activeStages: number[];
  previewStages?: number[];
  title: string;
  description: string;
}) {
  return (
    <Card className="border-border/70 bg-card/85 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Compass className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {STAGE_DEFINITIONS.map((stage) => {
          const isActive = activeStages.includes(stage.id);
          const isPreview = previewStages?.includes(stage.id) ?? false;
          const wrapperClass = isActive
            ? 'border-primary/30 bg-primary/8'
            : isPreview
              ? 'border-dashed border-border/70 bg-muted/30'
              : 'border-border/60 bg-background/70';

          return (
            <div key={stage.id} className={`rounded-xl border p-4 ${wrapperClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stage {stage.id}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{stage.title}</p>
                </div>
                <Badge variant={isActive ? 'default' : 'outline'} className="shrink-0">
                  {isActive ? 'Active' : isPreview ? 'Preview' : 'Locked'}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{stage.summary}</p>
              {isActive && stage.href ? (
                <Button asChild size="sm" variant="ghost" className="mt-3 px-0 text-primary hover:bg-transparent">
                  <Link to={stage.href}>
                    Open stage
                    <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

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

function UpgradePreviewCard({
  eyebrow,
  title,
  description,
  cta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Card className="border-dashed border-primary/30 bg-gradient-to-br from-primary/8 via-card to-card">
      <CardHeader>
        <Badge variant="outline" className="w-fit">{eyebrow}</Badge>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm">
          <Link to="/pricing">{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function FundraisingActionGrid() {
  const actions = [
    {
      title: 'Angels Network',
      description: 'Open the investor layer reserved for founders in fundraising motion.',
      href: '/community/angels',
    },
    {
      title: 'Pitch Deck Analyzer',
      description: 'Pressure-test your deck before you send another intro or follow-up.',
      href: '/insighta/pitch-deck-analyzer',
    },
    {
      title: 'Email Templates',
      description: 'Use investor-ready templates for follow-ups, warm intros, and updates.',
      href: '/insighta/email-templates',
    },
    {
      title: 'Investor Research',
      description: 'Refresh your VC and accelerator map without losing the fundraising thread.',
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
        <CardDescription>Everything in this block should move an investor conversation forward.</CardDescription>
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

function buildActionItems(recommendations: PersonalizedRecommendation[], fallbackActions: ActionItem[]) {
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

function ToolLauncherGrid({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {TOOL_LINKS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.label}
              to={tool.href}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-4 transition-colors hover:border-primary/30 hover:bg-background"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{tool.label}</p>
                  <p className="text-xs text-muted-foreground">Launch when this workstream is the priority.</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function RookieModeView({ founderName, recommendations }: TierDashboardViewProps) {
  const modeConfig = getDashboardModeConfig('rookie');
  const actionItems = buildActionItems(recommendations, [
    {
      id: 'rookie-icp',
      title: 'Finish your ICP first',
      description: 'Stage 1 stays as the single priority because every later unlock depends on customer clarity.',
      href: '/icp-builder',
      label: 'Stage 1',
    },
    {
      id: 'rookie-mentor',
      title: 'Save one mentor as a checkpoint',
      description: 'Use mentorship as a checkpoint after you can clearly describe your customer and problem.',
      href: '/community',
      label: 'Included',
    },
    {
      id: 'rookie-upgrade',
      title: 'Preview the next operating layer',
      description: 'Starter opens waitlist, PMF, and a more structured workspace once the basics are pinned down.',
      href: '/pricing',
      label: 'Upgrade path',
    },
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div id="mode-welcome">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/12 via-card to-card shadow-sm">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit">Rookie Mode</Badge>
            <CardTitle className="text-2xl sm:text-3xl">Welcome, {founderName}. Keep the War Room quiet and customer-led.</CardTitle>
            <CardDescription className="max-w-3xl text-sm sm:text-base">
              This mode should feel calm. Your main dashboard job is to sharpen the customer signal, not to juggle build and growth surfaces too early.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Today&apos;s priority</p>
                <p className="mt-1 text-lg font-semibold">Define your ICP before touching build or growth tools.</p>
                <p className="mt-1 text-sm text-muted-foreground">A sharp ICP tells the rest of the platform what to prioritize for you next.</p>
              </div>
              <Button asChild size="lg" className="shrink-0">
                <Link to="/icp-builder">Open ICP Builder</Link>
              </Button>
            </div>
            <SummaryStrip
              items={[
                { label: 'Current stage', value: 'Stage 1', caption: 'Stay here until the customer signal is stable.', icon: Target },
                { label: 'Mentorship', value: '1 included', caption: 'Use it once you can state the problem clearly.', icon: Users },
                { label: 'Next unlock', value: 'Starter', caption: 'Validation and traction workflows wait on clarity.', icon: Rocket },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="space-y-6">
          <div id="mode-stage">
            <StageProgressPanel
              activeStages={modeConfig.activeStages}
              previewStages={modeConfig.previewStages}
              title="Your startup development cycle"
              description="The War Room stays fixed on the customer foundation. Later stages stay visible so the roadmap feels concrete without becoming noise."
            />
          </div>
          <ActionRadarCard
            title="What belongs in this War Room"
            description="Only the next three actions deserve space here. Everything else can wait in the sidebar or the next tier."
            actions={actionItems}
          />
        </div>

        <div id="mode-usage" className="space-y-6">
          <SidePanelCard
            eyebrow="Side panel"
            title="Keep support surfaces nearby"
            description="Use the side panel for helpful context so the War Room stays focused on one core move."
          >
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                Save mentors from Community when you want a follow-up queue, but review them from the dedicated Saved Mentors tab instead of this page.
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                Use the tool sidebar for exploration. The War Room should not become a catalog.
              </div>
            </div>
          </SidePanelCard>
          <QuotaCounterWidgets />
        </div>
      </div>

      <div id="mode-preview" className="grid gap-4 md:grid-cols-2">
        <UnlockValueCard
          eyebrow="Starter unlock"
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
          eyebrow="Longer path"
          title="See where Rising leads"
          description="The later build and launch stages stay visible so the platform teaches the system before you unlock it."
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
  tasksCompletedToday,
  totalTasksToday,
  weeklyProgress,
  activeSprints,
  completedSessions,
  streak,
  totalCheckIns,
  recommendations,
}: TierDashboardViewProps) {
  const modeConfig = getDashboardModeConfig('starter');
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
      description: 'PMF Lab should become the feedback loop that keeps this workspace honest.',
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
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
        <CardHeader className="space-y-3">
          <Badge variant="outline" className="w-fit">Starter Mode</Badge>
          <CardTitle className="text-2xl">Structured traction without crowding the War Room</CardTitle>
          <CardDescription className="max-w-3xl">
            Starter should keep the main workspace sequential: validate demand, pressure-test PMF, and keep just enough support material in the side panel to maintain momentum.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SummaryStrip
            items={[
              { label: 'Tasks left today', value: String(tasksRemainingToday), caption: 'Keep the day tight and specific.', icon: CheckCircle2 },
              { label: 'Weekly mission', value: `${weeklyProgress.toFixed(0)}%`, caption: 'Stay sequential so learning compounds.', icon: BarChart3 },
              { label: 'Active sprints', value: String(activeSprints), caption: 'Too many parallel threads dilute signal.', icon: Calendar },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <div className="space-y-6">
          <div id="mode-stage">
            <StageProgressPanel
              activeStages={modeConfig.activeStages}
              previewStages={modeConfig.previewStages}
              title="Active stages"
              description="Starter keeps the work in order: define the audience, capture demand, then pressure-test PMF."
            />
          </div>

          <Card id="mode-tasks" className="border-border/70 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                War Room focus
              </CardTitle>
              <CardDescription>The main surface stays small: today, this week, and the next unlock.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Today</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{tasksRemainingToday > 0 ? `${tasksRemainingToday} task${tasksRemainingToday === 1 ? '' : 's'} left` : 'Day is clear'}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {tasksRemainingToday > 0
                    ? 'Finish the narrowest next move before you open another workstream.'
                    : 'Use the spare time to sharpen a PMF input or refine your waitlist offer.'}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mission</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{weeklyProgress.toFixed(0)}% complete</p>
                <p className="mt-2 text-sm text-muted-foreground">Treat the weekly mission as the truth source for what deserves attention.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Next unlock</p>
                <p className="mt-2 text-sm font-semibold text-foreground">Rising cockpit</p>
                <p className="mt-2 text-sm text-muted-foreground">Parallel execution only matters after the validation loop is doing real work.</p>
              </div>
            </CardContent>
          </Card>

          <ActionRadarCard
            title="Recommended sequence"
            description="Starter keeps the work ordered so signal quality does not collapse under too many tools."
            actions={actionItems}
          />
        </div>

        <div id="mode-usage" className="space-y-6">
          <LinkListCard
            eyebrow="Side panel"
            title="Reference shelf"
            description="Helpful context belongs here instead of taking over the War Room."
            links={[
              { label: 'Saved Mentors', description: 'Keep your mentor shortlist in its own lane outside the War Room.', href: '/saved-mentors' },
              { label: 'Prompt Library', description: 'Grab execution templates when you need copy or structure.', href: '/prompt-library' },
              { label: 'Community', description: 'Browse mentors and co-founders without turning the War Room into a directory.', href: '/community' },
            ]}
          />
          <QuotaCounterWidgets />
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
          <UpgradePreviewCard
            eyebrow="Next upgrade"
            title="Rising opens the full operator cockpit"
            description="Once the market signal exists, the next tier opens build, launch, and broader research workflows without overcrowding this mode."
            cta="Compare Rising"
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
  tasksCompletedThisWeek,
  totalTasksThisWeek,
  activeSprints,
  completedSessions,
  totalCheckIns,
  recommendations,
}: TierDashboardViewProps) {
  const modeConfig = getDashboardModeConfig('rising');
  const navigate = useNavigate();
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
      description: 'Investor and accelerator browsing should inform sequencing, not become passive exploration.',
      href: '/insighta',
      label: 'Research',
    },
  ]);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Compass className="h-5 w-5 text-primary" />
              Rising Mode
            </CardTitle>
            <Badge variant="outline">Operator cockpit</Badge>
          </div>
          <CardDescription className="max-w-3xl">
            Rising should feel like an execution cockpit: mission, build, launch, and tasks in the War Room; tools, quotas, and reference surfaces off to the side.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SummaryStrip
            items={[
              { label: 'Today', value: `${todayCompletion}%`, caption: 'Keep one active build lane moving.', icon: CheckCircle2 },
              { label: 'This week', value: `${weeklyCompletion}%`, caption: 'Mission progress across active workstreams.', icon: BarChart3 },
              { label: 'Live sprints', value: String(activeSprints), caption: 'Parallel threads only if each one still matters.', icon: Calendar },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <ActionRadarCard
            title="Priority radar"
            description="The War Room should point to ranked action, not become a wall of mixed cards."
            actions={actionItems}
          />

          <div id="weekly-mission">
            <WeeklyMissionPanel />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div id="decision-sprint">
              <DecisionSprintCard />
            </div>
            <div id="focus-funnel">
              <FocusFunnelWidget compact onOpenAIPartner={() => navigate('/focus-funnel')} />
            </div>
          </div>

          <div id="your-tasks">
            <TodaysMissionWidget compact />
          </div>
        </div>

        <div className="space-y-6">
          <div id="mode-stage">
            <StageProgressPanel
              activeStages={modeConfig.activeStages}
              previewStages={modeConfig.previewStages}
              title="Stage map"
              description="All five stages are open, but the side panel keeps the map from crowding the War Room."
            />
          </div>

          <div id="mode-tools">
            <ToolLauncherGrid
              title="Operator toolbox"
              description="Use the side panel for tool access so the main dashboard remains a place to decide and execute."
            />
          </div>

          <div id="mode-usage" className="space-y-6">
            <QuotaCounterWidgets />
            <LinkListCard
              eyebrow="Side panel"
              title="Signals and supporting routes"
              description="Research, community, and saved mentors stay close without overwhelming the War Room."
              links={[
                { label: 'Saved Mentors', description: 'Open your shortlist in its own workspace instead of mixing it into execution.', href: '/saved-mentors' },
                { label: 'Research Hub', description: 'Use Insighta when you need research to drive a real decision.', href: '/insighta' },
                { label: 'Community', description: 'Return to founder and mentor discovery without cluttering the War Room.', href: '/community' },
              ]}
            />
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
        </div>
      </div>
    </div>
  );
}

export function ProModeView({
  userId,
  streak,
  weeklyProgress,
  tasksCompletedThisWeek,
  completedSessions,
  activeSprints,
  totalCheckIns,
  recommendations,
}: TierDashboardViewProps) {
  const modeConfig = getDashboardModeConfig('pro');
  const navigate = useNavigate();
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
      href: '/insighta/pitch-deck-analyzer',
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
              Pro War Room
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/20 text-primary-foreground">Fundraising mode</Badge>
              <Badge variant="outline" className="border-white/20 text-white/85">Cleaned up for motion</Badge>
            </div>
          </div>
          <CardDescription className="max-w-3xl text-slate-300">
            Pro should feel like a command surface for investor motion. Everything that does not directly move fundraising forward belongs in the side panel or a dedicated route.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SummaryStrip
            items={[
              { label: 'Mission status', value: `${weeklyProgress.toFixed(0)}%`, caption: 'One weekly objective should still stay visible.', icon: BarChart3 },
              { label: 'Execution', value: String(tasksCompletedThisWeek), caption: 'Completed actions across the current fundraising week.', icon: CheckCircle2 },
              { label: 'Operating rhythm', value: streak > 0 ? `${streak} day streak` : 'Needs attention', caption: 'Consistency compounds faster than access.', icon: Flame },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div id="weekly-mission">
              <WeeklyMissionPanel />
            </div>
            <div id="mode-fundraising">
              <FundraisingActionGrid />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div id="decision-sprint">
              <DecisionSprintCard />
            </div>
            <div id="focus-funnel">
              <FocusFunnelWidget compact onOpenAIPartner={() => navigate('/focus-funnel')} />
            </div>
          </div>

          <div id="your-tasks">
            <TodaysMissionWidget compact />
          </div>
        </div>

        <div className="space-y-6">
          <ActionRadarCard
            title="Investor priorities"
            description="This side panel ranks the next move so support and reference surfaces never drown the fundraising thread."
            actions={actionItems}
          />

          <div id="mode-support">
            <LinkListCard
              eyebrow="Side panel"
              title="Founder access and support"
              description="Support should stay reachable without competing with the War Room for attention."
              links={[
                { label: 'Angels Network', description: 'Open the investor layer when you are ready to move a relationship forward.', href: '/community/angels' },
                { label: 'Founder support', description: 'Use community support for blockers, feedback, and quick operator help.', href: '/community' },
                { label: 'Saved Mentors', description: 'Keep mentorship follow-up in its own sidebar workspace, not in the War Room.', href: '/saved-mentors' },
              ]}
            />
          </div>

          <div id="mode-stage">
            <StageProgressPanel
              activeStages={modeConfig.activeStages}
              previewStages={modeConfig.previewStages}
              title="Strategic stage map"
              description="Every stage stays live, but the map belongs in the side panel so fundraising motion stays central."
            />
          </div>

          <div id="mode-usage" className="space-y-6">
            <QuotaCounterWidgets />
            <SidePanelCard
              eyebrow="Executive check"
              title="Keep the side panel for support and context"
              description="These reminders stay visible without recreating the old cluttered right-column tower."
            >
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                  Keep research, community activity, and mentor follow-up in their own lanes. The War Room is for fundraising action.
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                  Active sprints: {activeSprints}. Completed sessions: {completedSessions}. Total check-ins: {totalCheckIns}.
                </div>
              </div>
            </SidePanelCard>
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
      href: '/insighta/pitch-deck-analyzer',
    },
    {
      title: 'Email Templates',
      description: 'Use investor-ready templates for follow-ups and warm intros.',
      href: '/insighta/email-templates',
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

function ToolLauncherGrid({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {TOOL_LINKS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.label}
              to={tool.href}
              className="rounded-xl border border-border/70 bg-background/80 p-4 transition-colors hover:border-primary/30 hover:bg-background"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{tool.label}</p>
                  <p className="text-xs text-muted-foreground">Launch tool</p>
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function RookieModeView({ founderName, recommendations }: TierDashboardViewProps) {
  const modeConfig = getDashboardModeConfig('rookie');
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
            <CardTitle className="text-2xl sm:text-3xl">Welcome, {founderName}. Start with the founder signal that matters most.</CardTitle>
            <CardDescription className="max-w-2xl text-sm sm:text-base">
              This dashboard is intentionally quiet. Nail Stage 1 first so every later move has a real customer behind it.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Today&apos;s Priority</p>
              <p className="mt-1 text-lg font-semibold">Define your ICP before touching build or growth tools.</p>
              <p className="mt-1 text-sm text-muted-foreground">A sharp ICP tells the rest of the platform what to prioritize for you next.</p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link to="/icp-builder">Open ICP Builder</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div id="mode-stage">
          <StageProgressPanel
            activeStages={modeConfig.activeStages}
            previewStages={modeConfig.previewStages}
            title="Your Startup Development Cycle"
            description="Stage 1 is where the platform begins guiding you. Later stages stay visible so the upgrade path feels concrete."
          />
        </div>
        <div id="mode-usage" className="space-y-6">
          <QuotaCounterWidgets />
          <ActionRadarCard
            title="Next Steps"
            description="The dashboard collapses the path to the few actions that actually matter at Rookie level."
            actions={actionItems}
          />
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
  tasksCompletedToday,
  totalTasksToday,
  weeklyProgress,
  activeSprints,
  completedSessions,
  streak,
  totalCheckIns,
  recommendations,
}: TierDashboardViewProps) {
  const modeConfig = getDashboardModeConfig('starter');
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
          <div id="mode-stage">
            <StageProgressPanel
              activeStages={modeConfig.activeStages}
              previewStages={modeConfig.previewStages}
              title="Active Stages"
              description="Starter keeps you progressing in order: define the audience, capture demand, then pressure test PMF."
            />
          </div>
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
  const modeConfig = getDashboardModeConfig('rising');
  const navigate = useNavigate();
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
              <FocusFunnelWidget compact onOpenAIPartner={() => navigate('/focus-funnel')} />
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


export function ProModeView({
  userId,
  streak,
  weeklyProgress,
  tasksCompletedThisWeek,
  completedSessions,
  activeSprints,
  totalCheckIns,
  recommendations,
}: TierDashboardViewProps) {
  const modeConfig = getDashboardModeConfig('pro');
  const navigate = useNavigate();
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
      href: '/insighta/pitch-deck-analyzer',
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
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-xl text-white">
              <Rocket className="h-5 w-5 text-primary" />
              Pro War Room
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary/20 text-primary-foreground">Angels Network</Badge>
              <Badge variant="outline" className="border-white/20 text-white/85">Priority Support</Badge>
            </div>
          </div>
          <CardDescription className="max-w-3xl text-slate-300">
            Premium operating layer for fundraising, investor relationship management, and high-speed execution.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.15fr_0.93fr]">
        <div className="space-y-6">
          <div id="mode-stage">
            <StageProgressPanel
              activeStages={modeConfig.activeStages}
              previewStages={modeConfig.previewStages}
              title="Strategic Stage Map"
              description="Every stage remains live, but the center of gravity now shifts toward fundraising and investor readiness."
            />
          </div>
          <Card id="mode-support" className="border-border/70 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Support and Founder Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="font-medium text-foreground">Group office hours</p>
                <p className="mt-1">Next session in 2 days. Use it for fundraising blockers, investor positioning, or GTM pressure tests.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="font-medium text-foreground">Founders WhatsApp Group</p>
                <p className="mt-1">Fast lane for quick asks, peer signal, and live operator support.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <Button asChild variant="outline" className="justify-between">
                  <Link to="/community">Open founder support layer</Link>
                </Button>
                <Button asChild variant="outline" className="justify-between">
                  <Link to="/community/angels">Open Angels Network</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <ActionRadarCard
            title="Priority Radar"
            description="The Pro dashboard ranks fundraising work so premium access turns into motion, not just access."
            actions={actionItems}
          />
        </div>

        <div className="space-y-6">
          <div id="weekly-mission">
            <WeeklyMissionPanel />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div id="decision-sprint">
              <DecisionSprintCard />
            </div>
            <div id="mode-fundraising">
              <FundraisingActionGrid />
            </div>
          </div>
          <div id="focus-funnel">
            <FocusFunnelWidget compact onOpenAIPartner={() => navigate('/focus-funnel')} />
          </div>
          <div id="your-tasks">
            <TodaysMissionWidget compact />
          </div>
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
          <InsightaActivityCard />
          <CommunityActivityCard />
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <MetricCard label="Execution This Week" value={String(tasksCompletedThisWeek)} caption="Logged operating actions across the platform" icon={CheckCircle2} />
            <MetricCard label="Mission Status" value={`${weeklyProgress.toFixed(0)}%`} caption="Keep one weekly objective visible even at Pro" icon={BarChart3} />
            <MetricCard label="Founder Rhythm" value={streak > 0 ? `${streak} day streak` : 'Needs attention'} caption="Consistency still compounds faster than access" icon={Flame} />
          </div>
        </div>
      </div>
    </div>
  );
}