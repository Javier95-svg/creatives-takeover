import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Code2,
  Github,
  Globe,
  LayoutDashboard,
  Mail,
  Pencil,
  Rocket,
  ShoppingCart,
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

const HOW_STEPS = [
  {
    num: '01', color: 'blue' as const, Icon: Pencil, title: 'Describe',
    body: "Type your idea like you're texting a friend. \"A booking app for a yoga studio\" is all we need.",
  },
  {
    num: '02', color: 'red' as const, Icon: Zap, title: 'Build',
    body: 'Watch it build, test, and fix itself in real time. "Add a payment flow to my booking app" and it\'s done.',
  },
  {
    num: '03', color: 'green' as const, Icon: Rocket, title: 'Launch',
    body: 'Our GTM Strategist and Directories get your app in front of the right people. Make an impact since the beginning.',
  },
];

const BUILD_CARDS = [
  { tag: 'Sites', Icon: Globe, title: 'Landing pages', body: 'High-converting marketing pages with a hero, sections, and a CTA. On-brand from the first draft.' },
  { tag: 'Apps', Icon: Zap, title: 'Web & mobile apps', body: 'Auth, data, and real interactions across habit trackers, CRMs, booking flows, and note apps. Working, not wireframes.' },
  { tag: 'Data', Icon: LayoutDashboard, title: 'Dashboards', body: 'Track your metrics, your users, or your team. Charts, tables, and filters wired to live data.' },
  { tag: 'Commerce', Icon: ShoppingCart, title: 'Online stores', body: 'Product grids, carts, and checkout for your first 100 orders. Ship the store before you over-think the catalogue.' },
  { tag: 'SaaS', Icon: Code2, title: 'SaaS MVPs', body: 'Pricing, onboarding, and a core feature loop. The smallest real version of the product you keep talking about.' },
  { tag: 'Internal', Icon: Wrench, title: 'Internal tools', body: 'Admin panels, ops dashboards, and team workflows. Stop running the company out of a spreadsheet.' },
];

const STAGES = [
  { num: '01', key: 'identity', name: 'Identity', tool: 'ICP Builder', dot: '#3B82F6', youAreHere: false, description: "Before doing anything, get clear on the basics. Define your problem, your customer, and what makes your solution different. You'll come out with a sharp ICP and a clear direction." },
  { num: '02', key: 'prototyping', name: 'Prototyping', tool: 'Waitlist Maker', dot: '#06B6D4', youAreHere: false, description: "Turn your idea into a simple landing page that captures early interest. It should explain what you're building, who it's for, and why it matters. The goal is to collect signups and confirm demand before writing a single line of code." },
  { num: '03', key: 'validation', name: 'Validation', tool: 'PMF Lab', dot: '#EF4444', youAreHere: false, description: 'Talk to your potential customers directly and gather honest feedback. Track signals like interview insights and waitlist signups to confirm real demand. If validation is strong, move forward. If not, iterate based on what your customers tell you.' },
  { num: '04', key: 'building', name: 'Building', tool: 'MVP Builder + Tech Stack', dot: '#10B981', youAreHere: true, description: "With validation confirmed, it's time to build. Focus only on the core features that deliver your main value, nothing more. Use our MVP Builder and Tech Stack tools, tap into our mentor network, and get your product out fast so you can learn and improve as you grow." },
  { num: '05', key: 'launch', name: 'Launch', tool: 'GTM Strategist + Directories', dot: '#F59E0B', youAreHere: false, description: "Time to go public. Share your product where your audience already hangs out, from Product Hunt and LinkedIn to Reddit and beyond. Submit to directories, build your brand, and start generating the attention and early users that create momentum." },
  { num: '06', key: 'traction', name: 'Traction', tool: 'Traction Engine', dot: '#8B5CF6', youAreHere: false, description: 'Traction is where early users become a real business. Find the acquisition channel that fits your product, track retention in the first 30 days, and run weekly plays with our GTM Strategist and Traction Engine. Hit the score threshold three weeks in a row and you have a fundable story.' },
  { num: '07', key: 'fundraising', name: 'Fundraising', tool: 'Insighta + Angels', dot: '#EC4899', youAreHere: false, description: "With a working MVP, proven demand, and early customers, you're ready to raise. Fundraising gives you the resources to scale faster, grow your team, and keep improving the product. It also adds credibility that attracts more investment and keeps the momentum going." },
];

