/**
 * First-session empty states per dashboard mode.
 *
 * These render when a user has zero meaningful activity:
 *   totalCheckIns === 0 && completedSessions === 0 && !icpSummary
 *
 * Each empty state answers: "Where am I? What do I do next?"
 * with a single CTA — no clutter, no streak, no quota pressure.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Rocket, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Shared ────────────────────────────────────────────────────────────────

function EmptyStateShell({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref,
  supportText,
  supportHref,
  supportLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  supportText?: string;
  supportHref?: string;
  supportLabel?: string;
}) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
      <CardHeader className="space-y-3">
        <Badge variant="outline" className="w-fit">{eyebrow}</Badge>
        <CardTitle className="text-2xl sm:text-3xl">{title}</CardTitle>
        <CardDescription className="max-w-2xl text-sm sm:text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild size="lg" className="shrink-0">
          <Link to={ctaHref}>
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        {supportText && supportHref && supportLabel && (
          <p className="text-sm text-muted-foreground">
            {supportText}{' '}
            <Link to={supportHref} className="text-primary underline underline-offset-4 hover:text-primary/80">
              {supportLabel}
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Rookie ────────────────────────────────────────────────────────────────

/**
 * Shown to a brand-new Rookie user who has done nothing yet.
 * Single job: get them into ICP Builder.
 * No streak, no quota widgets, no momentum — just one key.
 */
export function RookieEmptyState({ founderName }: { founderName: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <EmptyStateShell
        eyebrow="Stage 1 · Identity"
        title={`Welcome in, ${founderName}.`}
        description="Building a company is confusing — so we start with one thing: knowing who you're building for. Nail your ICP and the rest of the platform starts making sense."
        ctaLabel="Start with ICP Builder"
        ctaHref="/icp-builder"
        supportText="Rather talk to a human first?"
        supportHref="/mentorship"
        supportLabel="Book your included mentor call"
      />

      {/* Minimal stage map — shows the path, creates no pressure */}
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-4 w-4 text-primary" />
            Your startup development path
          </CardTitle>
          <CardDescription>You'll unlock each stage as you move forward. Skip the rest for now.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            {[
              { stage: 1, label: 'Define your ICP', active: true },
              { stage: 2, label: 'Launch a Waitlist', unlock: 'Starter' },
              { stage: 3, label: 'Pressure Test PMF', unlock: 'Starter' },
              { stage: 4, label: 'Build Your Stack', unlock: 'Rising' },
              { stage: 5, label: 'Go To Market', unlock: 'Rising' },
            ].map(({ stage, label, active, unlock }) => (
              <li key={stage} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  aria-label={`Stage ${stage}`}
                >
                  {stage}
                </span>
                <span className={active ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
                  {label}
                </span>
                {unlock && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    Unlocks with {unlock}
                  </Badge>
                )}
                {active && (
                  <Badge className="ml-auto text-xs">Active</Badge>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Starter ───────────────────────────────────────────────────────────────

/**
 * Shown to a Starter user who upgraded but has no ICP or check-in yet.
 * Gets them to Stage 1 first — everything else unlocks sequentially.
 */
export function StarterEmptyState({ founderName }: { founderName: string }) {
  return (
    <div className="space-y-6">
      <EmptyStateShell
        eyebrow="Starter · Stages 1–3"
        title={`Let's get Stage 1 locked first, ${founderName}.`}
        description="Starter gives you three active stages, but the order matters. Nail your ICP before opening Waitlist Maker or PMF Lab — every later move builds on customer clarity."
        ctaLabel="Open ICP Builder"
        ctaHref="/icp-builder"
        supportText="Already have an ICP draft?"
        supportHref="/waitlist"
        supportLabel="Jump to Waitlist Maker"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { stage: 1, label: 'Define your ICP', description: 'Who are you building for?', active: true, href: '/icp-builder' },
          { stage: 2, label: 'Launch a Waitlist', description: 'Capture early demand signals.', href: '/waitlist' },
          { stage: 3, label: 'Pressure Test PMF', description: 'Run real validation loops.', href: '/pmf-lab' },
        ].map(({ stage, label, description, active, href }) => (
          <Link
            key={stage}
            to={active ? href : '#'}
            className={`rounded-xl border p-4 transition-colors ${
              active
                ? 'border-primary/30 bg-primary/8 hover:border-primary/50'
                : 'border-border/60 bg-background/70 opacity-60 pointer-events-none'
            }`}
            aria-disabled={!active}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Stage {stage}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            {active && (
              <p className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
                Start here <ArrowRight className="h-3 w-3" />
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Rising ────────────────────────────────────────────────────────────────

/**
 * Shown once to a Rising user who just upgraded.
 * Explains the cockpit shift in 3 bullets. Dismissable (managed by caller via localStorage).
 */
export function RisingOnboardingStrip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/8 via-card to-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Badge variant="outline" className="w-fit">Rising · Full Cockpit</Badge>
            <CardTitle className="text-lg">Welcome to the cockpit. Here's what changed.</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground"
            onClick={onDismiss}
            aria-label="Dismiss Rising onboarding"
          >
            Got it
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">All 5 stages run in parallel.</strong> No forced sequence — work the stage that matches your current pressure.</span>
          </li>
          <li className="flex items-start gap-2">
            <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">Full BizMap tool suite unlocked.</strong> MVP Builder, Tech Stack, GTM Strategist, and Directories are all live.</span>
          </li>
          <li className="flex items-start gap-2">
            <Compass className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span><strong className="text-foreground">Deeper investor research.</strong> 10 VC and 10 accelerator profile views per month — use them intentionally.</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Pro ───────────────────────────────────────────────────────────────────

/**
 * Shown inside the Investor Priorities card when Pro user has no investor activity yet.
 * Not a full empty state — the rest of the War Room stays fully functional.
 */
export function ProInvestorMotionEmpty() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/60 bg-background/70 p-4">
        <p className="text-sm font-semibold text-foreground">Pro is built for fundraising motion.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Start by pressure-testing your pitch before reaching out to any investor.
        </p>
        <Button asChild size="sm" variant="ghost" className="mt-3 px-0 text-primary hover:bg-transparent">
          <Link to="/pitch-deck-analyzer">
            Analyze your pitch deck
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <div className="rounded-xl border border-border/60 bg-background/70 p-4">
        <p className="text-sm font-semibold text-foreground">Then open the Angels Network.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Warm investor proximity is the highest-leverage difference in Pro.
        </p>
        <Button asChild size="sm" variant="ghost" className="mt-3 px-0 text-primary hover:bg-transparent">
          <Link to="/investors">
            Open Angels Network
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
