import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Database,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  GitBranch,
  Github,
  Globe,
  LayoutDashboard,
  Mail,
  Rocket,
  ShoppingCart,
  Target,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import HomeWallpaper from '@/components/wallpapers/HomeWallpaper';
import { ScrollReveal, RevealGroup } from '@/components/animations/ScrollReveal';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePageAnalytics } from '@/hooks/usePageAnalytics';
import SEO from '@/components/SEO';
import ctLogoMark from '@/assets/ct-logo-polished-borders.webp';
import { startSocialOAuth } from '@/lib/socialAuth';
import { supabase } from '@/integrations/supabase/client';

// ─── Copy & data ──────────────────────────────────────────────────────────────

const TYPING_PROMPTS = [
  'Build a landing page for a SaaS analytics tool',
  'Build a habit-tracking app with streaks and reminders',
  "Build a dashboard to track my startup's weekly metrics",
  'Build an e-commerce store for handmade ceramics',
  'Build a waitlist page with email capture and a referral loop',
  'Build an internal admin panel for my support team',
  'Build a booking app for a yoga studio',
];

const CHIPS = [
  { label: 'SaaS landing page', intent: 'A landing page for a SaaS analytics tool', dot: '#3B82F6' },
  { label: 'Mobile app', intent: 'A habit-tracking mobile app with streaks', dot: '#EF4444' },
  { label: 'Dashboard', intent: 'A dashboard to track startup metrics', dot: '#10B981' },
  { label: 'Online store', intent: 'An e-commerce store for handmade goods', dot: '#3B82F6' },
];

const SHOWCASE_SITES = [
  {
    name: 'IronLog',
    image: '/mvp-builder-showcase/ironlog.webp',
    url: 'https://ironlog.creatives-takeover.com/',
  },
  {
    name: 'LinguaExpat',
    image: '/mvp-builder-showcase/linguaexpat.webp',
    url: 'https://linguaexpact.creatives-takeover.com/',
  },
  {
    name: 'SentryNest',
    image: '/mvp-builder-showcase/sentrynest.webp',
    url: 'https://sentrynest.creatives-takeover.com/',
  },
  {
    name: 'ShiftCode',
    image: '/mvp-builder-showcase/shiftcode.webp',
    url: 'https://shiftcode.creatives-takeover.com/',
  },
  {
    name: 'Sora Botanicals',
    image: '/mvp-builder-showcase/sora-botanicals.webp',
    url: 'https://sora-botanicals.creatives-takeover.com/',
  },
  {
    name: 'Steeped',
    image: '/mvp-builder-showcase/steeped.webp',
    url: 'https://steeped.creatives-takeover.com/',
  },
];

const BUILD_CARDS = [
  { tag: 'Sites', preview: 'site', Icon: Globe, title: 'Landing pages', body: 'High-converting marketing pages with a hero, sections, and a CTA. On-brand from the first draft.' },
  { tag: 'Apps', preview: 'app', Icon: Zap, title: 'Web & mobile apps', body: 'Auth, data, and real interactions across habit trackers, CRMs, booking flows, and note apps. Working, not wireframes.' },
  { tag: 'Data', preview: 'dashboard', Icon: LayoutDashboard, title: 'Dashboards', body: 'Track your metrics, your users, or your team. Charts, tables, and filters wired to live data.' },
  { tag: 'E-commerce', preview: 'commerce', Icon: ShoppingCart, title: 'Online stores', body: 'Product grids, carts, and checkout for your first 100 orders. Ship the store before you over-think the catalogue.' },
  { tag: 'SaaS', preview: 'saas', Icon: Code2, title: 'SaaS MVPs', body: 'Pricing, onboarding, and a core feature loop. The smallest real version of the product you keep talking about.' },
  { tag: 'Internal', preview: 'internal', Icon: Wrench, title: 'Internal tools', body: 'Admin panels, ops dashboards, and team workflows. Stop running the company out of a spreadsheet.' },
];

const STAGES = [
  { num: '01', key: 'identity', name: 'Identity', tool: 'ICP Builder', dot: '#3B82F6', youAreHere: false, description: "Before doing anything, get clear on the basics. Define your problem, your customer, and what makes your solution different. You'll come out with a sharp ICP and a clear direction." },
  { num: '02', key: 'prototyping', name: 'Prototyping', tool: 'Demo Studio', dot: '#06B6D4', youAreHere: false, description: "Turn your idea into a simple landing page that captures early interest. It should explain what you're building, who it's for, and why it matters. The goal is to collect signups and confirm demand before writing a single line of code." },
  { num: '03', key: 'validation', name: 'Validation', tool: 'PMF Lab', dot: '#EF4444', youAreHere: false, description: 'Talk to your potential customers directly and gather honest feedback. Track signals like interview insights and waitlist signups to confirm real demand. If validation is strong, move forward. If not, iterate based on what your customers tell you.' },
  { num: '04', key: 'building', name: 'Building', tool: 'MVP Builder', dot: '#10B981', youAreHere: true, description: "With validation confirmed, it's time to build. Focus only on the core features that deliver your main value, nothing more. Use our MVP Builder and Tech Stack tools, tap into our mentor network, and get your product out fast so you can learn and improve as you grow." },
  { num: '05', key: 'launch', name: 'Launch', tool: 'GTM Strategist + Directories', dot: '#F59E0B', youAreHere: false, description: "Time to go public. Share your product where your audience already hangs out, from Product Hunt and LinkedIn to Reddit and beyond. Submit to directories, build your brand, and start generating the attention and early users that create momentum." },
  { num: '06', key: 'traction', name: 'Traction', tool: 'Traction Engine', dot: '#8B5CF6', youAreHere: false, description: 'Traction is where early users become a real business. Find the acquisition channel that fits your product, track retention in the first 30 days, and run weekly plays with our GTM Strategist and Traction Engine. Hit the score threshold three weeks in a row and you have a fundable story.' },
  { num: '07', key: 'fundraising', name: 'Fundraising', tool: 'VC Search + Angels', dot: '#EC4899', youAreHere: false, description: "With a working MVP, proven demand, and early customers, you're ready to raise. Fundraising gives you the resources to scale faster, grow your team, and keep improving the product. It also adds credibility that attracts more investment and keeps the momentum going." },
];