const TESTIMONIALS = [
  { quote: "I was quoted £5k for an MVP. I described it here instead and had a working version that night. Three weeks later it had paying users.", em: '£5k for an MVP', name: 'Jordan Rivera', role: 'Solo founder. ops SaaS', initials: 'JR', from: '#3B82F6', to: '#2563EB' },
  { quote: "No application, no cohort, no rejection email. I just started building and the system kept telling me the next move.", em: 'started building', name: 'Maya Karlsson', role: 'Non-technical founder', initials: 'MK', from: '#7C5CFA', to: '#5B3FD6' },
  { quote: "I shipped four landing pages before I found the one that converted. Doing that with an agency would've cost a quarter and £20k.", em: 'quarter and £20k', name: 'Sam Lin', role: 'Indie maker. 3 products', initials: 'SL', from: '#3B82F6', to: '#2563EB' },
  { quote: "I'm not technical. I described a booking tool, it built the whole thing, and I'd onboarded ten clients before the weekend was over.", em: 'built the whole thing', name: 'Priya Nair', role: 'Studio owner', initials: 'PN', from: '#10B981', to: '#059669' },
  { quote: 'Every time I finished a step, it told me the next one. That\'s the part a generic chatbot never gave me.', em: 'next one', name: 'Tomas Vega', role: 'First-time founder', initials: 'TV', from: '#EF4444', to: '#DC2626' },
  { quote: 'I stopped paying an agency £2k a month to move slowly. Now I ship the change myself in an afternoon.', em: '£2k a month', name: 'Aisha Bello', role: 'Bootstrapped SaaS', initials: 'AB', from: '#8B5CF6', to: '#7C3AED' },
];

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
      <DialogContent className="max-w-[420px] gap-0 rounded-[20px] p-0 [&>button]:hidden">
        <div className="relative rounded-[20px] border border-border bg-card p-7 shadow-[0_50px_110px_-30px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[9px] bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            <img src={ctLogoMark} alt="Creatives Takeover" className="mb-4 h-14 w-14 rounded-[14px] object-cover shadow-lg" />

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
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
                  You&rsquo;re about to build
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-foreground">
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

            <p className="mt-5 text-[11.5px] leading-relaxed text-muted-foreground/70">
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
                'group relative cursor-text rounded-[18px] border bg-card/40 p-5 pb-3.5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-300',
                'hover:border-blue-400/30 hover:shadow-[0_36px_90px_-40px_rgba(0,0,0,0.7),0_0_60px_-20px_rgba(59,130,246,0.2)]',
                'focus-within:border-blue-400/40 focus-within:shadow-[0_36px_90px_-40px_rgba(0,0,0,0.7),0_0_60px_-20px_rgba(59,130,246,0.25)]',
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
                  className="relative z-10 min-h-[54px] text-[17px] leading-relaxed text-foreground outline-none"
                  style={{ caretColor: 'hsl(var(--primary))' }}
                />
                {/* animated placeholder */}
                {!userInput && (
                  <div className="pointer-events-none absolute inset-0 z-0 flex items-start pt-0.5" aria-hidden="true">
                    <span className="text-[17px] leading-relaxed text-muted-foreground/55">
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
                <span className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 px-2.5 py-1.5 text-[13px] font-semibold text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                  Build
                </span>
                <span className="flex-1" />
                <Button
                  size="sm"
                  className="h-9 gap-2 rounded-[11px] bg-gradient-rgb px-4 text-sm font-bold text-white shadow-[0_8px_22px_-8px_rgba(59,130,246,0.5)] transition-all hover:scale-[1.02] hover:brightness-105"
                  onClick={() => onOpen(getCurrentIntent())}
                >
                  Build now
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* suggestion chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/60">
                Try
              </span>
              {CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => onOpen(chip.intent)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-blue-400/40 hover:text-foreground"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: chip.dot }} />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* trust row */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm">
            <div className="flex">
              {['JR', 'MK', 'SL', 'DA', '+1k'].map((init, i) => (
                <span
                  key={init}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-[11px] font-bold text-white',
                    i > 0 && '-ml-2.5',
                  )}
                  style={{
                    background: i === 0 ? 'linear-gradient(135deg,#3B82F6,#2563EB)' :
                      i === 1 ? 'linear-gradient(135deg,#EF4444,#DC2626)' :
                      i === 2 ? 'linear-gradient(135deg,#10B981,#059669)' :
                      i === 3 ? 'linear-gradient(135deg,#8B5CF6,#7C3AED)' :
                      '#1e2130',
                    color: i === 4 ? 'hsl(var(--muted-foreground))' : '#fff',
                  }}
                >
                  {init}
                </span>
              ))}
            </div>
            <span className="text-muted-foreground">
              <strong className="text-foreground">1,000+ founders</strong> building right now
            </span>
            <span className="h-5 w-px bg-border" />
            <span className="text-muted-foreground">
              <span className="text-amber-400">★★★★★</span>{' '}
              <strong className="text-foreground">4.8/5</strong>
            </span>
          </div>
        </div>
      </section>
    </>
  );
};

