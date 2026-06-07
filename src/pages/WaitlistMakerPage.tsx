import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import SEO, { createBreadcrumbSchema, createFAQSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PageFAQSection from '@/components/seo/PageFAQSection';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import WaitlistEditor, { type BuilderTab, type WaitlistEditorInitialSeed } from '@/components/waitlist/WaitlistEditor';
import WaitlistMakerWallpaper from '@/components/wallpapers/WaitlistMakerWallpaper';
import WaitlistModeSelect from '@/components/waitlist/WaitlistModeSelect';
import WaitlistSmartHydrate from '@/components/waitlist/WaitlistSmartHydrate';
import { getPublicTabConfig } from '@/config/publicTabVisibility';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { normalizeWaitlistContent, type WaitlistContent } from '@/lib/waitlist';
import { getWaitlistTemplate } from '@/lib/waitlistTemplates';

type Screen = 'mode_select' | 'smart_hydrate' | 'editor';
const LAST_EDITOR_STORAGE_KEY = 'waitlist_builder_last_editor_v1';

function readStoredTemplateDraft(templateId: string): { productName: string; content: WaitlistContent } | null {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(LAST_EDITOR_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { productName?: string; content?: Partial<WaitlistContent> };
    if (!parsed?.content?.templateId || parsed.content.templateId !== templateId) return null;

    return {
      productName: parsed.productName || '',
      content: normalizeWaitlistContent(parsed.content, parsed.productName || 'Your Product'),
    };
  } catch {
    return null;
  }
}

interface LatestIcpSummary {
  draftId: string;
  personaName: string | null;
}

export default function WaitlistMakerPage() {
  const { user, loading: authLoading } = useAuth();
  const publicTab = getPublicTabConfig('/demo-studio/classic');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const icpParam = searchParams.get('icp');
  const templateParam = searchParams.get('template');

  const [screen, setScreen] = useState<Screen>(templateParam ? 'editor' : 'mode_select');
  const [seed, setSeed] = useState<WaitlistEditorInitialSeed | null>(null);
  const [initialEditorTab, setInitialEditorTab] = useState<BuilderTab>('content');
  const [hasEditorSession, setHasEditorSession] = useState(false);
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

  useEffect(() => {
    if (!templateParam) return;
    const storedDraft = readStoredTemplateDraft(templateParam);

    if (storedDraft) {
      setSeed({
        productName: storedDraft.productName,
        content: storedDraft.content,
        source: 'manual',
      });
      setHasEditorSession(true);
      setScreen('editor');
      return;
    }

    const template = getWaitlistTemplate(templateParam as Parameters<typeof getWaitlistTemplate>[0]);
    setSeed({
      productName: '',
      content: normalizeWaitlistContent(template.content, 'Your Product'),
      source: 'manual',
    });
    setHasEditorSession(true);
    setScreen('editor');
  }, [templateParam]);

  const hasCompletedIcp = Boolean(icpParam) || Boolean(latestIcp?.draftId);
  const activeIcpDraftId = icpParam || latestIcp?.draftId || null;

  const handleChooseLaunchKit = () => {
    setSeed({ productName: '', content: {}, source: 'manual' });
    setInitialEditorTab('launchKit');
    setHasEditorSession(true);
    setScreen('editor');
  };

  const handleChooseManual = () => {
    setSeed(null);
    setHasEditorSession(false);
    setInitialEditorTab('content');
    navigate('/demo-studio/classic/templates');
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
        question: 'Why should founders build a waitlist before writing any code?',
        answer:
          "A waitlist page lets you test whether real people are willing to raise their hand for your idea before you invest months building it. If the page converts, you have signal. If it does not, you learn that cheaply and can adjust the positioning or the audience without sunk engineering cost.\n\nThe goal is not to collect a large list. The goal is to find out whether the problem and the offer are framed clearly enough that strangers take action. Even ten signups from people who genuinely match your target customer tells you more than any survey or focus group.\n\nBuilding first and validating later is one of the most common and expensive mistakes early founders make. A waitlist flips that sequence.",
      },
      {
        question: 'What should a strong pre-launch waitlist page include?',
        answer:
          "A strong waitlist page does a few specific things: it names the problem plainly, states clearly who the product is for, explains the core outcome in one or two sentences, and gives someone a concrete reason to sign up now rather than wait.\n\nThe most common mistake is making the page too generic. Broad claims like 'the easiest tool for teams' say nothing to the person reading it. Specific claims like 'built for solo founders managing client work without a CRM' immediately signal whether this is for them or not.\n\nA good page also handles the trust question. That means a founder name, a plausible timeline, and either a social proof signal or a concrete commitment you are making to early signups. Vague pages get low conversion. Specific, honest pages build early community.",
      },
      {
        question: 'Can a waitlist page help with investor conversations?',
        answer:
          "Yes, meaningfully. Investors at the pre-seed and seed stage are trying to assess whether there is genuine demand for what you are building. A waitlist page with real signups is one of the clearest proof points you can show because it demonstrates that people responded to your positioning without being prompted by a personal relationship.\n\nIt also shows that you understand your customer well enough to write copy that resonates. Founders who can explain the problem clearly and attract early interest before a product exists tend to be better at customer development, positioning, and eventually sales.\n\nEven a small list of highly qualified signups — people who clearly match your ICP and signed up unprompted — is a stronger signal than a large but unfiltered list.",
      },
    ],
    [],
  );

  const structuredData = useMemo(
    () => [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Waitlist Builder',
        description: 'Create and publish your waitlist page to validate demand before building.',
        url: 'https://creatives-takeover.com/demo-studio/classic',
      },
      createFAQSchema(faqs),
      createBreadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Demo Studio', url: '/demo-studio' },
        { name: 'Waitlist Builder', url: '/demo-studio/classic' },
      ]),
    ],
    [faqs],
  );

  const backToTemplates = seed?.source === 'manual' && initialEditorTab !== 'launchKit'
    ? () => navigate('/demo-studio/classic/templates')
    : undefined;

  const editorNode = user ? (
    <WaitlistEditor initialSeed={seed} onBackToTemplates={backToTemplates} initialTab={initialEditorTab} />
  ) : (
    publicTab && (
      <PreviewModeWrapper
        featureName={publicTab.featureName}
        description={publicTab.description || ''}
        showPricingCta={publicTab.showPricingCta}
      >
        <WaitlistEditor initialSeed={seed} onBackToTemplates={backToTemplates} initialTab={initialEditorTab} />
      </PreviewModeWrapper>
    )
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SEO
        title="Waitlist Builder - Creatives Takeover"
        description="Build your Stage II waitlist page and capture demand signals before development."
        keywords="waitlist page, demand validation, startup prototype"
        url="/demo-studio/classic"
        structuredData={structuredData}
      />
      <WaitlistMakerWallpaper />
      <div className="relative z-10">
        <Navigation />

        <main className="px-4 pt-28 pb-16 md:pt-32 md:pb-20 lg:pt-36">
          <div className="container mx-auto max-w-[1580px] space-y-8">
            <div className="mx-auto max-w-4xl space-y-4 px-2 text-center">
              <h1 className="pb-2 text-center font-bold leading-[0.95] text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
                <span className="takeover-gradient creatives-font">Waitlist Builder</span>
              </h1>
                <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                  Turn your idea into a landing page that attracts early believers before you write a line of code.
                </p>
                <Link
                  to="/demo-studio"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/20"
                >
                  <Sparkles className="h-4 w-4" />
                  Switch to the new Demo Studio (interactive demo + pitch)
                  <ArrowRight className="h-4 w-4" />
                </Link>
            </div>

            {screen === 'mode_select' && (
              <WaitlistModeSelect
                hasCompletedIcp={hasCompletedIcp}
                icpPersonaName={latestIcp?.personaName ?? null}
                icpCtaLoading={latestIcpLoading}
                onChooseIcpPowered={handleChooseIcpPowered}
                onChooseManual={handleChooseManual}
                onChooseLaunchKit={handleChooseLaunchKit}
                isGuest={!user}
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
                  setHasEditorSession(true);
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
                onChooseLaunchKit={handleChooseLaunchKit}
              />
            )}

            {screen === 'editor' && hasEditorSession && seed ? editorNode : null}

            <div className="mx-auto mt-10 max-w-5xl space-y-8 px-2">
              <PageFAQSection title="FAQ" description="Two paths to a live, founder-grade waitlist page in under 5 minutes." faqs={faqs} />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
