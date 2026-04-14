import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SEO, { createBreadcrumbSchema, createFAQSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PageFAQSection from '@/components/seo/PageFAQSection';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import WaitlistEditor, { type WaitlistEditorInitialSeed } from '@/components/waitlist/WaitlistEditor';
import WaitlistMakerWallpaper from '@/components/wallpapers/WaitlistMakerWallpaper';
import WaitlistModeSelect from '@/components/waitlist/WaitlistModeSelect';
import WaitlistSmartHydrate from '@/components/waitlist/WaitlistSmartHydrate';
import { getPublicTabConfig } from '@/config/publicTabVisibility';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Screen = 'mode_select' | 'smart_hydrate' | 'editor';

interface LatestIcpSummary {
  draftId: string;
  personaName: string | null;
}

export default function WaitlistMakerPage() {
  const { user, loading: authLoading } = useAuth();
  const publicTab = getPublicTabConfig('/waitlist');
  const [searchParams, setSearchParams] = useSearchParams();

  const icpParam = searchParams.get('icp');
  const skipParam = searchParams.get('skipModeSelect') === '1';

  const [screen, setScreen] = useState<Screen>(skipParam ? 'editor' : 'mode_select');
  const [seed, setSeed] = useState<WaitlistEditorInitialSeed | null>(null);
  const [latestIcp, setLatestIcp] = useState<LatestIcpSummary | null>(null);
  const [latestIcpLoading, setLatestIcpLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLatestIcp(null);
      return;
    }

    let active = true;
    const loadLatestIcp = async () => {
      setLatestIcpLoading(true);
      const { data } = await supabase
        .from('icp_analysis_results')
        .select('id, target_audience')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;
      if (data) {
        setLatestIcp({
          draftId: (data as { id: string }).id,
          personaName: (data as { target_audience: string | null }).target_audience ?? null,
        });
      } else {
        setLatestIcp(null);
      }
      setLatestIcpLoading(false);
    };

    void loadLatestIcp();
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (icpParam && user) {
      setScreen('smart_hydrate');
    }
  }, [icpParam, user]);

  const hasCompletedIcp = Boolean(icpParam) || Boolean(latestIcp?.draftId);
  const activeIcpDraftId = icpParam || latestIcp?.draftId || null;

  const handleChooseManual = () => {
    setSeed(null);
    setScreen('editor');
    if (searchParams.has('icp')) {
      const next = new URLSearchParams(searchParams);
      next.delete('icp');
      setSearchParams(next, { replace: true });
    }
  };

  const handleChooseIcpPowered = () => {
    if (!activeIcpDraftId) return;
    if (!icpParam) {
      const next = new URLSearchParams(searchParams);
      next.set('icp', activeIcpDraftId);
      setSearchParams(next, { replace: true });
    }
    setScreen('smart_hydrate');
  };

  const handleSmartHydrateCancel = () => {
    setSeed(null);
    setScreen('mode_select');
    if (searchParams.has('icp')) {
      const next = new URLSearchParams(searchParams);
      next.delete('icp');
      setSearchParams(next, { replace: true });
    }
  };

  const faqs = useMemo(
    () => [
      {
        question: 'Why should founders build a waitlist before an MVP?',
        answer:
          'A waitlist is a lightweight way to test demand before you build. If people will not sign up for the idea, that is an important signal to catch early.',
      },
      {
        question: 'What should a startup waitlist page include?',
        answer:
          'It should clearly explain the problem, the offer, who it is for, and why someone should sign up now instead of waiting.',
      },
      {
        question: 'Can a waitlist page help with investor conversations?',
        answer:
          'Yes. Even early signup interest can strengthen your story by showing that real people responded to the positioning and offer.',
      },
    ],
    [],
  );

  const structuredData = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Waitlist Maker',
        description: 'Create and publish your waitlist page to validate demand before building.',
        url: 'https://creatives-takeover.com/waitlist',
      },
      createFAQSchema(faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'BizMap AI', url: '/bizmap-ai' },
        { name: 'Waitlist Maker', url: '/waitlist' },
      ]),
    ],
    [faqs],
  );

  const editorNode = user ? (
    <WaitlistEditor initialSeed={seed} />
  ) : (
    publicTab && (
      <PreviewModeWrapper
        featureName={publicTab.featureName}
        description={publicTab.description || ''}
        showPricingCta={publicTab.showPricingCta}
      >
        <WaitlistEditor initialSeed={seed} />
      </PreviewModeWrapper>
    )
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SEO
        title="Waitlist Maker - Creatives Takeover"
        description="Build your Stage II waitlist page and capture demand signals before development."
        keywords="waitlist page, demand validation, startup prototype"
        url="/waitlist"
        structuredData={structuredData}
      />
      <WaitlistMakerWallpaper />
      <div className="relative z-10">
        <Navigation />

        <main className="px-4 pt-28 pb-16 md:pt-32 md:pb-20 lg:pt-36">
          <div className="container mx-auto max-w-[1580px] space-y-8">
            <div className="mx-auto max-w-4xl space-y-4 px-2 text-center">
              <h1 className="pb-2 text-center font-bold leading-[0.95] text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
                <span className="takeover-gradient creatives-font">Waitlist Maker</span>
              </h1>
                <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                  Two paths to a live, founder-grade waitlist page in under 5 minutes.
                </p>
            </div>

            {screen === 'mode_select' && (
              <WaitlistModeSelect
                hasCompletedIcp={hasCompletedIcp}
                icpPersonaName={latestIcp?.personaName ?? null}
                icpCtaLoading={latestIcpLoading}
                onChooseIcpPowered={handleChooseIcpPowered}
                onChooseManual={handleChooseManual}
              />
            )}

            {screen === 'smart_hydrate' && activeIcpDraftId && user && (
              <WaitlistSmartHydrate
                draftId={activeIcpDraftId}
                userId={user.id}
                onReady={(result) => {
                  setSeed({
                    productName: result.productName,
                    content: result.content,
                    source: 'icp',
                    icpDraftId: activeIcpDraftId,
                  });
                  setScreen('editor');
                }}
                onCancel={handleSmartHydrateCancel}
              />
            )}

            {screen === 'smart_hydrate' && (!activeIcpDraftId || !user) && (
              <WaitlistModeSelect
                hasCompletedIcp={false}
                onChooseIcpPowered={() => setScreen('mode_select')}
                onChooseManual={handleChooseManual}
              />
            )}

            {screen === 'editor' && editorNode}

            <div className="mx-auto mt-10 max-w-5xl space-y-8 px-2">
              <PageFAQSection title="FAQ" description="Design your landing page, show what you have to offer, and validate your idea before building." faqs={faqs} />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
