import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Users, AlertTriangle, Megaphone, BarChart3, FileText, Loader2, Sparkles, ArrowRight, BookmarkCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useActivationJourney } from '@/hooks/useActivationJourney';
import { supabase } from '@/integrations/supabase/client';
import {
  captureEvent,
  trackActivationCompleted,
  trackICPBuilderCompleted,
  trackICPBuilderStarted,
} from '@/lib/analytics';
import { getIcpDraftStorageKey } from '@/lib/icpDraftStorage';
import { reportAppError } from '@/lib/errorReporting';
import { consumeStoredIcpSeed, normalizeIcpSeed } from '@/lib/icpSeed';
import { markFirstArtifactCreated, sendRetentionEmail } from '@/lib/retentionSystem';
import ICPInputForm, { type ICPInputFormData } from './ICPInputForm';
import ICPNicheProfile from './ICPNicheProfile';
import ICPPainPoints from './ICPPainPoints';
import ICPPositioning from './ICPPositioning';
import ICPNicheScore from './ICPNicheScore';
import {
  buildIcpBusinessDescription,
  getIcpFieldLabel,
  icpInputFormSchema,
  type IcpInputSchema,
} from '@/lib/icpBuilderSchema';

interface ICPAnalysis {
  nicheScore: {
    overall: number;
    verdict: 'Highly Viable' | 'Promising' | 'Needs Refinement';
    subScores: {
      marketSize: number;
      painIntensity: number;
      accessibility: number;
      competitiveGap: number;
    };
    reasoning: string;
  };
  nicheProfile: {
    nicheName: string;
    nicheDescription: string;
    demographics: {
      age: string;
      gender: string;
      location: string;
      income: string;
      education: string;
      occupation: string;
    };
    psychographics: {
      values: string[];
      interests: string[];
      behaviors: string[];
      lifestyle: string;
      attitudes: string;
    };
    buyingBehavior: {
      decisionProcess: string;
      budgetRange: string;
      purchaseFrequency: string;
      triggers: string[];
    };
    whereToFindThem: {
      onlineChannels: string[];
      offlineChannels: string[];
      communities: string[];
      influencers: string[];
    };
    nicheSize: string;
    growthTrend: string;
  };
  painPoints: Array<{
    painPoint: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    frequency: string;
    currentSolution: string;
    gapInCurrentSolution: string;
    opportunityScore: number;
  }>;
  positioningStrategy: {
    positioningStatement: string;
    uniqueValueProposition: string;
    keyDifferentiators: string[];
    messagingFramework: {
      headline: string;
      subheadline: string;
      keyMessages: string[];
      toneOfVoice: string;
    };
    competitivePositioning: Array<{
      competitor: string;
      theirPositioning: string;
      yourAdvantage: string;
      differentiationAngle: string;
    }>;
    brandPersonality: string[];
  };
  actionPlan: Array<{
    priority: 'High' | 'Medium' | 'Low';
    action: string;
    description: string;
    channel: string;
  }>;
}

interface ICPQuickstartResult {
  recommendedICP: string;
  topPainPoint: string;
  reasonToWin: string;
  nextStep: string;
}

