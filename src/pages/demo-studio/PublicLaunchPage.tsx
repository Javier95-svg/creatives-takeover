import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import DemoPlayer from '@/components/demo-studio/player/DemoPlayer';
import LoomEmbed from '@/components/demo-studio/vsl/LoomEmbed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createLaunchSignup, getPublicLaunchPage } from '@/lib/demoStudio/api';
import { trackDemoEvent } from '@/lib/demoStudio/events';
import type { PublicLaunchPage as PublicLaunchPageData } from '@/lib/demoStudio/types';

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
      await createLaunchSignup(data.project.id, email, {
        referrer: document.referrer || null,
        vslVariationSeen: data.vsl?.variation_label ?? null,
      });
      setSubmitted(true);
      setEmail('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not join the list.');
    } finally {
      setSubmitting(false);
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
        <Link to="/demo-studio" className="mt-2 text-sm text-primary underline-offset-4 hover:underline">
          Build your own Demo Studio page
        </Link>
      </div>
    );
  }

  const primaryColor = data.launchPage.theme?.primaryColor || '#6366f1';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SEO
        title={`${data.project.name} demo and founder pitch`}
        description={data.launchPage.subheadline || data.project.tagline || `See the ${data.project.name} demo.`}
        type="product"
      />
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 md:py-12">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link to="/demo-studio" className="text-sm font-semibold text-white/80 hover:text-white">
            Creatives Takeover Demo Studio
          </Link>
          <a href="#signup" className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
            {data.launchPage.cta_label || 'Join the waitlist'}
          </a>
        </header>

        <section className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-white/50">Interactive demo + founder pitch</p>
            <h1 className="creatives-font text-4xl font-bold leading-tight md:text-6xl">
              {data.launchPage.headline || data.project.name}
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-white/70">
              {data.launchPage.subheadline || data.project.tagline || 'Watch the pitch, click through the demo, and join the early list.'}
            </p>
            <form id="signup" onSubmit={handleSubmit} className="mt-8 flex max-w-lg flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                required
                value={email}
                placeholder="you@example.com"
                className="h-12 border-white/15 bg-white/10 text-white placeholder:text-white/40"
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" disabled={submitting || submitted} className="h-12 shrink-0" style={{ backgroundColor: primaryColor }}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : submitted ? 'Joined' : data.launchPage.cta_label}
              </Button>
            </form>
            {submitted && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> You are on the list.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <LoomEmbed embedUrl={data.vsl?.loom_embed_url} sharedUrl={data.vsl?.loom_shared_url} title={data.vsl?.title} />
            {data.vsl?.hook && <p className="text-sm text-white/60">{data.vsl.hook}</p>}
          </div>
        </section>

        {data.demo && (
          <section className="mt-10 rounded-2xl bg-white p-3 text-slate-950 md:p-4">
            <DemoPlayer
              steps={data.demo.steps}
              theme={data.demo.demo.theme}
              mode="live"
              projectId={data.project.id}
              demoId={data.demo.demo.id}
              ctaHref="#signup"
              ctaLabel={data.launchPage.cta_label}
              showWatermark={data.demo.demo.theme?.watermark !== false}
            />
          </section>
        )}
      </main>
    </div>
  );
}
