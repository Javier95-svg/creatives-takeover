import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Copy, ExternalLink, Globe, Linkedin } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { trackActivity } from '@/lib/activity';
import { trackShareLinkViewed, trackShareLinkConverted } from '@/lib/analytics';
import {
  getBizMapLinkedInPostText,
  getBizMapLinkedInShareUrl,
  getBizMapShareDescription,
  getBizMapShareUrl,
  getBizMapSharedOutputBySlug,
  isGTMSharedSnapshot,
  isICPSharedSnapshot,
  isPMFSharedSnapshot,
  type BizMapSharedOutputRecord,
} from '@/lib/bizmapSharing';

function SourceBadge({ sourceType }: { sourceType: BizMapSharedOutputRecord['source_type'] }) {
  return (
    <Badge variant="secondary" className="rounded-full px-3 py-1 text-label uppercase tracking-[0.18em]">
      {sourceType === 'icp' ? 'ICP Builder' : sourceType === 'pmf' ? 'PMF Lab' : 'GTM Strategist'}
    </Badge>
  );
}

export default function SharedBizMapOutputPage() {
  const { slug } = useParams<{ slug: string }>();
  const [record, setRecord] = useState<BizMapSharedOutputRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        const data = await getBizMapSharedOutputBySlug(slug);
        setRecord(data);

        if (data) {
          await trackActivity('bizmap_shared_output_viewed', {
            slug,
            shareId: data.id,
            sourceType: data.source_type,
            visibility: data.visibility,
          });
          trackShareLinkViewed({ slug, shareId: data.id, sourceType: data.source_type });
        }
      } catch (error) {
        console.error('Failed to load shared output:', error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [slug]);

  const pageUrl = useMemo(
    () => (slug && typeof window !== 'undefined' ? getBizMapShareUrl(slug) : ''),
    [slug],
  );

  const handleCopyLink = async () => {
    if (!record) return;
    await navigator.clipboard.writeText(pageUrl);
    toast.success('Link copied.');
    await trackActivity('bizmap_shared_output_link_copied', {
      slug: record.slug,
      shareId: record.id,
      sourceType: record.source_type,
    });
  };

  const handleLinkedInShare = async () => {
    if (!record) return;
    window.open(getBizMapLinkedInShareUrl(record.slug), '_blank', 'noopener,noreferrer');
    await trackActivity('bizmap_shared_output_linkedin_clicked', {
      slug: record.slug,
      shareId: record.id,
      sourceType: record.source_type,
    });
  };

  const handleCopyPostText = async () => {
    if (!record) return;
    await navigator.clipboard.writeText(getBizMapLinkedInPostText(record));
    toast.success('LinkedIn post text copied.');
    await trackActivity('bizmap_shared_output_linkedin_text_copied', {
      slug: record.slug,
      shareId: record.id,
      sourceType: record.source_type,
    });
  };

  const handleCTA = async () => {
    if (!record) return;
    await trackActivity('bizmap_shared_output_cta_clicked', {
      slug: record.slug,
      shareId: record.id,
      sourceType: record.source_type,
    });
    trackShareLinkConverted({ slug: record.slug, shareId: record.id, sourceType: record.source_type });
  };

  const robots = record?.visibility === 'public'
    ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
    : 'noindex,nofollow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
  const description = record ? getBizMapShareDescription(record) : 'Shared BizMap AI output from Creatives Takeover.';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_35%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.95))] text-foreground dark:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_32%),linear-gradient(180deg,rgba(2,6,23,1),rgba(3,7,18,0.98))] dark:text-white">
      <Helmet>
        <title>{record ? `${record.title} | Creatives Takeover` : 'Shared BizMap Output | Creatives Takeover'}</title>
        <meta name="description" content={description} />
        <meta name="robots" content={robots} />
        <meta name="googlebot" content={robots} />
        {pageUrl ? <link rel="canonical" href={pageUrl} /> : null}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={record?.title ?? 'Shared BizMap Output'} />
        <meta property="og:description" content={description} />
        {pageUrl ? <meta property="og:url" content={pageUrl} /> : null}
        <meta property="og:site_name" content="Creatives Takeover" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={record?.title ?? 'Shared BizMap Output'} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link to="/" className="text-sm font-semibold tracking-[0.18em] text-muted-foreground uppercase dark:text-muted-foreground">
            Creatives Takeover
          </Link>
          <Button asChild onClick={handleCTA} className="gap-2">
            <Link to={`/signup?returnTo=${encodeURIComponent('/bizmap-ai')}&shared_output=${encodeURIComponent(slug ?? '')}`}>
              Build your own
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="rounded-3xl border border-border/60 bg-background/70 px-6 py-5 text-sm text-muted-foreground shadow-sm">
              Loading shared output...
            </div>
          </div>
        ) : !record ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="max-w-lg rounded-5xl border border-border/60 bg-background/80 p-8 text-center shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-muted-foreground">Share link unavailable</p>
              <h1 className="mt-4 text-3xl font-semibold">This BizMap output is no longer public.</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The founder may have disabled the share link or replaced it with a newer version.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-8">
            <section className="rounded-5xl border border-border/60 bg-background/80 p-6 shadow-[0_28px_90px_-48px_rgba(15,23,42,0.45)] backdrop-blur">
              <div className="flex flex-wrap items-center gap-3">
                <SourceBadge sourceType={record.source_type} />
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {record.visibility === 'public' ? (
                    <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Public page</span>
                  ) : 'Unlisted share'}
                </Badge>
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                {record.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
                {record.summary}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={handleCopyLink} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copy link
                </Button>
                <Button variant="outline" onClick={handleLinkedInShare} className="gap-2">
                  <Linkedin className="h-4 w-4" />
                  Share on LinkedIn
                </Button>
                <Button variant="outline" onClick={handleCopyPostText} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Copy share text
                </Button>
              </div>
            </section>

            {isICPSharedSnapshot(record.snapshot) ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-4xl border border-border/60 bg-background/75 p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Recommendation</p>
                  <h2 className="mt-3 text-2xl font-semibold">{record.snapshot.recommendation.primaryIcp}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{record.snapshot.recommendation.whyThisIcp}</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
                      <p className="text-xs text-muted-foreground">Problem to win</p>
                      <p className="mt-2 text-sm font-medium">{record.snapshot.recommendation.problemToWin}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
                      <p className="text-xs text-muted-foreground">Value wedge</p>
                      <p className="mt-2 text-sm font-medium">{record.snapshot.recommendation.valueWedge}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-4xl border border-border/60 bg-background/75 p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Positioning</p>
                  <p className="mt-3 text-lg font-semibold">{record.snapshot.positioning.oneLiner}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{record.snapshot.positioning.valueProposition}</p>
                  <Separator className="my-5" />
                  <div className="space-y-2">
                    {record.snapshot.positioning.differentiators.slice(0, 4).map((item, index) => (
                      <p key={`${item}-${index}`} className="text-sm text-muted-foreground">{item}</p>
                    ))}
                  </div>
                </section>

                <section className="rounded-4xl border border-border/60 bg-background/75 p-6 shadow-sm lg:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Validation experiments</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {record.snapshot.validationPlan.experiments.slice(0, 4).map((experiment, index) => (
                      <div key={`${experiment.hypothesis}-${index}`} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{experiment.priority} priority</p>
                        <p className="mt-2 text-sm font-semibold">{experiment.hypothesis}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{experiment.test}</p>
                        <p className="mt-3 text-xs text-muted-foreground">Success signal: {experiment.successSignal}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {isPMFSharedSnapshot(record.snapshot) ? (
              <div className="space-y-6">
                <section className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-3xl border border-border/60 bg-background/75 p-5 shadow-sm md:col-span-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">PMF score</p>
                    <p className="mt-3 text-4xl font-semibold">{record.snapshot.overallScore}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{record.snapshot.verdictLabel}</p>
                  </div>
                  <div className="rounded-3xl border border-border/60 bg-background/75 p-5 shadow-sm md:col-span-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Summary insight</p>
                    <p className="mt-3 text-base leading-relaxed text-muted-foreground">{record.snapshot.summaryInsight}</p>
                    {record.snapshot.nextExperiment ? (
                      <p className="mt-4 text-sm font-medium">Next experiment: {record.snapshot.nextExperiment}</p>
                    ) : null}
                  </div>
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="rounded-4xl border border-border/60 bg-background/75 p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Strongest signals</p>
                    <div className="mt-4 space-y-2">
                      {record.snapshot.buyingSignals.slice(0, 5).map((item, index) => (
                        <p key={`${item}-${index}`} className="text-sm text-muted-foreground">{item}</p>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-4xl border border-border/60 bg-background/75 p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Missing proof</p>
                    <div className="mt-4 space-y-2">
                      {record.snapshot.gaps.slice(0, 5).map((item, index) => (
                        <p key={`${item}-${index}`} className="text-sm text-muted-foreground">{item}</p>
                      ))}
                    </div>
                  </section>
                </div>

                <section className="rounded-4xl border border-border/60 bg-background/75 p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Recommended next steps</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {record.snapshot.recommendations.slice(0, 4).map((item, index) => (
                      <div key={`${item.title}-${index}`} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.priority}</p>
                        <p className="mt-2 text-sm font-semibold">{item.title}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{item.action}</p>
                        <p className="mt-3 text-xs text-muted-foreground">{item.timeframe}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            {isGTMSharedSnapshot(record.snapshot) ? (
              <div className="space-y-6">
                <section className="rounded-4xl border border-border/60 bg-background/75 p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Strategy summary</p>
                  <h2 className="mt-3 text-2xl font-semibold">{record.snapshot.planTitle}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{record.snapshot.summaryInsight}</p>
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                  <section className="rounded-4xl border border-border/60 bg-background/75 p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Positioning</p>
                    <p className="mt-3 text-sm font-semibold">{record.snapshot.positioning.positioningStatement}</p>
                    <p className="mt-3 text-sm text-muted-foreground">{record.snapshot.positioning.uniqueValueProposition}</p>
                    <div className="mt-4 space-y-2">
                      {record.snapshot.positioning.keyDifferentiators.slice(0, 4).map((item, index) => (
                        <p key={`${item}-${index}`} className="text-sm text-muted-foreground">{item}</p>
                      ))}
                    </div>
                  </section>
                  <section className="rounded-4xl border border-border/60 bg-background/75 p-6 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Messaging</p>
                    <p className="mt-3 text-lg font-semibold">{record.snapshot.messaging.headline}</p>
                    <p className="mt-3 text-sm text-muted-foreground">{record.snapshot.messaging.hookLine}</p>
                    <p className="mt-3 text-sm font-medium">CTA: {record.snapshot.messaging.ctaCopy}</p>
                  </section>
                </div>

                <section className="rounded-4xl border border-border/60 bg-background/75 p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Recommended channels</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {record.snapshot.channels.slice(0, 4).map((channel, index) => (
                      <div key={`${channel.channel}-${index}`} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{channel.channel}</p>
                          <Badge variant="outline">{channel.fitScore}/10 fit</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{channel.fitReason}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Week one</p>
                        <div className="mt-2 space-y-1">
                          {channel.weekOneActions.slice(0, 3).map((item, itemIndex) => (
                            <p key={`${item}-${itemIndex}`} className="text-sm text-muted-foreground">{item}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            <section className="rounded-5xl border border-border/60 bg-slate-950 px-6 py-8 text-white shadow-sm dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-info">Build your own</p>
              <h2 className="mt-3 text-2xl font-semibold">Turn your idea into a real founder output.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Creatives Takeover helps founders generate ICPs, validation reports, GTM strategies, and the next action to move through BizMap AI with real momentum.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild onClick={handleCTA} className="gap-2 bg-white text-foreground hover:bg-muted">
                  <Link to={`/signup?returnTo=${encodeURIComponent('/bizmap-ai')}&shared_output=${encodeURIComponent(record.slug)}`}>
                    Start free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10 hover:text-white">
                  <Link to="/bizmap-ai">Explore BizMap AI</Link>
                </Button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Sticky conversion bar — visible to viewers who haven't signed up */}
      {record && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-md px-4 py-3">
          <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground hidden sm:block">
              Build your own plan in 5 minutes — free.
            </p>
            <Button asChild onClick={handleCTA} className="gap-2 rounded-full px-6 ml-auto shrink-0">
              <Link to={`/signup?returnTo=${encodeURIComponent('/bizmap-ai')}&shared_output=${encodeURIComponent(record.slug)}`}>
                Start free — no credit card
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