const HERO_PROOF_POINTS = [
  { label: 'ICP + PMF context', Icon: Database },
  { label: 'Evidence-scoped MVP', Icon: Target },
  { label: 'Real code you control', Icon: Code2 },
];

const EVIDENCE_SOURCES = [
  {
    name: 'ICP Builder',
    label: 'Who it is for',
    details: ['Primary customer', 'Core pain', 'Buying trigger'],
    preview: 'Defines the customer, urgent problem, and moment they are ready to act.',
    briefLabel: 'Customer evidence imported',
    Icon: Target,
    accent: 'text-info',
    surface: 'border-info/25 bg-info/[0.06]',
  },
  {
    name: 'Demo Studio',
    label: 'What was tested',
    details: ['Product promise', 'Positioning story', 'Proof state'],
    preview: 'Carries the promise customers saw and the message that earned a signal.',
    briefLabel: 'Tested promise imported',
    Icon: Globe,
    accent: 'text-success',
    surface: 'border-success/25 bg-success/[0.06]',
  },
  {
    name: 'PMF Lab',
    label: 'What evidence says',
    details: ['Must-have features', 'Objections', 'Buying signals'],
    preview: 'Turns qualified conversations and demand signals into product constraints.',
    briefLabel: 'Validation evidence imported',
    Icon: FlaskConical,
    accent: 'text-destructive',
    surface: 'border-destructive/25 bg-destructive/[0.06]',
  },
];

const FOCUS_STEPS = [
  {
    num: '01', title: 'Scope', body: 'One customer, one job, and one measurable outcome.',
    detail: 'No more than 3 essential features in the evidence-backed first scope, all tied to the customer outcome.',
    outcome: 'A testable product boundary', Icon: Target,
  },
  {
    num: '02', title: 'Build', body: 'A working React product with a live, interactive preview.',
    detail: 'Generate the core workflow, inspect it immediately, and refine the experience while it is running.',
    outcome: 'A working customer workflow', Icon: Code2,
  },
  {
    num: '03', title: 'Control', body: 'Review changes, restore versions, use GitHub, or export the code.',
    detail: 'Keep a visible change history and take the product with you through GitHub or a downloadable ZIP.',
    outcome: 'Code and changes you control', Icon: GitBranch,
  },
  {
    num: '04', title: 'Ship', body: 'Publish to a hosted address or connect your own domain.',
    detail: 'Put the focused version in front of customers on a live URL so the next decision comes from evidence.',
    outcome: 'A live customer test', Icon: Rocket,
  },
];

const useViewportAnimation = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === 'undefined') {
      setIsActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsActive(Boolean(entry?.isIntersecting)),
      { rootMargin: '200px 0px', threshold: 0.01 },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return { hostRef, isActive };
};

// ─── Floating particles (deterministic so they're stable across renders) ─────

const PARTICLE_COLORS = ['#3B82F6', '#EF4444', '#10B981'];
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  left: `${6 + ((i * 17 + 11) % 88)}%`,
  top: `${4 + ((i * 13 + 7) % 88)}%`,
  size: 4 + (i % 4) * 1.75,
  color: PARTICLE_COLORS[i % 3],
  opacity: 0.28 + (i % 5) * 0.055,
  duration: `${5 + (i % 6)}s`,
  delay: `-${(i * 0.7) % 4}s`,
}));

// ─── Typing animation hook ────────────────────────────────────────────────────

function useTypingAnimation(prompts: string[], paused: boolean): string {
  const [displayText, setDisplayText] = useState('');
  const pausedRef = useRef(paused);
  const stateRef = useRef({ ci: 0, pi: 0, del: false });

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (pausedRef.current) {
        timerId = setTimeout(tick, 300);
        return;
      }
      const s = stateRef.current;
      const full = prompts[s.pi % prompts.length];
      if (!s.del) {
        s.ci++;
        setDisplayText(full.slice(0, s.ci));
        if (s.ci >= full.length) {
          s.del = true;
          timerId = setTimeout(tick, 1800);
        } else {
          timerId = setTimeout(tick, 50 + Math.random() * 35);
        }
      } else {
        s.ci--;
        setDisplayText(full.slice(0, s.ci));
        if (s.ci <= 0) {
          s.del = false;
          s.pi++;
          timerId = setTimeout(tick, 350);
        } else {
          timerId = setTimeout(tick, 22);
        }
      }
    };

    timerId = setTimeout(tick, 700);
    return () => clearTimeout(timerId);
  }, [prompts]);

  return displayText;
}

// ─── Google icon (Lucide doesn't have one) ────────────────────────────────────

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" aria-hidden="true">
    <path fill="#4285F4" d="M22.5 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.22-4.74 3.22-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.3 9.14 4.75 12 4.75z" />
  </svg>
);

// ─── Sign-up modal ────────────────────────────────────────────────────────────

interface SignupModalProps { open: boolean; intent: string; onClose: () => void; }

