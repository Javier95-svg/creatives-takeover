import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Coins,
  Compass,
  FlaskConical,
  Layers3,
  Rocket,
  Scale,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';

import Footer from '@/components/Footer';
import Navigation from '@/components/Navigation';
import SEO, { createBreadcrumbSchema, createOrganizationSchema, createWebSiteSchema } from '@/components/SEO';
import FounderAnswerLibraryTeaser from '@/components/seo/FounderAnswerLibraryTeaser';
import StickyMobileCTA from '@/components/StickyMobileCTA';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PLAN_MONTHLY_CREDITS, PLAN_PRICING, TOP_UP_PACKS } from '@/config/pricing';
import { usePageAnalytics } from '@/hooks/usePageAnalytics';
import { trackLandingViewed } from '@/lib/analytics';

const sprintSteps = [
  {
    icon: Compass,
    title: 'Choose the customer',
    copy: 'Define one customer, their current alternative, the urgency trigger, and the decision you need to make.',
    output: 'Customer Decision Brief',
  },
  {
    icon: Users,
    title: 'Find people',
    copy: 'Create a five-conversation plan and an unbiased script. Candidates are never presented as confirmed interviews.',
    output: 'Interview & outreach plan',
  },
  {
    icon: FlaskConical,
    title: 'Add real evidence',
    copy: 'Log interviews for free and import hosted survey responses or verified Demo Studio behavior.',
    output: 'Source-labelled evidence ledger',
  },
  {
    icon: Scale,
    title: 'Make the decision',
    copy: 'See the supporting signals, contradictions, confidence, and one next experiment before committing to a build.',
    output: 'Build / Narrow / Pivot / Stop',
  },
];

const statuses = [
  { label: 'Draft', copy: 'Saved, but required checks are still missing.', className: 'border-border bg-muted/50' },
  { label: 'Ready', copy: 'Useful for the next action, with limitations shown.', className: 'border-info/30 bg-info/10' },
  { label: 'Verified', copy: 'Backed by the required independent evidence.', className: 'border-success/30 bg-success/10' },
  { label: 'Reviewed', copy: 'A substantive expert review has been attached.', className: 'border-primary/30 bg-primary/10' },
];

const plans = [
  { id: 'rookie' as const, name: 'Rookie', strap: 'Start the evidence loop', price: PLAN_PRICING.rookie.monthly },
  { id: 'starter' as const, name: 'Starter', strap: 'Run a validation sprint', price: PLAN_PRICING.starter.monthly },
  { id: 'rising' as const, name: 'Rising', strap: 'Build and launch', price: PLAN_PRICING.rising.monthly },
  { id: 'pro' as const, name: 'Pro', strap: 'Operate with more capacity', price: PLAN_PRICING.pro.monthly },
];

const faqs = [
  {
    question: 'What outcome does Founders Compass promise?',
    answer: 'A clearer, evidence-backed next decision and the artifacts needed to act on it. We do not promise demand, product-market fit, customers, funding, or a successful company.',
  },
  {
    question: 'Why are five and twenty-five signals different?',
    answer: 'Five independent weighted signals can reveal a directional pattern. Twenty-five can qualify the report as decision-grade. A directional result is designed to guide the next experiment, not justify a large build.',
  },
  {
    question: 'What uses credits?',
    answer: 'Manual evidence, tasks, logs, sharing, and deterministic scoring are free. AI research, discovery searches, transcript synthesis, new generative reports, demos, MVP generation, GTM research, pitch analysis, and substantive expert work use credits.',
  },
  {
    question: 'Can I use Lovable, Bolt, v0, or my own developer?',
    answer: 'Yes. A decision-grade Build result can be exported as an evidence build brief for another builder or developer. MVP Builder is an option, not a lock-in requirement.',
  },
  {
    question: 'Is fundraising required to complete the cycle?',
    answer: 'No. Capital is optional. Bootstrapped founders can continue through validation, build, launch, and traction without an incomplete-journey penalty.',
  },
];