// ─── How it works ─────────────────────────────────────────────────────────────

const stepColors = {
  blue: { tile: 'from-[#3B82F6] to-[#2563EB]', shadow: 'rgba(59,130,246,0.45)' },
  red:  { tile: 'from-[#EF4444] to-[#DC2626]', shadow: 'rgba(239,68,68,0.45)' },
  green:{ tile: 'from-[#10B981] to-[#059669]', shadow: 'rgba(16,185,129,0.45)' },
};

const BuildHowItWorks = () => (
  <section className="pb-20 pt-8 lg:pb-24">
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
      <ScrollReveal>
        <div className="mx-auto mb-14 max-w-[720px] text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">How it works</p>
          <h2 className="mt-4 font-space-grotesk text-[clamp(32px,3.8vw,46px)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
            <span className="bg-gradient-rgb bg-clip-text text-transparent">Three steps from sentence to shipped</span>
          </h2>
        </div>
      </ScrollReveal>

      <RevealGroup className="grid gap-6 sm:grid-cols-3">
        {HOW_STEPS.map((step, i) => {
          const c = stepColors[step.color];
          return (
            <div
              key={step.num}
              className="relative rounded-2xl border border-border/60 bg-card/50 p-7 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-xl"
            >
              <div className="mb-12 flex items-center justify-between">
                <span className="font-mono text-[13px] font-bold tracking-[0.12em] text-muted-foreground/60">
                  {step.num}
                </span>
                <span
                  className={cn('flex h-11 w-11 items-center justify-center rounded-[13px] bg-gradient-to-br text-white', c.tile)}
                  style={{ boxShadow: `0 10px 24px -8px ${c.shadow}` }}
                >
                  <step.Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              {/* connector */}
              {i < HOW_STEPS.length - 1 && (
                <div className="absolute right-[-12px] top-[50px] z-10 hidden h-px w-6 bg-border sm:block" aria-hidden="true" />
              )}
              <h3 className="font-space-grotesk text-[22px] font-bold tracking-[-0.02em]">{step.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          );
        })}
      </RevealGroup>
    </div>
  </section>
);

// ─── What you can build ───────────────────────────────────────────────────────

const BuildWhatYouCanBuild = () => (
  <section className="pb-20 pt-4 lg:pb-24">
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
      <ScrollReveal>
        <div className="mx-auto mb-14 max-w-[720px] text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">What you can build</p>
          <h2 className="mt-4 font-space-grotesk text-[clamp(32px,3.8vw,46px)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
            <span className="bg-gradient-rgb bg-clip-text text-transparent">Anything you can describe.</span>
          </h2>
        </div>
      </ScrollReveal>

      <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {BUILD_CARDS.map((card) => (
          <div
            key={card.title}
            className="overflow-hidden rounded-2xl border border-border/60 bg-card/50 transition-all duration-300 hover:-translate-y-1 hover:border-border/90 hover:shadow-xl"
          >
            {/* thumbnail */}
            <div className="relative flex aspect-[16/10] items-center justify-center border-b border-border/50 bg-muted/20">
              <div className="overflow-hidden rounded-xl border border-border/60 bg-background/80 shadow-lg" style={{ width: 'calc(100% - 36px)', maxWidth: 220 }}>
                <div className="flex h-5 items-center gap-1.5 border-b border-border/50 px-2.5">
                  <i className="h-1.5 w-1.5 rounded-full bg-border" />
                  <i className="h-1.5 w-1.5 rounded-full bg-border" />
                  <i className="h-1.5 w-1.5 rounded-full bg-border" />
                </div>
                <div className="flex flex-col gap-1.5 p-2.5">
                  <div className="h-2 w-[55%] rounded-full bg-gradient-rgb opacity-60" />
                  <div className="h-1.5 w-4/5 rounded-full bg-muted" />
                  <div className="h-1.5 w-2/3 rounded-full bg-muted" />
                </div>
              </div>
              <span className="absolute left-3 top-3 rounded-lg border border-border/60 bg-background/70 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                {card.tag}
              </span>
            </div>
            <div className="p-4">
              <h4 className="font-space-grotesk text-[17px] font-bold tracking-[-0.01em]">{card.title}</h4>
              <p className="mt-1.5 text-[13px] leading-[1.5] text-muted-foreground">{card.body}</p>
            </div>
          </div>
        ))}
      </RevealGroup>
    </div>
  </section>
);

// ─── 7-stage selector ─────────────────────────────────────────────────────────

const BuildStageSelector = () => {
  const [selected, setSelected] = useState('building');
  const activeStage = STAGES.find((s) => s.key === selected) ?? STAGES[3];

  return (
    <section className="pb-20 pt-4 lg:pb-24" id="startup-cycle">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="mx-auto mb-10 max-w-[720px] text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">The Startup Development Cycle</p>
            <h2 className="mt-4 font-space-grotesk text-[clamp(32px,3.8vw,46px)] font-bold leading-[1.08] tracking-[-0.03em] text-balance">
              <span className="bg-gradient-rgb bg-clip-text text-transparent">Trust the Process</span>
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground text-balance">
              You don&rsquo;t have to start from Stage 1. However, we highly recommend not skipping Validation.
              It exists to make sure you are building the right thing.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="rounded-[20px] border border-border/60 bg-card/40 p-6 backdrop-blur-sm sm:p-8">
            {/* rail */}
            <div className="flex flex-wrap gap-2.5">
              {STAGES.map((stage) => {
                const isSel = stage.key === selected;
                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => setSelected(stage.key)}
                    className={cn(
                      'relative flex-1 basis-[calc(14.28%-10px)] min-w-[100px] rounded-[14px] border p-3.5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-rgb px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_6px_16px_-6px_rgba(59,130,246,0.45)]">
                        You are here
                      </span>
                    )}
                    <p className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground/60">Stage {stage.num}</p>
                    <p className={cn('mt-2 font-space-grotesk font-bold tracking-[-0.01em]', isSel ? 'text-[16px]' : 'text-[15px]')}>
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: stage.dot }} />
                      {stage.name}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-muted-foreground">{stage.tool}</p>
                  </button>
                );
              })}
            </div>

            {/* description footer */}
            <div className="mt-6 border-t border-border/50 pt-6">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: activeStage.dot }} />
                <span className="font-space-grotesk text-[15px] font-bold">{activeStage.name}</span>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground/60">
                  {activeStage.tool}
                </span>
              </div>
              <p className="text-[14.5px] leading-[1.65] text-muted-foreground">{activeStage.description}</p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

