import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  Eye,
  Flame,
  FolderOpen,
  Handshake,
  Library,
  MessageSquare,
  Phone,
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

interface TierDashboardViewProps {
  founderName: string;
  streak: number;
  tasksCompletedToday: number;
  totalTasksToday: number;
  weeklyProgress: number;
  tasksCompletedThisWeek: number;
  totalTasksThisWeek: number;
  activeSprints: number;
  completedSessions: number;
}

type StageDefinition = {
  id: number;
  title: string;
  summary: string;
  href?: string;
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

export function RookieModeView({ founderName }: TierDashboardViewProps) {
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
            activeStages={[1]}
            previewStages={[4, 5]}
            title="Your Startup Development Cycle"
            description="Stage 1 is where the platform begins guiding you. Later stages stay visible so the upgrade path feels concrete."
          />
        </div>
        <div id="mode-usage" className="space-y-6">
          <QuotaCounterWidgets />
          <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Why this matters</CardTitle>
              <CardDescription>Friendly guidance for founders who just arrived.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Your dashboard only shows one meaningful next move at a time so you don&apos;t burn energy on tools you cannot use yet.</p>
              <p>Once you finish Stage 1, the next tier starts surfacing traction-building workflows and short-term planning.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div id="mode-preview" className="grid gap-4 md:grid-cols-2">
        <UpgradePreviewCard
          eyebrow="Stage 4 Preview"
          title="Build when the signal is real"
          description="Rising unlocks MVP Builder and Tech Stack once your ICP and traction story are ready to support build work."
          cta="See Rising unlocks"
        />
        <UpgradePreviewCard
          eyebrow="Stage 5 Preview"
          title="Launch with more than hope"
          description="GTM Strategist and Directories stay visible now so you understand the path ahead before spending energy there."
          cta="See Stage 5 unlocks"
        />
      </div>
    </div>
  );
}

export function StarterModeView({
  tasksCompletedToday,
  totalTasksToday,
  weeklyProgress,
}: TierDashboardViewProps) {
  const tasksRemainingToday = Math.max(totalTasksToday - tasksCompletedToday, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.85fr]">
        <div className="space-y-6">
          <div id="mode-stage">
            <StageProgressPanel
              activeStages={[1, 2, 3]}
              previewStages={[4, 5]}
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
        </div>
        <div className="space-y-6">
          <div id="mode-usage">
            <QuotaCounterWidgets />
          </div>
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
          <UpgradePreviewCard
            eyebrow="Next Upgrade"
            title="Rising opens the product cockpit"
            description="You&apos;ve mapped the market. Rising gives you build-stage tools, wider investor research, and a denser execution workspace."
            cta="Compare Rising"
          />
        </div>
      </div>
    </div>
  );
}

export function RisingModeView({
  streak,
  tasksCompletedToday,
  totalTasksToday,
  weeklyProgress,
  tasksCompletedThisWeek,
  totalTasksThisWeek,
  activeSprints,
}: TierDashboardViewProps) {
  const navigate = useNavigate();
  const todayCompletion = totalTasksToday > 0 ? Math.round((tasksCompletedToday / totalTasksToday) * 100) : 0;
  const weeklyCompletion = totalTasksThisWeek > 0 ? Math.round((tasksCompletedThisWeek / totalTasksThisWeek) * 100) : 0;

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
          <Card id="mode-stage" className="border-border/70 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Full Stage Overview</CardTitle>
              <CardDescription>Stages no longer force a sequence. Use the order that best matches the startup pressure you are under this week.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {STAGE_DEFINITIONS.map((stage) => (
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
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Tasks Completed This Week" value={String(tasksCompletedThisWeek)} caption="Progress through operational work" icon={CheckCircle2} />
        <MetricCard label="Stage Progress" value={`${weeklyProgress.toFixed(0)}%`} caption="Mission and stage momentum" icon={BarChart3} />
        <MetricCard label="Community Activity" value={streak > 0 ? `${streak} day streak` : 'Start today'} caption="Consistency still matters, even in Rising" icon={Flame} />
      </div>
    </div>
  );
}


export function ProModeView({
  streak,
  weeklyProgress,
  tasksCompletedThisWeek,
  completedSessions,
}: TierDashboardViewProps) {
  const navigate = useNavigate();

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
              activeStages={[1, 2, 3, 4, 5]}
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
              <Button asChild variant="outline" className="w-full justify-between">
                <Link to="/community">Open founder support layer</Link>
              </Button>
            </CardContent>
          </Card>
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
              <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Fundraising Pipeline
                  </CardTitle>
                  <CardDescription>Investor relationship management becomes a first-class part of the cockpit.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                    <p className="font-medium text-foreground">Angels Network</p>
                    <p className="mt-1 text-muted-foreground">Prioritize warm investor paths before sending cold outreach.</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                    <p className="font-medium text-foreground">Insighta dashboard</p>
                    <p className="mt-1 text-muted-foreground">Track VC, accelerator, and deck activity from one investor-focused surface.</p>
                  </div>
                  <Button asChild className="w-full justify-between">
                    <Link to="/community/angels">Open Angels Network</Link>
                  </Button>
                </CardContent>
              </Card>
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
          <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">Advanced Activity Overview</CardTitle>
              <CardDescription>Signals that matter once the founder is fundraising and moving fast.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pitch deck usage</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{completedSessions}</p>
                <p className="text-sm text-muted-foreground">Recent analyzer or deck-related sessions.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Platform engagement</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{tasksCompletedThisWeek}</p>
                <p className="text-sm text-muted-foreground">Execution signals logged this week.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Co-founder activity</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{streak > 0 ? `${streak} day streak` : 'No recent activity'}</p>
                <p className="text-sm text-muted-foreground">Use this as a proxy for platform rhythm and founder responsiveness.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mission status</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{weeklyProgress.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground">A premium dashboard still needs one clear weekly operating objective.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}