export default function Index() {
  const tracked = useRef(false);
  usePageAnalytics('/', 'Founders Compass — Creatives Takeover');

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackLandingViewed({ page: '/', positioning: 'validation_sprint' });
  }, []);

  const structuredData = [
    createOrganizationSchema(),
    createWebSiteSchema(),
    createBreadcrumbSchema([{ name: 'Home', url: '/' }]),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Stop guessing what to build | Founders Compass"
        description="Turn real customer evidence into a clear Build, Narrow, Pivot, Stop, or keep-testing decision—then carry that evidence into your MVP."
        keywords="startup validation sprint, customer evidence, build or pivot decision, first-time founder, founders compass"
        url="/"
        image="/og-image.png"
        structuredData={structuredData}
      />
      <Navigation />
      <main>
        <section className="relative overflow-hidden px-4 pb-24 pt-32 sm:px-6 lg:pb-32 lg:pt-40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.18),transparent_46%)]" />
          <div className="relative mx-auto max-w-5xl text-center">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 px-3 py-1 text-primary">
              Creatives Takeover · Founders Compass
            </Badge>
            <h1 className="mx-auto mt-7 max-w-4xl font-space-grotesk text-5xl font-semibold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
              Stop guessing what to build.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Turn real customer evidence into a clear Build, Narrow, Pivot, Stop, or keep-testing decision—then carry that evidence into your MVP.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-h-12 px-7 text-base">
                <Link to="/validation-sprint">
                  Start my validation sprint <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="link" size="lg" className="text-muted-foreground">
                <Link to="/traction-engine">I already have a live product</Link>
              </Button>
            </div>
            <div className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
              {[
                'First Customer Decision Brief is free',
                'Manual evidence entry uses no credits',
                'No success or funding promises',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/35 px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">The Validation Sprint</p>
              <h2 className="mt-3 font-space-grotesk text-3xl font-semibold tracking-tight sm:text-4xl">
                Four steps from assumption to next decision.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                The workflow stays open when the evidence says “not yet.” It moves into building only when a Build decision reaches the required evidence grade.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {sprintSteps.map(({ icon: Icon, title, copy, output }, index) => (
                <Card key={title} className="border-border/60 bg-background/70">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-semibold text-muted-foreground">0{index + 1}</span>
                    </div>
                    <CardTitle className="pt-3 text-lg">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-muted-foreground">{copy}</p>
                    <p className="mt-5 border-t border-border/50 pt-4 text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{output}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Outcome truth</p>
              <h2 className="mt-3 font-space-grotesk text-3xl font-semibold tracking-tight sm:text-4xl">
                A saved artifact is not the same as a completed outcome.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Founders Compass shows what passed, what is still assumed, where the evidence came from, and the single next action. Verified remains visibly different from ready.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {statuses.map((status) => (
                <div key={status.label} className={`rounded-2xl border p-5 ${status.className}`}>
                  <div className="flex items-center gap-2">
                    {status.label === 'Verified' ? <ShieldCheck className="h-5 w-5 text-success" /> : <Layers3 className="h-5 w-5 text-primary" />}
                    <p className="font-semibold">{status.label}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{status.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/35 px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Credit-based capacity</p>
              <h2 className="mt-3 font-space-grotesk text-3xl font-semibold tracking-tight sm:text-4xl">
                Pay for AI work, not for entering your own evidence.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                Plans determine monthly AI capacity. Manual logs, deterministic scorecards, sharing, and the evidence loop stay available without a per-click toll.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => (
                <Card key={plan.id} className={plan.id === 'starter' ? 'border-primary/40 bg-primary/[0.05]' : 'border-border/60'}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{plan.strap}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-semibold">${plan.price}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                    <p className="mt-3 flex items-center gap-2 text-sm"><Coins className="h-4 w-4 text-primary" /> {PLAN_MONTHLY_CREDITS[plan.id]} monthly credits</p>
                    <Button asChild variant={plan.id === 'starter' ? 'default' : 'outline'} className="mt-6 w-full">
                      <Link to={plan.id === 'rookie' ? '/validation-sprint' : '/pricing'}>
                        {plan.id === 'rookie' ? 'Start free' : 'View plan'}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Persistent top-ups:</span>
              {TOP_UP_PACKS.map((pack) => (
                <Badge key={pack.id} variant="outline">
                  {pack.credits} credits / ${pack.priceUsd} · ${(pack.priceUsd / pack.credits).toFixed(2)} each
                </Badge>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Evidence-to-Execution Cycle</p>
              <h2 className="mt-3 font-space-grotesk text-3xl font-semibold tracking-tight sm:text-4xl">
                Keep moving after the validation decision.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { icon: Rocket, title: 'Build & Launch', copy: 'Turn decision-grade evidence into a constrained MVP brief, a working product, and one measurable acquisition play.', href: '/mvp-builder', cta: 'Explore Build & Launch' },
                { icon: TrendingUp, title: 'Traction', copy: 'Run source-labelled weekly experiments and decide what to double down on, iterate, or kill.', href: '/traction-engine', cta: 'Open Traction' },
                { icon: Scale, title: 'Capital — optional', copy: 'Use fundraising preparation after traction when outside capital fits your strategy. Bootstrapping never blocks progress.', href: '/pitch-deck-analyzer', cta: 'Explore Capital' },
              ].map(({ icon: Icon, title, copy, href, cta }) => (
                <Card key={title} className="border-border/60">
                  <CardContent className="p-6">
                    <Icon className="h-6 w-6 text-primary" />
                    <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
                    <Button asChild variant="link" className="mt-4 h-auto p-0">
                      <Link to={href}>{cta} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button asChild variant="outline">
                <Link to="/bizmap-ai">See the detailed Startup Development Cycle</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border/60 bg-card/35 px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="font-space-grotesk text-3xl font-semibold tracking-tight sm:text-4xl">Clear limits. Fewer surprises.</h2>
            </div>
            <div className="mt-10 space-y-3">
              {faqs.map((faq) => (
                <details key={faq.question} className="group rounded-xl border border-border/60 bg-background/70 p-5">
                  <summary className="cursor-pointer list-none font-semibold">{faq.question}</summary>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
            <FounderAnswerLibraryTeaser compact />
          </div>
        </section>
      </main>
      <Footer />
      <StickyMobileCTA />
    </div>
  );
}