const SignupModal = ({ open, intent, onClose }: SignupModalProps) => {
  const [loading, setLoading] = useState<'google' | 'github' | null>(null);

  // After auth, new users go through the onboarding quiz then land on the MVP Builder.
  // The 'oauth_return_url' key is read by the auth callback to set the post-onboarding destination.
  const POST_AUTH_DEST = '/mvp-builder';

  const handleGoogle = async () => {
    localStorage.setItem('oauth_return_url', POST_AUTH_DEST);
    setLoading('google');
    await startSocialOAuth({ provider: 'google', intent: 'signup' });
    setLoading(null);
  };

  const handleGitHub = async () => {
    localStorage.setItem('oauth_return_url', POST_AUTH_DEST);
    setLoading('github');
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[420px] gap-0 rounded-2.5xl p-0 [&>button]:hidden">
        <div className="relative rounded-2.5xl border border-border bg-card p-7 shadow-[0_50px_110px_-30px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            <img src={ctLogoMark} alt="Creatives Takeover" className="mb-4 h-14 w-14 rounded-2xl object-cover shadow-lg" />

            <DialogTitle className="font-space-grotesk text-2xl font-bold tracking-tight">
              Ready to build?{' '}
              <span className="bg-gradient-rgb bg-clip-text text-transparent">Let&rsquo;s go.</span>
            </DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your free account. It takes about ten seconds.
            </p>

            {/* intent echo */}
            <div className="mt-4 flex w-full items-start gap-3 rounded-xl border bg-muted/40 px-3.5 py-3 text-left">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-mono text-caption uppercase tracking-[0.16em] text-muted-foreground">
                  You&rsquo;re about to build
                </p>
                <p className="mt-0.5 text-xs font-semibold text-foreground">
                  {intent || 'A brand-new product'}
                </p>
              </div>
            </div>

            {/* 3 CTAs */}
            <div className="mt-5 flex w-full flex-col gap-3">
              {/* 1. Email */}
              <Button asChild size="lg" className="h-12 w-full gap-2.5 text-sm font-bold">
                <Link to={`/signup?return=${encodeURIComponent(POST_AUTH_DEST)}`}>
                  <Mail className="h-[17px] w-[17px]" aria-hidden="true" />
                  Sign up with email
                </Link>
              </Button>

              {/* 2. Google */}
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full gap-2.5 text-sm font-semibold"
                onClick={handleGoogle}
                disabled={loading !== null}
              >
                {loading === 'google' ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : <GoogleIcon />}
                Continue with Google
              </Button>

              {/* 3. GitHub */}
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full gap-2.5 text-sm font-semibold"
                onClick={handleGitHub}
                disabled={loading !== null}
              >
                {loading === 'github' ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : <Github className="h-[17px] w-[17px]" aria-hidden="true" />}
                Continue with GitHub
              </Button>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-muted-foreground/70">
              By continuing, you agree to the{' '}
              <Link to="/terms" className="underline underline-offset-2 hover:text-muted-foreground">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-muted-foreground">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Hero ─────────────────────────────────────────────────────────────────────

interface HeroProps { onOpen: (intent?: string) => void; }

const BuildHero = ({ onOpen }: HeroProps) => {
  const [userInput, setUserInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);
  const animatedText = useTypingAnimation(TYPING_PROMPTS, isEditing || userInput.length > 0);

  const getCurrentIntent = () => {
    const typed = editRef.current?.textContent?.trim();
    return typed || animatedText || TYPING_PROMPTS[0];
  };

  return (
    <>
      {/* keyframes */}
      <style>{`
        @keyframes ct-blink { 0%,49%{opacity:1}50%,100%{opacity:0} }
        .ct-caret { display:inline-block;width:2px;height:1.1em;vertical-align:-2px;border-radius:2px;margin-left:1px;animation:ct-blink 1.1s steps(1) infinite; }
        @keyframes ct-floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
      `}</style>

      <section className="relative overflow-hidden pb-20 pt-32 text-center lg:pb-28 lg:pt-40">
        {/* ambient glows + floating particles */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.22),transparent_62%)] blur-3xl" />
          <div className="absolute left-[4%] top-[120px] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(239,68,68,0.13),transparent_64%)] blur-3xl" />
          <div className="absolute right-[4%] top-[160px] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.13),transparent_64%)] blur-3xl" />
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                background: p.color,
                opacity: p.opacity,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                animation: `ct-floaty ${p.duration} ease-in-out ${p.delay} infinite`,
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-[920px] px-4 sm:px-6">
          {/* Headline */}
          <h1 className="font-space-grotesk text-[clamp(48px,7.4vw,96px)] font-bold leading-[0.96] tracking-[-0.045em] text-balance">
            Stop planning.<br />
            <span className="bg-gradient-rgb bg-clip-text text-transparent">Start building.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-[620px] text-[clamp(17px,1.5vw,20px)] leading-relaxed text-muted-foreground text-balance">
            If you can describe it, you can ship it.
          </p>

          {/* Chat input */}
          <div className="mx-auto mt-10 max-w-[720px]">
            <div
              className={cn(
                'group relative cursor-text rounded-2xl border bg-card/40 p-5 pb-3.5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300',
                'hover:border-info/30 hover:shadow-[0_36px_90px_-40px_rgba(0,0,0,0.7),0_0_60px_-20px_rgba(59,130,246,0.2)]',
                'focus-within:border-info/40 focus-within:shadow-[0_36px_90px_-40px_rgba(0,0,0,0.7),0_0_60px_-20px_rgba(59,130,246,0.25)]',
              )}
              onClick={() => editRef.current?.focus()}
            >
              {/* editable layer */}
              <div className="relative min-h-[54px]">
                <div
                  ref={editRef}
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  aria-label="Describe what you want to build"
                  spellCheck={false}
                  onFocus={() => setIsEditing(true)}
                  onInput={() => setUserInput(editRef.current?.textContent || '')}
                  onBlur={() => {
                    if (!editRef.current?.textContent?.trim()) {
                      setUserInput('');
                      setIsEditing(false);
                    }
                  }}
                  className="relative z-10 min-h-[54px] text-base leading-relaxed text-foreground outline-none"
                  style={{ caretColor: 'hsl(var(--primary))' }}
                />
                {/* animated placeholder */}
                {!userInput && (
                  <div className="pointer-events-none absolute inset-0 z-0 flex items-start pt-0.5" aria-hidden="true">
                    <span className="text-base leading-relaxed text-muted-foreground/55">
                      {animatedText}
                      {!isEditing && (
                        <span
                          className="ct-caret"
                          style={{ background: 'hsl(var(--primary))' }}
                        />
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* bottom bar */}
              <div className="mt-2 flex items-center gap-2.5 border-t border-border/60 pt-3">
                <span className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                  Build
                </span>
                <span className="flex-1" />
                <Button
                  size="sm"
                  className="h-9 gap-2 rounded-xl bg-gradient-rgb px-4 text-sm font-bold text-white shadow-[0_8px_22px_-8px_rgba(59,130,246,0.5)] transition-all hover:scale-[1.02] hover:brightness-105"
                  onClick={() => onOpen(getCurrentIntent())}
                >
                  Build now
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* suggestion chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="font-mono text-label uppercase tracking-[0.16em] text-muted-foreground/60">
                Try
              </span>
              {CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => onOpen(chip.intent)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-info/40 hover:text-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: chip.dot }} />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* honest product proof */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5" aria-label="MVP Builder capabilities">
            {HERO_PROOF_POINTS.map(({ label, Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/40 px-3.5 py-2 text-xs font-semibold text-muted-foreground backdrop-blur-sm"
              >
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

// ─── MVP showcase carousel ───────────────────────────────────────────────────

const BuildHowItWorks = () => {
  const loopedSites = [...SHOWCASE_SITES, ...SHOWCASE_SITES];
  const { hostRef, isActive } = useViewportAnimation();

  return (
    <section className="pb-20 pt-8 lg:pb-24">
      <style>
        {`
          @keyframes mvp-showcase-scroll {
            from { transform: translateX(0); }
            to { transform: translateX(calc(-50% - 12px)); }
          }
          .mvp-showcase-track {
            animation: mvp-showcase-scroll 58s linear infinite;
          }
          .mvp-showcase-track:hover {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            .mvp-showcase-track {
              animation: none;
            }
          }
        `}
      </style>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="mx-auto mb-10 max-w-[760px] text-center">
            <p className="font-mono text-label uppercase tracking-[0.22em] text-muted-foreground">MVP Builder examples</p>
            <h2 className="mt-4 font-space-grotesk text-[clamp(32px,3.8vw,46px)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
              <span className="bg-gradient-rgb bg-clip-text text-transparent">From concept to final product.</span>
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div ref={hostRef} className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/35 py-5 shadow-[0_30px_90px_-55px_rgba(59,130,246,0.65)] backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background via-background/70 to-transparent sm:w-28" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background via-background/70 to-transparent sm:w-28" />

            <div
              className={cn("mvp-showcase-track flex w-max gap-6 px-5", isActive && "will-change-transform")}
              style={{ animationPlayState: isActive ? 'running' : 'paused' }}
            >
              {loopedSites.map((site, index) => {
                const duplicate = index >= SHOWCASE_SITES.length;
                return (
                  <a
                    key={`${site.name}-${index}`}
                    href={site.url}
                    target="_blank"
                    rel="noreferrer"
                    tabIndex={duplicate ? -1 : undefined}
                    aria-hidden={duplicate || undefined}
                    aria-label={`Open ${site.name} in a new tab`}
                    className="group block w-[min(82vw,520px)] shrink-0 overflow-hidden rounded-xl border border-border/70 bg-background/80 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.75)] outline-none transition duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_30px_70px_-35px_rgba(59,130,246,0.75)] focus-visible:ring-2 focus-visible:ring-primary sm:w-[560px] lg:w-[620px]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted/30">
                      <img
                        src={site.image}
                        alt={`${site.name} landing page screenshot`}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                        width={1600}
                        height={1000}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pb-4 pt-12 text-white opacity-95">
                        <span className="font-space-grotesk text-lg font-bold tracking-[-0.02em]">{site.name}</span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition group-hover:bg-white/20">
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

// ─── What you can build ───────────────────────────────────────────────────────

const BuildCardPreview = ({ preview }: { preview: string }) => {
  const browserDots = (
    <span className="flex items-center gap-1">
      <i className="h-1.5 w-1.5 rounded-full bg-destructive/70" />
      <i className="h-1.5 w-1.5 rounded-full bg-warning/70" />
      <i className="h-1.5 w-1.5 rounded-full bg-success/70" />
    </span>
  );

  if (preview === 'app') {
    return (
      <div className="relative flex h-[132px] w-full items-center justify-center" aria-hidden="true">
        <div className="absolute left-[18%] top-8 h-9 w-16 rounded-lg border border-primary/20 bg-primary/[0.08] transition-transform duration-500 group-hover:-translate-x-1 motion-reduce:transition-none" />
        <div className="absolute right-[17%] top-16 h-7 w-14 rounded-lg border border-success/20 bg-success/[0.08] transition-transform duration-500 group-hover:translate-x-1 motion-reduce:transition-none" />
        <div className="relative h-[126px] w-[66px] rounded-[17px] border-2 border-border/80 bg-background/90 p-1.5 shadow-xl transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-1 motion-reduce:transform-none motion-reduce:transition-none">
          <div className="mx-auto mb-2 h-1 w-5 rounded-full bg-border" />
          <div className="rounded-lg bg-primary/15 p-2">
            <div className="h-2 w-8 rounded-full bg-primary/70" />
            <div className="mt-1 h-1 w-10 rounded-full bg-primary/20" />
          </div>
          <div className="mt-2 space-y-1.5">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-1.5 rounded-md border border-border/50 p-1">
                <span className={cn('h-2 w-2 rounded-full', item === 0 ? 'bg-success/70' : 'bg-muted')} />
                <span className="h-1 flex-1 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (preview === 'dashboard') {
    return (
      <div className="w-[calc(100%_-_36px)] max-w-[238px] overflow-hidden rounded-xl border border-border/60 bg-background/90 shadow-lg" aria-hidden="true">
        <div className="flex h-5 items-center justify-between border-b border-border/50 px-2.5">{browserDots}<span className="h-1 w-10 rounded-full bg-muted" /></div>
        <div className="flex h-[105px]">
          <div className="w-9 border-r border-border/50 bg-muted/20 p-2"><div className="h-3 w-3 rounded bg-primary/60" /><div className="mt-3 space-y-2">{[0, 1, 2].map((item) => <i key={item} className="block h-1 w-5 rounded bg-muted" />)}</div></div>
          <div className="flex-1 p-2.5">
            <div className="grid grid-cols-3 gap-1.5">{['bg-primary/20', 'bg-success/20', 'bg-warning/20'].map((color) => <div key={color} className={cn('h-7 rounded border border-border/40 p-1.5', color)}><i className="block h-1 w-4 rounded bg-foreground/30" /><i className="mt-1 block h-1.5 w-7 rounded bg-foreground/60" /></div>)}</div>
            <div className="mt-2 flex h-12 items-end gap-1 rounded border border-border/40 px-2 pb-1.5">
              {[45, 72, 55, 88, 66, 100, 82].map((height, index) => <i key={index} className="origin-bottom flex-1 rounded-t-sm bg-gradient-to-t from-primary/35 to-primary/80 transition-transform duration-500 group-hover:scale-y-110 motion-reduce:transform-none motion-reduce:transition-none" style={{ height: `${height}%` }} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (preview === 'commerce') {
    return (
      <div className="w-[calc(100%_-_36px)] max-w-[238px] overflow-hidden rounded-xl border border-border/60 bg-background/90 shadow-lg" aria-hidden="true">
        <div className="flex h-6 items-center justify-between border-b border-border/50 px-2.5"><span className="font-mono text-[6px] font-bold tracking-wider">STUDIO SHOP</span><span className="relative"><ShoppingCart className="h-3 w-3 text-primary" /><i className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-destructive" /></span></div>
        <div className="grid grid-cols-3 gap-2 p-2.5">
          {['from-blue-500/40 to-cyan-400/15', 'from-fuchsia-500/35 to-red-400/15', 'from-amber-400/40 to-emerald-400/15'].map((color, index) => (
            <div key={color} className="rounded-lg border border-border/50 bg-card/60 p-1.5 transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none" style={{ transitionDelay: `${index * 55}ms` }}>
              <div className={cn('aspect-square rounded-md bg-gradient-to-br', color)} />
              <i className="mt-1.5 block h-1 w-4/5 rounded bg-foreground/35" />
              <i className="mt-1 block h-1 w-2/5 rounded bg-primary/70" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (preview === 'saas') {
    return (
      <div className="w-[calc(100%_-_36px)] max-w-[238px] overflow-hidden rounded-xl border border-border/60 bg-background/90 shadow-lg" aria-hidden="true">
        <div className="flex h-5 items-center justify-between border-b border-border/50 px-2.5">{browserDots}<span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[5px] text-primary">LIVE</span></div>
        <div className="flex h-[105px]">
          <div className="w-11 border-r border-border/50 bg-primary/[0.04] p-2"><div className="h-3 w-6 rounded bg-gradient-rgb opacity-70" />{[0, 1, 2, 3].map((item) => <i key={item} className="mt-2 block h-1 w-7 rounded bg-muted" />)}</div>
          <div className="flex-1 p-2.5">
            <div className="flex items-center justify-between"><i className="h-1.5 w-12 rounded bg-foreground/60" /><i className="h-4 w-9 rounded bg-primary/70" /></div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-2"><Code2 className="h-3 w-3 text-primary" /><i className="mt-2 block h-1 w-full rounded bg-muted" /><i className="mt-1 block h-1 w-3/4 rounded bg-muted" /></div>
              <div className="rounded-lg border border-success/20 bg-success/[0.05] p-2"><CheckCircle2 className="h-3 w-3 text-success" /><i className="mt-2 block h-1 w-full rounded bg-muted" /><i className="mt-1 block h-1 w-2/3 rounded bg-muted" /></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (preview === 'internal') {
    return (
      <div className="w-[calc(100%_-_36px)] max-w-[238px] overflow-hidden rounded-xl border border-border/60 bg-background/90 shadow-lg" aria-hidden="true">
        <div className="flex h-7 items-center justify-between border-b border-border/50 px-2.5"><span className="flex items-center gap-1.5"><Wrench className="h-3 w-3 text-primary" /><i className="h-1.5 w-12 rounded bg-foreground/50" /></span><span className="h-4 w-10 rounded border border-border/60 bg-muted/30" /></div>
        <div className="p-2.5">
          <div className="grid grid-cols-[1.4fr_0.8fr_0.5fr] gap-2 border-b border-border/50 pb-1.5 font-mono text-[5px] uppercase tracking-wider text-muted-foreground"><span>Request</span><span>Status</span><span>Owner</span></div>
          {[['bg-success/70', 'Done'], ['bg-warning/70', 'Review'], ['bg-primary/70', 'Active']].map(([color, status], index) => (
            <div key={status} className="grid grid-cols-[1.4fr_0.8fr_0.5fr] items-center gap-2 border-b border-border/30 py-2 transition-colors group-hover:bg-muted/15">
              <span><i className="block h-1 w-full rounded bg-muted" /><i className="mt-1 block h-1 w-2/3 rounded bg-muted/60" /></span>
              <span className="flex items-center gap-1 font-mono text-[5px]"><i className={cn('h-1.5 w-1.5 rounded-full', color)} />{status}</span>
              <span className="h-4 w-4 rounded-full bg-gradient-rgb opacity-50" style={{ opacity: 0.45 + index * 0.15 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[calc(100%_-_36px)] max-w-[238px] overflow-hidden rounded-xl border border-border/60 bg-background/90 shadow-lg" aria-hidden="true">
      <div className="flex h-5 items-center justify-between border-b border-border/50 px-2.5">{browserDots}<span className="h-1 w-9 rounded-full bg-muted" /></div>
      <div className="grid h-[105px] grid-cols-[1.2fr_0.8fr] items-center gap-3 p-3">
        <div>
          <i className="block h-2 w-4/5 rounded-full bg-gradient-rgb opacity-80" />
          <i className="mt-2 block h-1 w-full rounded-full bg-muted" />
          <i className="mt-1 block h-1 w-3/4 rounded-full bg-muted" />
          <i className="mt-3 block h-4 w-12 rounded bg-primary/70 transition-transform duration-500 group-hover:translate-x-1 motion-reduce:transition-none" />
        </div>
        <div className="relative aspect-square rounded-full bg-gradient-to-br from-primary/25 via-destructive/15 to-success/25"><Globe className="absolute inset-0 m-auto h-7 w-7 text-primary/70 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none" /></div>
      </div>
    </div>
  );
};

const BuildWhatYouCanBuild = () => (
  <section className="pb-20 pt-4 lg:pb-24">
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
      <ScrollReveal>
        <div className="mx-auto mb-14 max-w-[720px] text-center">
          <p className="font-mono text-label uppercase tracking-[0.22em] text-muted-foreground">What you can build</p>
          <h2 className="mt-4 font-space-grotesk text-[clamp(32px,3.8vw,46px)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
            <span className="bg-gradient-rgb bg-clip-text text-transparent">Anything you can describe.</span>
          </h2>
        </div>
      </ScrollReveal>

      <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {BUILD_CARDS.map((card) => (
          <div
            key={card.title}
            className="group overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:border-border/90 hover:shadow-xl motion-reduce:transform-none motion-reduce:transition-none"
          >
            {/* thumbnail */}
            <div className="relative flex aspect-[16/10] items-center justify-center border-b border-border/50 bg-muted/20">
              <BuildCardPreview preview={card.preview} />
              <span className="absolute left-3 top-3 rounded-lg border border-border/60 bg-background/70 px-2 py-1 font-mono text-caption uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                {card.tag}
              </span>
            </div>
            <div className="p-4">
              <h4 className="font-space-grotesk text-base font-bold tracking-[-0.01em]">{card.title}</h4>
              <p className="mt-1.5 text-xs leading-[1.5] text-muted-foreground">{card.body}</p>
            </div>
          </div>
        ))}
      </RevealGroup>
    </div>
  </section>
);

// ─── Evidence-backed context ──────────────────────────────────────────────────

const BuildEvidenceContext = ({ onOpen }: HeroProps) => {
  const [activeEvidence, setActiveEvidence] = useState(EVIDENCE_SOURCES[0].name);
  const activeSource = EVIDENCE_SOURCES.find((source) => source.name === activeEvidence) ?? EVIDENCE_SOURCES[0];

  return (
  <section className="overflow-x-clip pb-20 pt-4 lg:pb-24" id="evidence-backed-builder">
    <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14 lg:px-8">
      <ScrollReveal variant="slide-right">
        <div>
          <p className="text-center font-mono text-label uppercase tracking-[0.22em] text-muted-foreground">Your evidence, already here</p>
          <h2 className="mt-4 font-space-grotesk text-[clamp(34px,4.2vw,54px)] font-bold leading-[1.02] tracking-[-0.04em] text-balance">
            Don&rsquo;t start from a <span className="bg-gradient-rgb bg-clip-text text-transparent">blank prompt.</span>
          </h2>
          <p className="mt-5 max-w-[560px] text-base leading-relaxed text-muted-foreground">
            Bring your saved ICP, tested Demo Studio promise, and qualified PMF evidence into one editable build brief. The customer, pain, objections, buying signals, and must-have features can move into the build with you.
          </p>
          <div className="mt-6 space-y-3">
            {[
              'Review and edit every imported decision before code is generated.',
              'Keep evidence from different startup ideas safely separated.',
              'Build around what customers showed you, not what a blank canvas suggests.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-7 flex justify-center">
            <Button
              size="lg"
              className="gap-2 rounded-xl bg-gradient-rgb px-5 font-bold text-white shadow-[0_14px_34px_-16px_rgba(59,130,246,0.75)]"
              onClick={() => onOpen('Build an evidence-backed MVP from my saved ICP and PMF context')}
            >
              Build from my evidence
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal variant="slide-left" delay={0.08}>
        <div className="relative overflow-hidden rounded-2.5xl border border-border/70 bg-card/40 p-4 shadow-[0_35px_100px_-55px_rgba(59,130,246,0.7)] backdrop-blur-sm sm:p-6">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_42%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl animate-pulse motion-reduce:animate-none" />
          <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div>
              <p className="font-mono text-caption uppercase tracking-[0.18em] text-muted-foreground/70">Journey context compiler</p>
              <p className="mt-1 font-space-grotesk text-lg font-bold">Saved learning becomes build input</p>
            </div>
            <span className="rounded-full border border-success/25 bg-success/[0.08] px-2.5 py-1 text-caption font-semibold text-success">Editable before build</span>
          </div>

          <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
            {EVIDENCE_SOURCES.map(({ name, label, details, Icon, accent, surface }) => {
              const isActive = activeEvidence === name;
              return (
              <button
                key={name}
                type="button"
                aria-pressed={isActive}
                aria-controls="evidence-brief-preview"
                onClick={() => setActiveEvidence(name)}
                className={cn(
                  'group relative rounded-xl border p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none',
                  surface,
                  isActive
                    ? '-translate-y-1 border-primary/60 shadow-[0_16px_36px_-22px_rgba(59,130,246,0.9)]'
                    : 'hover:-translate-y-1 hover:border-border hover:shadow-lg',
                )}
              >
                <span className="flex items-center justify-between">
                  <Icon className={cn('h-5 w-5 transition-transform duration-300 motion-reduce:transition-none', accent, isActive && 'scale-110')} aria-hidden="true" />
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full bg-current transition-all duration-300',
                      accent,
                      isActive ? 'scale-100 animate-pulse motion-reduce:animate-none' : 'scale-0 group-hover:scale-75',
                    )}
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-3 block text-sm font-bold text-foreground">{name}</span>
                <span className="mt-0.5 block text-caption uppercase tracking-[0.12em] text-muted-foreground/70">{label}</span>
                <span className="mt-3 block space-y-1.5">
                  {details.map((detail) => (
                    <span key={detail} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={cn('h-1.5 w-1.5 rounded-full bg-current', accent)} aria-hidden="true" />
                      {detail}
                    </span>
                  ))}
                </span>
                <span className={cn('mt-4 inline-flex items-center gap-1 text-caption font-semibold transition-colors', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {isActive ? 'Added to preview' : 'Preview contribution'}
                  <ArrowRight className={cn('h-3 w-3 transition-transform duration-300 motion-reduce:transition-none', isActive && 'translate-x-1')} aria-hidden="true" />
                </span>
              </button>
              );
            })}
          </div>

          <div className="relative mx-auto my-3 flex h-8 w-8 rotate-90 items-center justify-center rounded-full border border-border/70 bg-background/80 text-primary sm:my-4">
            <ArrowRight className="h-4 w-4 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
          </div>

          <div id="evidence-brief-preview" aria-live="polite" className="relative rounded-2xl border border-primary/30 bg-primary/[0.07] p-5 shadow-[0_20px_50px_-35px_rgba(59,130,246,0.8)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                  <FileCheck2 className="h-4 w-4 text-primary" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold">MVP Builder brief</p>
                  <p className="text-xs text-muted-foreground">Evidence-backed scope</p>
                </div>
              </div>
              <span className="rounded-full bg-primary px-2.5 py-1 text-caption font-bold text-primary-foreground">{activeSource.briefLabel}</span>
            </div>
            <div key={activeSource.name} className="mt-4 rounded-xl border border-primary/15 bg-background/40 p-3 animate-fade-in motion-reduce:animate-none">
              <p className="text-xs font-bold text-foreground">Exploring {activeSource.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activeSource.preview}</p>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {['One customer', 'One job', 'One success event'].map((item) => (
                <div key={item} className="rounded-lg border border-border/60 bg-background/50 px-3 py-2.5 text-center text-xs font-semibold text-foreground">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  </section>
  );
};

// ─── 7-stage selector ─────────────────────────────────────────────────────────

const BuildStageSelector = () => {
  const [selected, setSelected] = useState('building');
  const activeStage = STAGES.find((s) => s.key === selected) ?? STAGES[3];
  const railRef = useRef<HTMLDivElement>(null);
  const defaultCardRef = useRef<HTMLButtonElement>(null);

  // Below lg the rail scrolls horizontally and the default stage (04 Building,
  // the one wearing the "You are here" pill) starts off-screen. Nudge it into
  // view on mount only. scrollLeft, not scrollIntoView() — the latter also
  // scrolls the window vertically and would yank the page past the heading.
  useLayoutEffect(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    const rail = railRef.current;
    const card = defaultCardRef.current;
    if (!rail || !card) return;
    rail.scrollLeft = Math.max(0, card.offsetLeft - 16);
  }, []);

  return (
    <section className="pb-20 pt-4 lg:pb-24" id="startup-cycle">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="mx-auto mb-10 max-w-[720px] text-center">
            <p className="font-mono text-label uppercase tracking-[0.22em] text-muted-foreground">The Startup Development Cycle</p>
            <h2 className="mt-4 font-space-grotesk text-[clamp(32px,3.8vw,46px)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
              <span className="bg-gradient-rgb bg-clip-text text-transparent">Trust the Process</span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground text-balance">
              You don&rsquo;t have to start from Stage 1. However, we highly recommend not skipping Validation.
              It exists to make sure you are building the right thing.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="rounded-2.5xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm sm:p-8">
            {/* rail — scroll-snap below lg, 7-across from lg up. pt-5 is load-bearing:
                overflow-x:auto forces overflow-y to compute to auto, which would clip
                the "You are here" pill (-top-2.5) and the selected card's -translate-y-1.5. */}
            <div
              ref={railRef}
              className="flex snap-x gap-2.5 overflow-x-auto scrollbar-hide pb-3 pt-5 lg:flex-wrap lg:overflow-visible lg:pb-0 lg:pt-0"
            >
              {STAGES.map((stage) => {
                const isSel = stage.key === selected;
                return (
                  <button
                    key={stage.key}
                    ref={stage.key === 'building' ? defaultCardRef : undefined}
                    type="button"
                    aria-pressed={isSel}
                    onClick={() => setSelected(stage.key)}
                    className={cn(
                      'relative w-[160px] shrink-0 snap-start rounded-2xl border p-3.5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-auto lg:shrink lg:flex-1 lg:basis-[calc(14.28%-10px)] lg:min-w-[100px]',
                      isSel
                        ? 'border-transparent -translate-y-1.5 shadow-[var(--shadow-rgb)]'
                        : 'border-border/60 bg-background/60 hover:-translate-y-0.5 hover:border-border',
                    )}
                    style={isSel ? {
                      background: `linear-gradient(var(--card),var(--card)) padding-box, var(--gradient-rgb) border-box`,
                      border: '2px solid transparent',
                    } : {}}
                  >
                    {stage.youAreHere && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-rgb px-2 py-0.5 font-mono text-caption font-bold uppercase tracking-[0.14em] text-white shadow-[0_6px_16px_-6px_rgba(59,130,246,0.45)]">
                        You are here
                      </span>
                    )}
                    <p className="font-mono text-caption tracking-[0.14em] text-muted-foreground/60">Stage {stage.num}</p>
                    <p className={cn('mt-2 font-space-grotesk font-bold tracking-[-0.01em]', isSel ? 'text-base' : 'text-sm')}>
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: stage.dot }} />
                      {stage.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{stage.tool}</p>
                  </button>
                );
              })}
            </div>

            {/* description footer */}
            <div className="mt-6 border-t border-border/50 pt-6">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: activeStage.dot }} />
                <span className="font-space-grotesk text-sm font-bold">{activeStage.name}</span>
                <span className="font-mono text-caption uppercase tracking-[0.14em] text-muted-foreground/60">
                  {activeStage.tool}
                </span>
              </div>
              <p className="text-sm leading-[1.65] text-muted-foreground">{activeStage.description}</p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

// ─── Focus, ownership, and shipping ───────────────────────────────────────────

const BuildFocusSection = () => {
  const [activeStep, setActiveStep] = useState(FOCUS_STEPS[0].title);
  const selectedStep = FOCUS_STEPS.find((step) => step.title === activeStep) ?? FOCUS_STEPS[0];
  const SelectedStepIcon = selectedStep.Icon;

  return (
  <section className="overflow-x-clip pb-20 pt-4 lg:pb-28" id="focused-mvp">
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
      <ScrollReveal>
        <div className="mx-auto max-w-[820px] text-center">
          <p className="font-mono text-label uppercase tracking-[0.22em] text-muted-foreground">Focus is a feature</p>
          <h2 className="mt-4 font-space-grotesk text-[clamp(34px,4.4vw,56px)] font-bold leading-[1.02] tracking-[-0.04em] text-balance">
            Build only what <span className="bg-gradient-rgb bg-clip-text text-transparent">proves demand.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[680px] text-base leading-relaxed text-muted-foreground">
            One customer. One job. One measurable result. That is enough to learn what deserves building next.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.06}>
        <div className="mt-10 rounded-2.5xl border border-primary/25 bg-card/40 p-5 shadow-[0_35px_100px_-60px_rgba(59,130,246,0.75)] backdrop-blur-sm sm:p-7">
          <div className="flex flex-col items-center justify-between gap-5 border-b border-border/60 pb-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <Target className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div>
                <p className="font-space-grotesk text-lg font-bold">The evidence-backed scope contract</p>
                <p className="text-sm text-muted-foreground">Enough product to test the decision. Nothing added just to look complete.</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
              {['1 customer', '1 job', '1 success event', '≤3 essential features'].map((item) => (
                <span key={item} className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <RevealGroup className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" stagger={0.07}>
            {FOCUS_STEPS.map(({ num, title, body, Icon }) => {
              const isActive = title === activeStep;
              return (
              <button
                key={title}
                type="button"
                aria-pressed={isActive}
                aria-controls="focus-step-detail"
                onClick={() => setActiveStep(title)}
                className={cn(
                  'group h-full rounded-xl border bg-background/50 p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none',
                  isActive
                    ? '-translate-y-1 border-primary/50 bg-primary/[0.07] shadow-[0_16px_36px_-24px_rgba(59,130,246,0.9)]'
                    : 'border-border/60 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg',
                )}
              >
                <span className="flex items-center justify-between">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 motion-reduce:transition-none', isActive ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary group-hover:bg-primary/15')}>
                    <Icon className={cn('h-5 w-5 transition-transform duration-300 motion-reduce:transition-none', isActive && 'scale-110')} aria-hidden="true" />
                  </span>
                  <span className="font-mono text-caption tracking-[0.16em] text-muted-foreground/50">{num}</span>
                </span>
                <span className="mt-5 block font-space-grotesk text-base font-bold">{title}</span>
                <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{body}</span>
                <span className={cn('mt-4 inline-flex items-center gap-1 text-caption font-semibold', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {isActive ? 'Selected' : 'Explore step'}
                  <ArrowRight className={cn('h-3 w-3 transition-transform duration-300 motion-reduce:transition-none', isActive && 'translate-x-1')} aria-hidden="true" />
                </span>
              </button>
              );
            })}
          </RevealGroup>

          <div id="focus-step-detail" aria-live="polite" className="mt-7 rounded-2xl border border-border/60 bg-background/40 p-4 sm:px-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                <SelectedStepIcon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div key={selectedStep.title} className="animate-fade-in motion-reduce:animate-none">
                <p className="text-sm font-bold">{selectedStep.title}: {selectedStep.outcome}</p>
                <p className="mt-0.5 max-w-[610px] text-xs leading-relaxed text-muted-foreground">{selectedStep.detail}</p>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  </section>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const BuildPage = () => {
  usePageAnalytics('/build', 'MVP Builder — Creatives Takeover');

  const [modalOpen, setModalOpen] = useState(false);
  const [intentText, setIntentText] = useState('A brand-new product');

  const openModal = useCallback((intent?: string) => {
    setIntentText(intent?.trim() || 'A brand-new product');
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => setModalOpen(false), []);

  return (
    <>
      <SEO
        title="Evidence-Backed MVP Builder for Founders | Creatives Takeover"
        description="Turn saved ICP and PMF evidence into a focused, deployable MVP. Build around one customer, one job, and the smallest testable feature set."
        keywords="evidence-backed MVP builder, MVP builder for founders, validated startup idea, build from customer research, ICP product builder, PMF app builder, AI web app builder"
      />
      <div className="relative min-h-screen">
        <HomeWallpaper />
        <div className="relative z-10">
          <Navigation />
          <BuildHero onOpen={openModal} />
          <BuildHowItWorks />
          <BuildWhatYouCanBuild />
          <BuildEvidenceContext onOpen={openModal} />
          <BuildFocusSection />
          <BuildStageSelector />
          <Footer />
        </div>
      </div>
      <SignupModal open={modalOpen} intent={intentText} onClose={closeModal} />
    </>
  );
};

export default BuildPage;
