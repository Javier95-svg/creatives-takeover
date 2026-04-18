import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Gift, Share2, Trophy, UserPlus } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import HomeWallpaper from '@/components/wallpapers/HomeWallpaper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';

const STEPS = [
  {
    icon: Share2,
    title: 'Share your link',
    description: 'Every account gets a personal referral link. Send it to creators, operators, and friends building their own thing.',
  },
  {
    icon: UserPlus,
    title: 'They sign up',
    description: 'When someone creates a new account through your link, it counts toward your referral rewards.',
  },
  {
    icon: Trophy,
    title: 'Earn rewards',
    description: 'Every 3 successful referrals unlocks a reward — automatically. No forms, no waiting.',
  },
];

const TIER_REWARDS = [
  { tier: 'Rookie', reward: 'Upgrade to Starter', detail: 'Free → paid tier, every 3 referrals.' },
  { tier: 'Starter', reward: 'Upgrade to Rising', detail: 'Unlock operator tools every 3 referrals.' },
  { tier: 'Rising', reward: 'Upgrade to Pro + 50 credits', detail: 'Tier boost plus a fresh stack of credits.' },
  { tier: 'Pro', reward: '+50 credits', detail: 'Already at the top — enjoy 50 bonus credits per 3 referrals.' },
];

const FAQ = [
  {
    q: 'Who can refer people?',
    a: 'Every Creatives Takeover user — Rookie, Starter, Rising, or Pro. Your referral link is ready the moment you sign up.',
  },
  {
    q: 'When does a referral count?',
    a: 'A referral counts as soon as a new account is created using your link. We dedupe by email, so the same person can only count once.',
  },
  {
    q: 'How do I claim my reward?',
    a: 'You don’t have to. Rewards apply automatically the moment your 3rd, 6th, 9th (and so on) referral is verified.',
  },
  {
    q: 'Can I refer myself?',
    a: 'No. Self-referrals and duplicate emails are blocked at the database level.',
  },
];

export default function ReferralProgram() {
  const { user } = useAuth();
  const ctaTarget = user ? '/dashboard/referral' : '/signup';
  const ctaLabel = user ? 'Go to your referral dashboard' : 'Sign up and start referring';

  return (
    <>
      <Helmet>
        <title>Referral Program — Creatives Takeover</title>
        <meta
          name="description"
          content="Share Creatives Takeover with other creators and founders. Every 3 signups through your link unlocks a plan upgrade or bonus credits — automatically."
        />
        <link rel="canonical" href="https://creatives-takeover.com/referral-program" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <HomeWallpaper />
        <div className="relative z-10">
          <Navigation />

          <main className="container mx-auto px-4 sm:px-6 py-16 sm:py-24 max-w-6xl">
            {/* Hero */}
            <section className="text-center max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary">
                <Gift className="h-3.5 w-3.5" />
                Referral Program
              </div>
              <h1 className="font-space-grotesk text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
                Turn your network into your next tier.
              </h1>
              <p className="text-lg text-muted-foreground">
                Every founder you invite moves you closer to a free plan upgrade or extra credits.
                No limits. No expiring points. Just share the link.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button asChild size="lg" className="rounded-full">
                  <Link to={ctaTarget}>
                    {ctaLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full">
                  <Link to="/pricing">See plans</Link>
                </Button>
              </div>
            </section>

            {/* Steps */}
            <section className="mt-20 sm:mt-28">
              <h2 className="font-space-grotesk text-2xl sm:text-3xl font-semibold text-center mb-10">
                How it works
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                {STEPS.map((step, i) => (
                  <Card key={step.title} className="border-border/60 bg-background/70 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <step.icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          Step {i + 1}
                        </span>
                      </div>
                      <CardTitle className="mt-3 text-lg">{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Rewards table */}
            <section className="mt-20 sm:mt-28">
              <h2 className="font-space-grotesk text-2xl sm:text-3xl font-semibold text-center mb-4">
                Rewards by tier
              </h2>
              <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
                Every 3 new accounts created through your link trigger one reward based on your current plan.
              </p>
              <Card className="border-border/60 bg-background/70 backdrop-blur-sm overflow-hidden">
                <div className="divide-y divide-border/60">
                  {TIER_REWARDS.map((row) => (
                    <div
                      key={row.tier}
                      className="grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] gap-3 sm:gap-6 px-6 py-5"
                    >
                      <div className="font-semibold">{row.tier}</div>
                      <div className="text-foreground">{row.reward}</div>
                      <div className="text-sm text-muted-foreground">{row.detail}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            {/* FAQ */}
            <section className="mt-20 sm:mt-28 max-w-3xl mx-auto">
              <h2 className="font-space-grotesk text-2xl sm:text-3xl font-semibold text-center mb-10">
                Questions
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {FAQ.map((item, i) => (
                  <AccordionItem key={item.q} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-base font-medium">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>

            {/* Final CTA */}
            <section className="mt-20 sm:mt-28 text-center">
              <Card className="border-primary/30 bg-primary/5 max-w-3xl mx-auto">
                <CardContent className="py-10 space-y-4">
                  <h3 className="font-space-grotesk text-2xl sm:text-3xl font-semibold">
                    Ready to start referring?
                  </h3>
                  <p className="text-muted-foreground">
                    {user
                      ? 'Your personal referral link is already waiting inside your dashboard.'
                      : 'Create your account — your referral link is generated automatically.'}
                  </p>
                  <Button asChild size="lg" className="rounded-full mt-2">
                    <Link to={ctaTarget}>
                      {ctaLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </section>
          </main>

          <Footer />
        </div>
      </div>
    </>
  );
}
