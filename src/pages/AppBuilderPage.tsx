import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Code2, Eye, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import SEO, { createSoftwareApplicationSchema } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { BlurredToolPreview } from '@/components/ui/BlurredToolPreview';
import { MVPBuilder } from '@/components/mvp-builder/MVPBuilder';
import { getPublicTabConfig } from '@/config/publicTabVisibility';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent, trackMVPBuilderOpened, trackToolOpened } from '@/lib/analytics';

export default function AppBuilderPage() {
  const { user } = useAuth();
  const publicTab = getPublicTabConfig('/mvp-builder');
  const { hasAccess, upgradeTarget } = usePlanAccess('mvp_builder');
  const giftAttemptedRef = useRef(false);
  const openedTrackedRef = useRef(false);

  useEffect(() => {
    if (openedTrackedRef.current) return;
    openedTrackedRef.current = true;
    trackMVPBuilderOpened({ is_authenticated: Boolean(user) });
    trackToolOpened('mvp_builder');
  }, [user]);

  // First MVP generation on us: claim the one-time gift (server grants the
  // generation's credit cost). Idempotent server-side; guard the double-mount.
  useEffect(() => {
    if (!user || giftAttemptedRef.current) return;
    giftAttemptedRef.current = true;
    void (async () => {
      try {
        const { data } = await supabase.functions.invoke('claim-mvp-gift', { body: {} });
        if (data?.granted) {
          toast.success(`Your first MVP generation is on us — we added ${data.amount} credits.`);
          captureEvent('mvp_first_generation_gift_granted', { amount: data.amount });
        }
      } catch {
        /* the gift is a nicety; never block the builder */
      }
    })();
  }, [user]);

  const structuredData = [
    createSoftwareApplicationSchema({
      name: 'MVP Builder',
      description: 'AI MVP builder for founders who want to turn product ideas into working prototypes with live preview.',
      url: '/mvp-builder',
      featureList: ['prompt-based app generation', 'live preview', 'iterative code updates'],
    }),
  ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <SEO
        title="AI MVP Builder | Creatives Takeover"
        description="Describe your product, generate a working MVP, and iterate with live preview and code updates inside an AI MVP builder."
        keywords="ai mvp builder, app builder ai, startup prototype builder, mvp generator, prompt to app"
        url="/mvp-builder"
        structuredData={structuredData}
      />
      {!user && publicTab ? (
        <div className="h-full overflow-y-auto">
          {/* Real landing above the fold: visitors previously saw only a blurred,
              non-interactive shell with no explanation of what the tool does. */}
          <section className="mx-auto w-full max-w-3xl px-4 pb-10 pt-16 text-center">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3.5 w-3.5" /> MVP Builder
            </p>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              Describe your idea. Get a working MVP.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
              Type what you want to build and MVP Builder generates a working React app with live
              preview — then iterate with plain-English edits. Your first generation is free.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link
                  to="/signup?source=mvp-builder&return=/mvp-builder"
                  onClick={() => captureEvent('free_tool_signup_gate_cta_clicked', { tool: 'mvp_builder', method: 'landing' })}
                >
                  Build my first MVP free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-2">
              <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/60 p-3 text-sm text-muted-foreground">
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Live preview while you build — no local setup, no boilerplate.
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/60 p-3 text-sm text-muted-foreground">
                <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Real exportable code, refined with plain-English requests.
              </div>
            </div>
          </section>
          <PreviewModeWrapper
            featureName={publicTab.featureName}
            description={publicTab.description || ''}
            showPricingCta={publicTab.showPricingCta}
            analyticsTool="mvp_builder"
          >
            <MVPBuilder />
          </PreviewModeWrapper>
        </div>
      ) : !hasAccess ? (
        <BlurredToolPreview
          featureName="MVP Builder"
          unlockCondition="MVP Builder is available on every plan and uses credits per build action."
          requiredPlan={upgradeTarget}
          locked
        >
          <div />
        </BlurredToolPreview>
      ) : (
        <MVPBuilder />
      )}
    </div>
  );
}