const ICP_RESULTS_TABLE = 'icp_analysis_results';
const ICP_ANALYSIS_TIMEOUT_MS = 45000;
const ICP_QUICKSTART_TIMEOUT_MS = 25000;
const ICP_QUICKSTART_STORAGE_KEY = 'icp_quickstart_state';

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutHandle: number | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = window.setTimeout(() => {
      reject(new Error(`ICP analysis timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle !== null) {
      window.clearTimeout(timeoutHandle);
    }
  }
};

const getErrorCode = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('timed out')) return 'timeout';
  if (message.includes('failed to fetch') || message.includes('network')) return 'network_error';
  if (message.includes('save') && message.includes('failed')) return 'save_failed';
  if (message.includes('validation')) return 'validation_failed';

  return 'unknown_error';
};

const readQuickstartState = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(ICP_QUICKSTART_STORAGE_KEY);
    return raw ? JSON.parse(raw) as {
      prompt?: string;
      result?: ICPQuickstartResult | null;
    } : null;
  } catch (error) {
    console.error('Failed to restore ICP quickstart state', error);
    return null;
  }
};

const clearQuickstartState = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ICP_QUICKSTART_STORAGE_KEY);
};

const ICPBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshBalance } = useCredits();
  const { handleCreditError } = useCreditActions();
  const { refreshActivation } = useActivationJourney('stage_i');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ICPAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState('input');
  const [quickstartPrompt, setQuickstartPrompt] = useState('');
  const [quickstartResult, setQuickstartResult] = useState<ICPQuickstartResult | null>(null);
  const [isQuickstartLoading, setIsQuickstartLoading] = useState(false);
  const [showExpandedBuilder, setShowExpandedBuilder] = useState(false);
  const [expandedFormKey, setExpandedFormKey] = useState(0);
  const [expandedInitialStep, setExpandedInitialStep] = useState(0);
  const [restoredAnalysisLabel, setRestoredAnalysisLabel] = useState<string | null>(null);

  useEffect(() => {
    const restoredState = readQuickstartState();
    if (!restoredState) return;

    setQuickstartPrompt(restoredState.prompt || '');
    setQuickstartResult(restoredState.result || null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const seedFromUrl = normalizeIcpSeed(searchParams.get('seed'));
    const storedSeed = normalizeIcpSeed(window.sessionStorage.getItem('ct_icp_seed'));
    const effectiveSeed = seedFromUrl || storedSeed;

    if (!effectiveSeed) {
      return;
    }

    const draftStorageKey = getIcpDraftStorageKey(user?.id);
    const existingDraft = window.localStorage.getItem(draftStorageKey);
    if (existingDraft) {
      return;
    }

    setQuickstartPrompt(effectiveSeed);
    setQuickstartResult(null);
    setShowExpandedBuilder(true);
    setExpandedInitialStep(1);
    setExpandedFormKey((previous) => previous + 1);
    trackActivationCompleted({ artifact: 'icp_seed_prefilled' });
    consumeStoredIcpSeed();

    if (seedFromUrl) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('seed');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!quickstartPrompt.trim() && !quickstartResult) {
      clearQuickstartState();
      return;
    }

    window.localStorage.setItem(ICP_QUICKSTART_STORAGE_KEY, JSON.stringify({
      prompt: quickstartPrompt,
      result: quickstartResult,
    }));
  }, [quickstartPrompt, quickstartResult]);

  useEffect(() => {
    if (!user || analysis) return;

    let cancelled = false;

    const loadLatestAnalysis = async () => {
      try {
        const { data, error } = await supabase
          .from(ICP_RESULTS_TABLE)
          .select('id, target_audience, analysis_data, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !data || cancelled) {
          if (error) {
            console.error('Failed to restore latest ICP analysis', error);
          }
          return;
        }

        const restoredAnalysis = (data as { analysis_data?: ICPAnalysis | null; target_audience?: string | null }).analysis_data;
        if (!restoredAnalysis) return;

        // FIX(retention): /icp-builder — signed-in users now reopen their latest saved ICP result instead of landing on an empty builder every visit.
        setAnalysis(restoredAnalysis);
        setRestoredAnalysisLabel(
          (data as { target_audience?: string | null }).target_audience
            ? `Latest saved ICP: ${(data as { target_audience?: string | null }).target_audience}`
            : 'Latest saved ICP restored',
        );
      } catch (error) {
        console.error('Failed to load latest ICP analysis', error);
      }
    };

    void loadLatestAnalysis();

    return () => {
      cancelled = true;
    };
  }, [analysis, user]);

  const expandedInitialData = useMemo<Partial<ICPInputFormData>>(() => ({
    problemStatement: quickstartPrompt,
    targetAudience: quickstartResult?.recommendedICP || '',
    currentBehavior: quickstartResult?.topPainPoint ? `Current pain/workaround: ${quickstartResult.topPainPoint}` : '',
    solutionDifferentiator: quickstartResult?.reasonToWin || '',
    marketTiming: quickstartResult?.nextStep || '',
  }), [quickstartPrompt, quickstartResult]);

  const persistIcpFallback = async (
    validatedFormData: IcpInputSchema,
    nextAnalysis: ICPAnalysis,
    businessDescription: string,
  ) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from(ICP_RESULTS_TABLE)
      .insert({
        user_id: user.id,
        business_description: businessDescription,
        target_audience: validatedFormData.targetAudience,
        industry: validatedFormData.industry || null,
        niche_score: nextAnalysis.nicheScore?.overall ?? null,
        verdict: nextAnalysis.nicheScore?.verdict ?? null,
        analysis_data: nextAnalysis,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Save failed after analysis: ${error.message}`);
    }

    return (data as { id?: string } | null)?.id ?? null;
  };

  const handleQuickstart = async () => {
    const prompt = quickstartPrompt.trim();
    if (prompt.length < 20) {
      toast({
        title: 'Add a bit more detail',
        description: 'Describe the product and who you think it is for in one short paragraph.',
        variant: 'destructive',
      });
      return;
    }

    setIsQuickstartLoading(true);
    try {
      captureEvent('icp_quickstart_started', {
        page_path: '/icp-builder',
        isAuthenticated: Boolean(user),
      });

      const { data, error } = await withTimeout(
        supabase.functions.invoke('icp-analyzer', {
          body: {
            businessDescription: prompt,
            quickstart: true,
          },
        }),
        ICP_QUICKSTART_TIMEOUT_MS,
      );

      if (error) {
        throw error;
      }

      const result = data?.quickstartResult as ICPQuickstartResult | undefined;
      if (!data?.success || !result) {
        throw new Error(data?.error || 'Quickstart failed');
      }

      // FIX(retention): /icp-builder — the builder now delivers a first ICP recommendation from one field before asking for the long-form brief.
      setQuickstartResult(result);
      setShowExpandedBuilder(false);
      captureEvent('icp_quickstart_completed', {
        page_path: '/icp-builder',
        isAuthenticated: Boolean(user),
        recommendedICP: result.recommendedICP,
      });

      toast({
        title: 'Your first ICP is ready',
        description: 'Review the recommendation below, then expand the brief only if you want a richer saved analysis.',
      });
    } catch (error) {
      console.error('ICP quickstart failed', error);
      toast({
        title: 'Quickstart failed',
        description: error instanceof Error ? error.message : 'We could not generate a quick ICP suggestion.',
        variant: 'destructive',
      });
    } finally {
      setIsQuickstartLoading(false);
    }
  };

  const handleExpand = () => {
    if (!quickstartResult) return;

    if (!user) {
      navigate(`/signup?source=icp-quickstart&return=${encodeURIComponent('/icp-builder')}`);
      return;
    }

    captureEvent('icp_expansion_started', {
      page_path: '/icp-builder',
      recommendedICP: quickstartResult.recommendedICP,
    });
    setShowExpandedBuilder(true);
    setExpandedInitialStep(0);
    setExpandedFormKey((prev) => prev + 1);
    setActiveTab('input');
  };

  const handleSaveClick = async (formData: ICPInputFormData) => {
    const attemptStartedAt = Date.now();

    if (!user) {
      captureEvent('icp_profile_save_failed', {
        reason: 'unauthenticated',
        page_path: '/icp-builder',
      });
      toast({
        title: "Authentication Required",
        description: "Sign in to save this ICP result to your dashboard.",
        variant: "destructive",
      });
      navigate(`/signup?source=icp-save&return=${encodeURIComponent('/icp-builder')}`);
      return;
    }

    if (isAnalyzing) {
      return;
    }

    try {
      const validationResult = icpInputFormSchema.safeParse(formData);

      if (!validationResult.success) {
        const missingFields = validationResult.error.issues.map((issue) => {
          const field = issue.path[0];
          return typeof field === 'string' ? getIcpFieldLabel(field as keyof IcpInputSchema) : 'unknown field';
        });

        captureEvent('icp_profile_save_failed', {
          reason: 'validation_failed',
          missingFields,
          issueCount: validationResult.error.issues.length,
          page_path: '/icp-builder',
        });

        toast({
          title: 'Complete the required inputs',
          description: `Please fix: ${Array.from(new Set(missingFields)).join(', ')}.`,
          variant: 'destructive',
        });
        setActiveTab('input');
        return;
      }

      setIsAnalyzing(true);
      trackICPBuilderStarted({ page_path: '/icp-builder' });
      captureEvent('icp_profile_save_attempted', {
        page_path: '/icp-builder',
      });

      const validatedFormData = validationResult.data;
      const businessDescription = buildIcpBusinessDescription(validatedFormData);
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `icp_${user.id}_${Date.now()}`;

      const { data, error } = await withTimeout(
        supabase.functions.invoke('icp-analyzer', {
          body: {
            businessDescription,
            targetAudience: validatedFormData.targetAudience,
            industry: validatedFormData.industry || undefined,
            competitors: validatedFormData.mainCompetitors || undefined,
            unfairAdvantage: validatedFormData.founderEdge || undefined,
          },
          headers: {
            'idempotency-key': idempotencyKey,
          },
        }),
        ICP_ANALYSIS_TIMEOUT_MS,
      );

      if (error) {
        if (handleCreditError(error, data, 'ICP_ANALYSIS', { featureName: 'ICP Builder' })) {
          return;
        }
        throw error;
      }

      if (data?.creditError) {
        if (handleCreditError(null, data, 'ICP_ANALYSIS', { featureName: 'ICP Builder' })) {
          return;
        }
      }

      if (data?.success && data?.analysis) {
        let analysisId = data.analysisId ?? null;

        if (!analysisId) {
          analysisId = await persistIcpFallback(validatedFormData, data.analysis, businessDescription);
        }

        if (!analysisId) {
          throw new Error('Save failed after analysis: the ICP result did not return an analysis ID.');
        }

        setAnalysis(data.analysis);
        setActiveTab('profile');
        clearQuickstartState();

        await markFirstArtifactCreated({
          userId: user.id,
          artifactType: 'icp_analysis',
          artifactId: analysisId,
          label: `ICP: ${validatedFormData.targetAudience}`,
          resumeUrl: '/icp-builder',
          source: 'icp_builder',
        });

        captureEvent('icp_profile_saved', {
          analysisId,
          timeToSaveMs: Date.now() - attemptStartedAt,
          nicheScore: data.analysis.nicheScore?.overall,
          verdict: data.analysis.nicheScore?.verdict,
          page_path: '/icp-builder',
        });
        captureEvent('icp_saved', {
          analysisId,
          resumeUrl: '/icp-builder',
          page_path: '/icp-builder',
        });
        captureEvent('first_artifact_created', {
          artifactType: 'icp_analysis',
          artifactId: analysisId,
          resumeUrl: '/icp-builder',
        });
        trackICPBuilderCompleted({
          analysisId,
          timeToSaveMs: Date.now() - attemptStartedAt,
          nicheScore: data.analysis.nicheScore?.overall,
          verdict: data.analysis.nicheScore?.verdict,
          page_path: '/icp-builder',
        });

        if (user.email) {
          await sendRetentionEmail({
            userId: user.id,
            email: user.email,
            fullName: user.user_metadata?.full_name ?? null,
            sequence: 'activation_day0',
            ctaUrl: '/icp-builder',
            ctaLabel: 'Open ICP Builder',
            contextHeadline: 'Your ICP result is waiting.',
            contextBody: 'Come back to refine the segment, pressure-test the pain point, or move straight into validation while the context is still fresh.',
          });
        }

        toast({
          title: "ICP Analysis Complete!",
          description: `Your niche viability score is ${data.analysis.nicheScore?.overall || 'N/A'}/100 - ${data.analysis.nicheScore?.verdict || 'N/A'}.`,
        });
        await refreshBalance();
        await refreshActivation();
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (error) {
      const errorCode = getErrorCode(error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze ICP. Please try again.';

      reportAppError(
        error instanceof Error ? error : new Error(String(error)),
        'window_error',
        {
          feature: 'icp_builder',
          action: 'save_profile',
          errorCode,
          pagePath: '/icp-builder',
        },
      );
      captureEvent('icp_profile_save_failed', {
        reason: errorCode,
        message: errorMessage,
        timeToFailureMs: Date.now() - attemptStartedAt,
        page_path: '/icp-builder',
      });
      captureEvent('icp_builder_completed', {
        success: false,
        failureReason: errorCode,
        message: errorMessage,
        timeToFailureMs: Date.now() - attemptStartedAt,
        page_path: '/icp-builder',
      });
      console.error('Error analyzing ICP:', error);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const EmptyState = ({ message }: { message: string }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
        <p className="text-muted-foreground mb-4 max-w-md">{message}</p>
        <Button onClick={() => setActiveTab('input')}>
          Go to ICP Quickstart
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            ICP Builder
          </CardTitle>
          <CardDescription>
            Start with one sentence, get a first ICP recommendation fast, and only expand the brief once the value is obvious.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="adaptive-tabs grid w-full grid-cols-5">
              <TabsTrigger value="input">
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Quickstart</span>
                <span className="sm:hidden">Start</span>
              </TabsTrigger>
              <TabsTrigger value="profile">
                <Users className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Niche Profile</span>
                <span className="sm:hidden">Niche</span>
              </TabsTrigger>
              <TabsTrigger value="painpoints">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Pain Points</span>
                <span className="sm:hidden">Pains</span>
              </TabsTrigger>
              <TabsTrigger value="positioning">
                <Megaphone className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Positioning</span>
                <span className="sm:hidden">Position</span>
              </TabsTrigger>
              <TabsTrigger value="report">
                <BarChart3 className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Full Report</span>
                <span className="sm:hidden">Report</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="mt-6 space-y-6">
              {restoredAnalysisLabel ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Continue where you left off</p>
                      <p className="mt-1 text-base font-semibold">{restoredAnalysisLabel}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Your latest saved ICP is already loaded in the result tabs.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setActiveTab('profile')}>
                      Open saved ICP
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Phase 1 · Quickstart</p>
                    <h3 className="text-2xl font-semibold">Describe the product you want to build and who you think it is for.</h3>
                    <p className="text-sm text-muted-foreground">
                      Start anonymously if you want. Sign in only when you decide this ICP is worth saving.
                    </p>
                  </div>

                  <textarea
                    value={quickstartPrompt}
                    onChange={(event) => setQuickstartPrompt(event.target.value)}
                    placeholder="Example: AI copilot for boutique marketing agencies that turns client briefs into launch-ready campaign plans so small teams can ship faster without hiring extra strategists."
                    className="min-h-[180px] w-full rounded-2xl border border-border/60 bg-background/80 px-4 py-4 text-sm outline-none ring-0 transition-colors focus:border-primary"
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button type="button" size="lg" onClick={handleQuickstart} disabled={isQuickstartLoading}>
                      {isQuickstartLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating first ICP...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Get my first ICP
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      One field. One click. Fast result first.
                    </p>
                  </div>

                  {quickstartResult ? (
                    <Card className="border-primary/20 bg-background/90 shadow-sm">
                      <CardContent className="space-y-5 pt-6">
                        <div className="flex items-start gap-3">
                          <BookmarkCheck className="mt-0.5 h-5 w-5 text-primary" />
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Phase 1 result</p>
                            <h4 className="text-xl font-semibold">Your first ICP recommendation</h4>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recommended ICP</p>
                            <p className="mt-2 text-sm font-medium leading-6">{quickstartResult.recommendedICP}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Top pain point</p>
                            <p className="mt-2 text-sm font-medium leading-6">{quickstartResult.topPainPoint}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Why this segment is promising</p>
                            <p className="mt-2 text-sm font-medium leading-6">{quickstartResult.reasonToWin}</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Best next step</p>
                            <p className="mt-2 text-sm font-medium leading-6">{quickstartResult.nextStep}</p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <Button type="button" size="lg" onClick={handleExpand}>
                            {user ? 'Expand and save full ICP' : 'Save this result'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            onClick={() => {
                              setShowExpandedBuilder(false);
                              setQuickstartResult(null);
                            }}
                          >
                            Try a different idea
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </CardContent>
              </Card>

              {showExpandedBuilder ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Phase 2 · Expanded brief</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Refine the segment, current behavior, and differentiator so the saved analysis becomes reusable across the rest of the platform.
                    </p>
                  </div>
                  <ICPInputForm
                    key={expandedFormKey}
                    initialData={expandedInitialData}
                    initialStep={expandedInitialStep}
                    onSubmit={handleSaveClick}
                    isSubmitting={isAnalyzing}
                  />
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="profile" className="mt-6">
              {analysis?.nicheProfile ? (
                <ICPNicheProfile profile={analysis.nicheProfile} />
              ) : (
                <EmptyState message="Start with ICP Quickstart to get a first recommendation, then save the expanded analysis to unlock the full niche profile." />
              )}
            </TabsContent>

            <TabsContent value="painpoints" className="mt-6">
              {analysis?.painPoints ? (
                <ICPPainPoints painPoints={analysis.painPoints} />
              ) : (
                <EmptyState message="Save the expanded ICP analysis to see pain points and the current workaround landscape." />
              )}
            </TabsContent>

            <TabsContent value="positioning" className="mt-6">
              {analysis?.positioningStrategy ? (
                <ICPPositioning positioning={analysis.positioningStrategy} />
              ) : (
                <EmptyState message="Save the expanded ICP analysis to unlock your positioning strategy and messaging angle." />
              )}
            </TabsContent>

            <TabsContent value="report" className="mt-6">
              {analysis?.nicheScore ? (
                <ICPNicheScore
                  score={analysis.nicheScore}
                  actionPlan={analysis.actionPlan}
                />
              ) : (
                <EmptyState message="Save the expanded ICP analysis to unlock the full report and action plan." />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ICPBuilder;