// ─── Testimonials marquee ─────────────────────────────────────────────────────

const BuildTestimonials = () => {
  const doubled = [...TESTIMONIALS, ...TESTIMONIALS];
  return (
    <section className="pb-20 pt-4 lg:pb-24" id="founders">
      {/* keyframes for the marquee */}
      <style>{`
        @keyframes ct-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .ct-marquee-track { animation: ct-marquee 60s linear infinite; }
        .ct-marquee-wrap:hover .ct-marquee-track { animation-play-state: paused; }
      `}</style>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="mx-auto mb-12 max-w-[720px] text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">No gatekeepers</p>
            <h2 className="mt-4 font-space-grotesk text-[clamp(32px,3.8vw,46px)] font-bold leading-[1.08] tracking-[-0.03em]">
              <span className="bg-gradient-rgb bg-clip-text text-transparent">Who&rsquo;s Next?</span>
            </h2>
          </div>
        </ScrollReveal>
      </div>

      {/* full-bleed marquee */}
      <div
        className="ct-marquee-wrap relative mb-10 overflow-hidden"
        style={{ maskImage: 'linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)' }}
      >
        <div className="ct-marquee-track flex gap-5 will-change-transform">
          {doubled.map((t, i) => (
            <div
              key={i}
              className="w-[360px] shrink-0 rounded-2xl border border-border/60 bg-card/50 p-6"
              aria-hidden={i >= TESTIMONIALS.length}
            >
              <span className="font-space-grotesk text-[40px] leading-[0.4] text-primary">&ldquo;</span>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-foreground">
                {t.quote.split(t.em).map((part, pi) =>
                  pi === 0 ? part :
                    <span key={pi}>
                      <em className="bg-gradient-rgb bg-clip-text text-transparent not-italic font-bold">{t.em}</em>
                      {part}
                    </span>
                )}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                  style={{ background: `linear-gradient(135deg,${t.from},${t.to})` }}
                >
                  {t.initials}
                </span>
                <div>
                  <p className="text-[13.5px] font-bold">{t.name}</p>
                  <p className="text-[11.5px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ScrollReveal>
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4">
          <span className="w-full text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground/60">
            Featured in the founder feeds you actually read
          </span>
          {['Reddit r/startups', 'Product Hunt', 'Indie Hackers', 'Hacker News', 'X / Build in Public'].map((name) => (
            <span key={name} className="font-space-grotesk text-[16px] font-bold text-muted-foreground/60">
              {name}
            </span>
          ))}
        </div>
      </ScrollReveal>
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
        title="MVP Builder — Ship Your Idea This Week | Creatives Takeover"
        description="Describe what you want to build. Get a real, deployable web app. The MVP Builder is the fastest line between a validated idea and a product you can ship."
        keywords="MVP builder, vibe coding, build an app without code, no-code MVP, startup landing page generator, AI web app builder, ship MVP fast"
      />
      <div className="relative min-h-screen">
        <HomeWallpaper />
        <div className="relative z-10">
          <Navigation />
          <BuildHero onOpen={openModal} />
          <BuildHowItWorks />
          <BuildWhatYouCanBuild />
          <BuildStageSelector />
          <BuildTestimonials />
          <Footer />
        </div>
      </div>
      <SignupModal open={modalOpen} intent={intentText} onClose={closeModal} />
    </>
  );
};

export default BuildPage;
