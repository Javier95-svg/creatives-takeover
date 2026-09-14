import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Copy, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import DemoPlayer from '@/components/demo-studio/player/DemoPlayer';
import LoomEmbed from '@/components/demo-studio/vsl/LoomEmbed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createLaunchSignup, getPublicLaunchPage } from '@/lib/demoStudio/api';
import { DEFAULT_DEMO_STUDIO_CTA } from '@/lib/demoStudio/brief';
import { shouldShowWatermark } from '@/lib/demoStudio/plan';
import { trackDemoEvent } from '@/lib/demoStudio/events';
import type { PublicLaunchPage as PublicLaunchPageData } from '@/lib/demoStudio/types';
import { buildArtifactReferralPath, trackArtifactReferralClicked } from '@/lib/artifactReferral';
import { buildShareText, canUseNativeShare } from '@/lib/demoStudio/share';

export default function PublicLaunchPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicLaunchPageData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    void (async () => {
      try {
        const result = await getPublicLaunchPage(slug);
        if (!active) return;
        if (!result) {
          setState('missing');
          return;
        }
        setData(result);
        setState('ready');
        void trackDemoEvent('launch_page_view', {
          projectId: result.project.id,
          dedupeKey: `launch_${result.project.id}`,
          meta: { slug },
        });
        if (result.vsl) {
          void trackDemoEvent('vsl_impression', {
            projectId: result.project.id,
            vslId: result.vsl.id,
            dedupeKey: `vsl_${result.vsl.id}`,
            meta: { variation_label: result.vsl.variation_label },
          });
        }
      } catch {
        if (active) setState('missing');
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!data || !email.trim()) return;
    setSubmitting(true);
    try {
      void trackDemoEvent('signup_attempt', {
        projectId: data.project.id,
        demoId: data.demo?.demo.id,
        vslId: data.vsl?.id,
        meta: { variation_label: data.vsl?.variation_label ?? null },
      });
      await createLaunchSignup(data.project.id, email, {
        demoId: data.demo?.id ?? null,
        referrer: document.referrer || null,
        vslVariationSeen: data.vsl?.variation_label ?? null,
      });
      void trackDemoEvent('signup', {
        projectId: data.project.id,
        demoId: data.demo?.demo.id,
        vslId: data.vsl?.id,
        meta: { variation_label: data.vsl?.variation_label ?? null },
      });
      setSubmitted(true);
      setEmail('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not join the list.');
    } finally {
      setSubmitting(false);
    }
  };

  // Visitor share actions. These are anon requests, so the demo-studio-event
  // function derives owner_view = false from the absent JWT; a founder testing
  // their own page is tagged owner_view = true automatically. No dedupeKey:
  // sharing to two channels is two genuine signals, and the function already
  // rate limits at 30/min.
  const trackShare = (channel: string, placement: 'page' | 'post_signup') => {
    if (!data) return;
    void trackDemoEvent('share_click', {
      projectId: data.project.id,
      demoId: data.demo?.demo.id,
      vslId: data.vsl?.id,
      meta: { channel, placement },
    });
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = async (placement: 'page' | 'post_signup') => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied.');
      trackShare('copy', placement);
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  const handleNativeShare = async (title: string, text: string, placement: 'page' | 'post_signup') => {
    try {
      await navigator.share({ title, text, url: shareUrl });
      trackShare('native', placement);
    } catch {
      // The visitor dismissed the sheet. Not an error worth surfacing.
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (state === 'missing' || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center text-white">
        <SEO title="Launch page not found" description="This Demo Studio launch page is unavailable." noindex />
        <h1 className="text-2xl font-semibold">Launch page not found</h1>
        <p className="text-white/60">This page may be unpublished or the link is incorrect.</p>
        <Link
          to={buildArtifactReferralPath('demo_launch')}
          className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
          onClick={() => trackArtifactReferralClicked('demo_launch', 'missing_state')}
        >
          Build yours free
        </Link>
      </div>
    );
  }

  const primaryColor = data.launchPage.theme?.primaryColor || '#6366f1';
  const background = data.launchPage.theme?.background ?? 'dark';
  const layout = data.launchPage.theme?.layoutStyle ?? 'split';
  const successMessage = data.launchPage.theme?.successMessage || 'You are on the early access list.';
  const ctaLabel = data.launchPage.cta_label || DEFAULT_DEMO_STUDIO_CTA;
  const demoGoal = data.launchPage.theme?.conceptTest ? 'collect_signups' : data.demo?.demo.theme?.demoGoal ?? 'collect_signups';
  const headerHref = demoGoal === 'collect_signups'
    ? '#signup'
    : demoGoal === 'validate_interest'
      ? '#demo'
      : data.demo?.demo.theme?.endCtaHref || '#demo';
  const pageClass = background === 'light'
    ? 'min-h-screen bg-white text-foreground'
    : background === 'gradient'
      ? 'min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.28),transparent_34%),linear-gradient(135deg,#020617,#111827)] text-white'
      : 'min-h-screen bg-slate-950 text-white';
  const mutedText = background === 'light' ? 'text-muted-foreground' : 'text-white/70';
  const mediaOrder = layout === 'demo_first' ? 'lg:order-first' : '';

  const shareHeadline = data.launchPage.headline || data.project.name;
  const shareText = buildShareText(shareHeadline, data.project.name);

  // A demand page is published, not posted. The founder drives traffic to it
  // deliberately; a visitor who wants to pass it on just needs the URL, so this
  // is a copy-link control rather than a row of social intents.
  const renderShareRow = (placement: 'page' | 'post_signup') => (
    <div className="flex flex-wrap items-center gap-2">
      {canUseNativeShare() && (
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => handleNativeShare(shareHeadline, shareText, placement)}
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2"
        onClick={() => handleCopyLink(placement)}
      >
        <Copy className="h-4 w-4" />
        Copy link
      </Button>
    </div>
  );

  return (
    <div className={pageClass}>
      <SEO
        title={`${data.project.name} demo and founder pitch`}
        description={data.launchPage.subheadline || data.project.tagline || `See the ${data.project.name} demo.`}
        image={`https://creatives-takeover.com/og/p/${slug}`}
        type="product"
      />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 md:py-12">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {data.project.logo_url && (
              <img
                src={data.project.logo_url}
                alt={`${data.project.name} logo`}
                className="h-8 w-8 rounded-lg object-cover"
                loading="eager"
                decoding="async"
              />
            )}
            <span className="text-sm font-semibold">{data.project.name}</span>
            <Link
              to="/demo-studio"
              className={`hidden text-xs sm:inline ${mutedText} hover:underline`}
            >
              on Creatives Takeover
            </Link>
          </div>
          <a
            href={headerHref}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-foreground"
            onClick={() => {
              void trackDemoEvent('cta_click', {
                projectId: data.project.id,
                demoId: data.demo?.demo.id,
                vslId: data.vsl?.id,
                meta: { placement: 'header', variation_label: data.vsl?.variation_label ?? null },
              });
            }}
          >
            {ctaLabel}
          </a>
        </header>

        <section className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-white/50">{data.launchPage.theme?.conceptTest ? 'Concept seeking interest • Not a finished product' : 'Interactive demo + founder pitch'}</p>
            <h1 className="creatives-font text-4xl font-bold leading-tight md:text-6xl">
              {data.launchPage.headline || data.project.name}
            </h1>
            <p className={`mt-5 max-w-2xl text-lg ${mutedText}`}>
              {data.launchPage.subheadline || data.project.tagline || 'Watch the pitch, click through the demo, and get early access.'}
            </p>
            {demoGoal === 'collect_signups' && <form id="signup" onSubmit={handleSubmit} className="mt-8 flex max-w-lg flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                required
                value={email}
                placeholder="you@example.com"
                className="h-12 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                type="submit"
                disabled={submitting || submitted}
                className="h-12 shrink-0"
                style={{ backgroundColor: primaryColor }}
                onClick={() => {
                  void trackDemoEvent('cta_click', {
                    projectId: data.project.id,
                    demoId: data.demo?.demo.id,
                    vslId: data.vsl?.id,
                    meta: { placement: 'signup_form', variation_label: data.vsl?.variation_label ?? null },
                  });
                }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : submitted ? 'Joined' : ctaLabel}
              </Button>
            </form>}
            {submitted && (
              <div className="mt-3 space-y-3">
                <p className="inline-flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" /> {successMessage}
                </p>
                <div className="space-y-2">
                  <p className={`text-sm ${mutedText}`}>Know someone who would want this?</p>
                  {renderShareRow('post_signup')}
                </div>
              </div>
            )}
          </div>

          <div className={`space-y-4 ${mediaOrder}`}>
            <LoomEmbed embedUrl={data.vsl?.loom_embed_url} sharedUrl={data.vsl?.loom_shared_url} title={data.vsl?.title} />
            {data.vsl?.hook && <p className="text-sm text-white/60">{data.vsl.hook}</p>}
          </div>
        </section>

        {data.demo && (
          <section id="demo" className="mt-10 rounded-2xl bg-white p-3 text-foreground md:p-4">
            <DemoPlayer
              steps={data.demo.steps}
              theme={data.demo.demo.theme}
              mode="live"
              projectId={data.project.id}
              demoId={data.demo.demo.id}
              ctaHref={demoGoal === 'collect_signups' ? '#signup' : undefined}
              ctaLabel={data.launchPage.cta_label}
              showWatermark={shouldShowWatermark(data.demo.demo.theme?.watermark, data.demo.demo.theme?.ownerPlan)}
            />
          </section>
        )}

        <section
          className={`mt-10 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between ${
            background === 'light' ? 'border-slate-200' : 'border-white/10'
          }`}
        >
          <p className={`text-sm ${mutedText}`}>Share {data.project.name}</p>
          {renderShareRow('page')}
        </section>

        <footer className={`mt-8 rounded-2xl border p-6 ${
          background === 'light' ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
        }`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className={`text-xs uppercase tracking-wide ${mutedText}`}>
                Built with Creatives Takeover Demo Studio
              </p>
              <p className="text-base font-semibold">Turn your product into a page like this one.</p>
              <p className={`text-sm ${mutedText}`}>
                Interactive demo, founder pitch, and email capture. Free to start, no code.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to={buildArtifactReferralPath('demo_launch')}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
                onClick={() => trackArtifactReferralClicked('demo_launch', 'footer_module')}
              >
                Build your demo page free
              </Link>
              <Link
                to="/launches"
                className={`text-sm ${mutedText} hover:underline`}
              >
                See other launches →
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
