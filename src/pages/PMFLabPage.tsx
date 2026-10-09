import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus } from 'lucide-react';

import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { BlurredToolPreview } from '@/components/ui/BlurredToolPreview';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { ToolPageShell } from '@/components/tool-shell/ToolPageShell';
import { ToolProjectContext } from '@/components/tool-shell/ToolProjectContext';
import { useActiveProjectContext } from '@/hooks/useActiveProjectContext';
import PMFLabWallpaper, { PMFLabChart } from '@/components/wallpapers/PMFLabWallpaper';
import { NextStepCard } from '@/components/tool-shell/NextStepCard';
import { ToolStepper, type ToolStep } from '@/components/tool-shell/ToolStepper';
import { PMFConversationsStep, type PMFIcpInterviewPlanItem } from '@/components/pmf/PMFConversationsStep';
import { PMFSurveyStep, copySurveyLink } from '@/components/pmf/PMFSurveyStep';
import { PMFVerdictStep } from '@/components/pmf/PMFVerdictStep';
import { PMFVerdictSummary } from '@/components/pmf/PMFVerdictSummary';
import PMFReadinessReport from '@/components/pmf/PMFReadinessReport';
import PMFCustomerDiscovery from '@/components/pmf/PMFCustomerDiscovery';
import ConceptRecruitment from '@/components/pmf/ConceptRecruitment';
import PMFOutcomeCapture from '@/components/pmf/PMFOutcomeCapture';
import type { PMFInterviewLeadSeed } from '@/components/pmf/PMFDiscoveryPipeline';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import { usePMFLab } from '@/hooks/usePMFLab';
import { usePMFSurvey } from '@/hooks/usePMFSurvey';
import { usePMFInterviews } from '@/hooks/usePMFInterviews';
import { useCustomerDiscovery } from '@/hooks/useCustomerDiscovery';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useFeatureFlagEnabled } from '@/hooks/usePosthogFeatureFlag';
import { isCompletionChainEnabled } from '@/lib/completionChain';
import { normalizeStoredArtifact } from '@/lib/icpDraftArtifacts';
import { getPublicTabConfig } from '@/config/publicTabVisibility';
import { captureEvent, trackToolOpened } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { ensurePrebuildContext, getPrebuildContext, listPrebuildContexts, type PrebuildValidationContext } from '@/lib/prebuildContext';
import { evidenceCaseLabels } from '@/lib/evidenceCaseLabels';
import { findJourneyHandoff, trackPrebuildLineageEvent } from '@/lib/journeyOutcomes';
import { isPMFPathwayEnvironmentEnabled, PMF_PATHWAY_FEATURE_FLAG } from '@/lib/pmfPathwayRollout';
import { countPmfSignals, formatPmfDecision, getPmfDecision, PMF_SIGNAL_THRESHOLDS } from '@/lib/pmfConfidence';
import { FIRST_READ_INTERVIEWS, getPmfNextStep, getPmfStepStatuses, type PmfStepId } from '@/lib/pmfNextStep';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'PMF Lab',
    description: 'Log customer conversations, ask product users one question, and get a clear verdict on whether to build.',
    url: 'https://creatives-takeover.com/pmf-lab',
  },
];

const PURPOSE = 'Find out whether people want what you are building before you build more of it.';

export default function PMFLabPage() {
  const { user } = useAuth();
  const publicTab = getPublicTabConfig('/pmf-lab');
  const { hasAccess, upgradeTarget } = usePlanAccess('pmf_lab');
  const markToolUsed = useLeanStartupStore(s => s.markToolUsed);
  const pathwayFlag = useFeatureFlagEnabled(PMF_PATHWAY_FEATURE_FLAG);
  const pathwayEnabled = isPMFPathwayEnvironmentEnabled() && pathwayFlag === true;

  const [icpPersonaName, setIcpPersonaName] = useState<string | null>(null);
  const [icpIndustry, setIcpIndustry] = useState<string | null>(null);
  const [icpProblem, setIcpProblem] = useState<string | null>(null);
  const [icpDraftId, setIcpDraftId] = useState<string | null>(null);
  const [icpInterviewPlan, setIcpInterviewPlan] = useState<PMFIcpInterviewPlanItem[] | null>(null);
  const [waitlistProductName, setWaitlistProductName] = useState<string | null>(null);
  const [mode, setMode] = useState<'score' | 'discover'>(
    () => (new URLSearchParams(window.location.search).get('mode') === 'discover' ? 'discover' : 'score'),
  );
  const [interviewLeadSeed, setInterviewLeadSeed] = useState<PMFInterviewLeadSeed | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const outcomeAnalysisId = searchParams.get('outcome');
  const icpParam = searchParams.get('icp');
  const [validationContextId, setValidationContextId] = useState<string | null>(searchParams.get('context'));
  const [originatingHandoffId, setOriginatingHandoffId] = useState<string | null>(searchParams.get('handoff'));
  const [demoProjectId, setDemoProjectId] = useState<string | null>(searchParams.get('project'));
  const [demoId, setDemoId] = useState<string | null>(searchParams.get('demo'));
  const [contexts, setContexts] = useState<PrebuildValidationContext[] | null>(null);
  const [contextStartedAt, setContextStartedAt] = useState<string | null>(null);
  // ?step=interviews is the conversation entry point ICP Builder links to.
  const [activeStep, setActiveStep] = useState<PmfStepId | null>(
    () => (new URLSearchParams(window.location.search).get('step') === 'interviews' ? 'talk' : null),
  );
  const [addRequest, setAddRequest] = useState(0);
  // Which workspace project the evidence case was last chosen for.
  const autoContextForRef = useRef<string | null>(null);
  const projectContext = useActiveProjectContext();
  const projectIcpId = projectContext.outcomes?.icpDraftId ?? null;
  const hubViewedRef = useRef(false);
  const stepPanelRef = useRef<HTMLDivElement | null>(null);

  const selectContext = (context: PrebuildValidationContext) => {
    setValidationContextId(context.id);
    setContextStartedAt(context.created_at);
    const next = new URLSearchParams(searchParams);
    next.set('context', context.id);
    if (context.icp_analysis_id) next.set('icp', context.icp_analysis_id);
    else next.delete('icp');
    setSearchParams(next, { replace: true });
  };

  // A new case is only ever made once at a time: opening the page and a
  // re-render, or a double click, must not leave empty duplicates behind.
  const creatingCaseRef = useRef(false);
  const startNewCase = (label?: string | null) => {
    if (!user || creatingCaseRef.current) return;
    creatingCaseRef.current = true;
    void ensurePrebuildContext({ userId: user.id, explicitlyUnscoped: true, label: label ?? null, sourceTool: 'pmf_lab' })
      .then((context) => {
        setContexts((items) => [context, ...(items ?? [])]);
        selectContext(context);
      })
      .finally(() => { creatingCaseRef.current = false; });
  };
  // Starting another idea separates its evidence from the current one, so it
  // is a deliberate, named step rather than a dropdown option that acts at once.
  const [newIdeaOpen, setNewIdeaOpen] = useState(false);
  const [newIdeaName, setNewIdeaName] = useState('');

  useEffect(() => {
    if (!user) return;
    void listPrebuildContexts(user.id).then(setContexts).catch(() => setContexts([]));
  }, [user]);

  useEffect(() => {
    if (!user || validationContextId || !icpParam) return;
    void ensurePrebuildContext({ userId: user.id, icpAnalysisId: icpParam, sourceTool: 'pmf_lab' })
      .then((context) => selectContext(context));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icpParam, user, validationContextId]);

  // Evidence never mixes across ideas: every interview, survey and score belongs to
  // one case. Open the case for the workspace project's customer profile
  // (creating it if needed), and follow the project when the founder switches.
  // An explicit ?context= link is kept on first open.
  useEffect(() => {
    if (!user || !hasAccess || icpParam || contexts === null || projectContext.isLoading) return;
    const key = projectContext.projectId ?? 'none';
    if (autoContextForRef.current === key) return;
    const firstOpen = autoContextForRef.current === null;
    autoContextForRef.current = key;
    if (firstOpen && validationContextId) return;
    if (projectIcpId) {
      void ensurePrebuildContext({
        userId: user.id,
        icpAnalysisId: projectIcpId,
        label: projectContext.project?.title ?? null,
        sourceTool: 'pmf_lab',
      }).then((context) => {
        setContexts((items) => (items?.some((item) => item.id === context.id) ? items : [context, ...(items ?? [])]));
        selectContext(context);
      }).catch(() => undefined);
      return;
    }
    if (contexts.length > 0) selectContext(contexts[0]);
    else startNewCase(projectContext.project?.title ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contexts, hasAccess, icpParam, user, validationContextId, projectContext.projectId, projectContext.isLoading, projectIcpId]);

  useEffect(() => {
    if (!user || !demoProjectId || demoId) return;
    void (supabase as any).from('demo_studio_demos').select('id')
      .eq('owner_id', user.id).eq('project_id', demoProjectId).eq('status', 'published')
      .order('updated_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }: { data: { id: string } | null }) => setDemoId(data?.id ?? null));
  }, [demoId, demoProjectId, user]);

  useEffect(() => {
    const sourceId = searchParams.get('concept') || demoId;
    if (!validationContextId || !sourceId || originatingHandoffId) return;
    void findJourneyHandoff('pmf_lab', sourceId).then((handoff) => {
      if (!handoff) return;
      setOriginatingHandoffId(handoff.id);
      trackPrebuildLineageEvent('prebuild_handoff_opened', {
        validationContextId, handoffId: handoff.id, sourceTool: 'demo_studio', destinationTool: 'pmf_lab', artifactId: sourceId,
      });
    }).catch(() => undefined);
  }, [demoId, originatingHandoffId, validationContextId, searchParams]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadContext = async () => {
      if (!validationContextId) return;
      const context = await getPrebuildContext(user.id, validationContextId);
      if (!context) {
        setValidationContextId(null);
        return;
      }
      setContextStartedAt(context.created_at);
      const scopedIcpId = icpParam ?? context.icp_analysis_id;
      const icpBase = supabase
        .from('icp_analysis_results')
        .select('id, target_audience, industry, business_description, analysis_data')
        .eq('user_id', user.id);
      const icpQuery = scopedIcpId
        ? icpBase.eq('id', scopedIcpId).maybeSingle()
        : Promise.resolve({ data: null, error: null });

      let demoQuery = (supabase as any)
        .from('demo_studio_projects')
        .select('id, name, updated_at')
        .eq('owner_id', user.id)
        .eq('validation_context_id', validationContextId);
      if (demoProjectId) demoQuery = demoQuery.eq('id', demoProjectId);
      const [icpRes, demoRes] = await Promise.all([
        icpQuery,
        demoQuery.order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (!active) return;

      const icpRow = icpRes.data as {
        id: string;
        target_audience: string | null;
        industry: string | null;
        business_description: string | null;
        analysis_data: unknown;
      } | null;

      setIcpDraftId(icpRow?.id ?? null);
      setIcpIndustry(icpRow?.industry ?? null);
      setIcpProblem(icpRow?.business_description ?? null);
      // The stored artifact names the persona properly; target_audience is the fallback.
      const artifact = icpRow ? normalizeStoredArtifact(icpRow as never).artifact : null;
      setIcpPersonaName(artifact?.draftDocument.customer.personaName?.trim() || icpRow?.target_audience || null);
      const plan = artifact?.draftDocument.decisionBrief?.interviewValidationPlan ?? null;
      setIcpInterviewPlan(plan && plan.length > 0 ? plan : null);

      const demoRow = demoRes.data as { id: string; name: string | null; updated_at: string | null } | null;
      setDemoProjectId(demoRow?.id ?? demoProjectId);
      setWaitlistProductName(demoRow?.name ?? context.label ?? null);
    };
    void loadContext();
    return () => { active = false; };
  }, [user, icpParam, validationContextId, demoProjectId]);

  useEffect(() => {
    markToolUsed('pmf-lab');
    captureEvent('pmf_lab_viewed', { is_authenticated: Boolean(user) });
    trackToolOpened('pmf_lab');
  }, [markToolUsed, user]);

  const {
    survey,
    aggregate: surveyAggregate,
    shareUrl: surveyShareUrl,
    isCreating: isCreatingSurvey,
    createAndPublishSurvey,
  } = usePMFSurvey(validationContextId, originatingHandoffId);

  const scope = validationContextId ? {
    validationContextId,
    pathwayEnabled,
    contextStartedAt: contextStartedAt
      ?? contexts?.find((context) => context.id === validationContextId)?.created_at
      ?? null,
    originatingHandoffId,
    icpAnalysisId: icpDraftId,
    demoProjectId,
    demoId,
    surveyId: survey?.id ?? null,
  } : null;

  const interviewStore = usePMFInterviews(user?.id, validationContextId, originatingHandoffId);

  // Production PMF Lab path: score evidence via pmf-evidence-scorer.
  const {
    phase,
    analysis,
    analysisId,
    isSaving,
    isExporting,
    evidence,
    trend,
    runAnalysis,
    reScore,
    saveReport,
    saveSeanEllis,
    exportReport,
    resetToIntake,
  } = usePMFLab(scope);

  const { discovery, loadDiscovery } = useCustomerDiscovery(validationContextId, originatingHandoffId);
  const customerDiscoverySignals =
    (discovery?.painPoints.length ?? 0) +
    (discovery?.people.length ?? 0) +
    (discovery?.communities.length ?? 0) +
    (discovery?.threads.length ?? 0);

  const interviewCount = interviewStore.interviews.length;
  const surveyResponses = surveyAggregate.total || evidence?.survey_results_count || 0;
  const demoBehaviors = analysis?.demoEvidence
    ? Math.max(analysis.demoEvidence.completions, analysis.demoEvidence.ctaClicks, analysis.demoEvidence.signups)
    : 0;
  const signalCount = countPmfSignals({ interviews: interviewCount, surveyResponses, demoBehaviors });
  const hasResult = Boolean(analysis) || trend.length > 0;
  const progress = { interviewCount, hasSurvey: Boolean(survey), surveyResponses, hasResult };
  const nextStep = getPmfNextStep(progress);
  const statuses = getPmfStepStatuses(progress);
  const shownStep = activeStep ?? nextStep.step;

  const lastScore = trend.length > 0 ? trend[trend.length - 1].score : null;
  const steps: ToolStep<PmfStepId>[] = useMemo(() => [
    {
      id: 'talk',
      label: 'Talk to customers',
      detail: interviewCount >= FIRST_READ_INTERVIEWS ? `${interviewCount} conversations` : `${interviewCount} of ${FIRST_READ_INTERVIEWS} logged`,
      status: statuses.talk,
    },
    {
      id: 'ask',
      label: 'Ask product users',
      detail: survey ? `${surveyResponses} answer${surveyResponses === 1 ? '' : 's'}` : 'Not started',
      status: statuses.ask,
    },
    {
      id: 'verdict',
      label: 'Get your verdict',
      detail: lastScore !== null
        ? `${formatPmfDecision(getPmfDecision(lastScore))}, ${Math.round(lastScore)}/100`
        : `${signalCount} of ${PMF_SIGNAL_THRESHOLDS.decisionGrade} signals`,
      status: statuses.verdict,
    },
  ], [interviewCount, lastScore, signalCount, statuses.ask, statuses.talk, statuses.verdict, survey, surveyResponses]);

  useEffect(() => {
    if (!user || !hasAccess || phase !== 'intake' || mode !== 'score' || hubViewedRef.current) return;
    captureEvent('pmf_evidence_hub_viewed', {
      saved_interviews: interviewCount,
      survey_responses: surveyAggregate.total,
      has_survey: Boolean(survey),
      customer_discovery_signals: customerDiscoverySignals,
      next_step: nextStep.step,
    });
    hubViewedRef.current = true;
  }, [customerDiscoverySignals, hasAccess, interviewCount, mode, nextStep.step, phase, survey, surveyAggregate.total, user]);

  // Keep the per-case Sean Ellis evidence in sync with real survey responses, so the
  // 40% metric, the signal count and the score all reflect verified data.
  useEffect(() => {
    if (surveyAggregate.total > 0) {
      void saveSeanEllis(
        { very: surveyAggregate.very, somewhat: surveyAggregate.somewhat, not: surveyAggregate.not },
        { silent: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyAggregate.total, surveyAggregate.very, surveyAggregate.somewhat, surveyAggregate.not]);

  const showStep = (step: PmfStepId) => {
    setActiveStep(step);
    requestAnimationFrame(() => stepPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const handleCreateSurvey = () => {
    void createAndPublishSurvey({
      productName: waitlistProductName ?? undefined,
      audience: icpPersonaName ?? undefined,
    });
  };

  const runNextStep = () => {
    if (nextStep.step === 'talk') {
      setActiveStep('talk');
      setAddRequest((count) => count + 1);
      return;
    }
    if (nextStep.step === 'ask') {
      showStep('ask');
      if (!survey) handleCreateSurvey();
      else void copySurveyLink(surveyShareUrl);
      return;
    }
    showStep('verdict');
  };

  const handleModeChange = (nextMode: 'score' | 'discover') => {
    if (nextMode === 'score') void loadDiscovery();
    setMode(nextMode);
  };

  const pageStructuredData = [
    ...structuredData,
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'BizMap AI', url: '/bizmap-ai' },
      { name: 'PMF Lab', url: '/pmf-lab' },
    ]),
  ];

  const contextLine = (
    <span>
      {waitlistProductName ? <>Product: <span className="text-foreground">{waitlistProductName}</span>. </> : null}
      {icpPersonaName ? (
        <>Customer: <Link to={icpDraftId ? `/icp/draft/${icpDraftId}` : '/icp-builder'} className="text-foreground underline-offset-4 hover:underline">{icpPersonaName}</Link></>
      ) : (
        <>No customer profile linked. <Link to="/icp-builder" className="text-primary underline-offset-4 hover:underline">Define your customer first</Link></>
      )}
    </span>
  );

  const caseLabels = contexts ? evidenceCaseLabels(contexts) : new Map<string, string>();
  const openNewIdea = () => { setNewIdeaName(''); setNewIdeaOpen(true); };
  // One idea needs no picker: just the way to start another. The picker
  // appears once there is a second idea to switch to.
  const caseSelector = user && hasAccess && contexts && contexts.length > 0 ? (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      {contexts.length > 1 && <label className="flex items-center gap-2">
        Idea
        <select
          value={validationContextId ?? ''}
          onChange={(event) => {
            if (event.target.value === '__new') {
              openNewIdea();
              return;
            }
            const context = contexts.find((item) => item.id === event.target.value);
            if (context) selectContext(context);
          }}
          className="h-9 max-w-56 rounded-md border border-input bg-background px-2 text-sm text-foreground"
        >
          {contexts.map((context) => (
            <option key={context.id} value={context.id}>{caseLabels.get(context.id)}</option>
          ))}
          <option value="__new">Start a new idea…</option>
        </select>
      </label>}
      {contexts.length === 1 && <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={openNewIdea}>
        <Plus className="h-4 w-4" aria-hidden="true" />Start a new idea
      </Button>}
    </div>
  ) : null;

  const currentCaseName = validationContextId ? caseLabels.get(validationContextId) : null;
  const newIdeaDialog = (
    <Dialog open={newIdeaOpen} onOpenChange={setNewIdeaOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!newIdeaName.trim()) return;
          startNewCase(newIdeaName.trim());
          setNewIdeaOpen(false);
        }}>
          <DialogHeader>
            <DialogTitle>Start a new idea</DialogTitle>
            <DialogDescription>
              Only for testing a different idea. Each idea keeps its own conversations, survey and verdict,
              {currentCaseName ? <> so everything you logged stays with <span className="font-medium text-foreground">{currentCaseName}</span>.</> : ' so nothing you logged is moved.'}
              {' '}To add a conversation to the current idea, close this and use Talk to customers.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            <Label htmlFor="pmf-new-idea-name">Name of the new idea</Label>
            <Input id="pmf-new-idea-name" autoFocus maxLength={80} value={newIdeaName}
              onChange={(event) => setNewIdeaName(event.target.value)} placeholder="e.g. Guides for hotel concierges" />
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setNewIdeaOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!newIdeaName.trim()}>Start this idea</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  const renderSignedIn = () => {
    if (!validationContextId) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Opening your idea…
        </div>
      );
    }

    if (mode === 'discover') {
      return (
        <div className="space-y-4">
          <Button type="button" variant="ghost" onClick={() => handleModeChange('score')} className="-ml-3">
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Back to your evidence
          </Button>
          {isCompletionChainEnabled() && (
            <ConceptRecruitment key={validationContextId} contextId={validationContextId} projectId={demoProjectId} audience={icpPersonaName} problem={icpProblem} />
          )}
          <PMFCustomerDiscovery
            defaultProductName={waitlistProductName}
            defaultTargetAudience={icpPersonaName}
            defaultIndustry={icpIndustry}
            defaultProblem={icpProblem}
            onCompleted={() => void loadDiscovery()}
            onLogInterview={(seed) => {
              setInterviewLeadSeed(seed);
              setMode('score');
              setActiveStep('talk');
            }}
          />
        </div>
      );
    }

    if (phase === 'analyzing') {
      return (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          Reading your conversations and survey answers. This usually takes under a minute.
        </div>
      );
    }

    if (phase === 'results' && analysis) {
      return (
        <div className="space-y-6">
          <PMFVerdictSummary
            analysis={analysis}
            analysisId={analysisId}
            validationContextId={validationContextId}
            icpAnalysisId={icpDraftId}
            pathwayEnabled={pathwayEnabled}
            isSaving={isSaving}
            isExporting={isExporting}
            onBackToEvidence={resetToIntake}
            onSave={saveReport}
            onExport={exportReport}
          />
          <DashboardDisclosure title="Full report" summary="Scores by area, every objection and signal, and recommended experiments.">
            <PMFReadinessReport
              analysis={analysis}
              analysisId={analysisId}
              isSaving={isSaving}
              isExporting={isExporting}
              evidence={evidence}
              trend={trend}
              onSave={saveReport}
              onExport={exportReport}
              onReanalyze={resetToIntake}
              onReScore={reScore}
              onFindCustomers={() => setMode('discover')}
              surveyAggregate={surveyAggregate}
              customerDiscoverySignalCount={customerDiscoverySignals}
              validationContextId={validationContextId}
              icpAnalysisId={icpDraftId}
              pathwayEnabled={pathwayEnabled}
            />
          </DashboardDisclosure>
        </div>
      );
    }

    // On the verdict step the form's own button is the action, so the card is not repeated.
    const showNextStepCard = !(shownStep === 'verdict' && nextStep.step === 'verdict');

    return (
      <>
        {outcomeAnalysisId && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Tell us what happened with your idea</h2>
            <PMFOutcomeCapture analysisId={outcomeAnalysisId} />
          </div>
        )}

        {showNextStepCard && (
          <NextStepCard
            title={nextStep.title}
            reason={nextStep.reason}
            cta={nextStep.step === 'ask' && isCreatingSurvey ? 'Creating survey…' : nextStep.cta}
            disabled={nextStep.step === 'ask' && isCreatingSurvey}
            onAction={runNextStep}
            secondary={nextStep.step === 'talk' ? (
              <Button type="button" variant="link" className="px-0" onClick={() => handleModeChange('discover')}>
                Find people to talk to
              </Button>
            ) : null}
          />
        )}

        <ToolStepper steps={steps} activeId={shownStep} onSelect={showStep} />

        <div ref={stepPanelRef} className="scroll-mt-28">
          {shownStep === 'talk' && (
            <PMFConversationsStep
              interviews={interviewStore.interviews}
              icpDraftId={icpDraftId}
              icpInterviewPlan={icpInterviewPlan}
              addRequest={addRequest}
              leadSeed={interviewLeadSeed}
              showAddButton={nextStep.step !== 'talk'}
              onSaveInterview={interviewStore.saveInterview}
              onDeleteInterview={interviewStore.deleteInterview}
              onImportInterviews={interviewStore.saveMany}
              onFindPeople={() => handleModeChange('discover')}
            />
          )}
          {shownStep === 'ask' && (
            <PMFSurveyStep
              survey={survey}
              aggregate={surveyAggregate}
              shareUrl={surveyShareUrl}
              evidence={evidence}
              onSaveManualCounts={saveSeanEllis}
            />
          )}
          {shownStep === 'verdict' && (
            <PMFVerdictStep
              interviews={interviewStore.interviews}
              surveyResponses={surveyResponses}
              signalCount={signalCount}
              onSubmit={(answers) => runAnalysis(answers, {
                businessContext: {
                  productName: waitlistProductName ?? undefined,
                  targetAudience: icpPersonaName ?? undefined,
                },
              })}
            />
          )}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="PMF Lab | Creatives Takeover"
        description="Log customer conversations, ask product users one question, and get a clear verdict on whether to build, narrow, pivot or stop."
        keywords="product market fit, PMF score, startup validation, customer evidence, lean startup"
        url="/pmf-lab"
        structuredData={pageStructuredData}
      />
      <Navigation />

      <main>
        <ToolPageShell
          title="PMF Lab"
          purpose={PURPOSE}
          theme="pmf"
          wallpaper={<PMFLabWallpaper />}
          headerArt={<PMFLabChart />}
          context={user && hasAccess ? (projectContext.project ? <ToolProjectContext context={projectContext} /> : validationContextId ? contextLine : undefined) : undefined}
          actions={caseSelector ? <>{caseSelector}{newIdeaDialog}</> : null}
        >
          {!user ? (
            publicTab && (
              <PreviewModeWrapper
                featureName={publicTab.featureName}
                description={publicTab.description || ''}
                showPricingCta={publicTab.showPricingCta}
              >
                <div className="rounded-xl border border-border/60 bg-card p-6">
                  <h2 className="text-xl font-semibold text-foreground">Three steps to a clear answer</h2>
                  <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      ['Talk to customers', 'Log what real people told you.'],
                      ['Ask product users', 'Share one question about your product.'],
                      ['Get your verdict', 'Build, narrow, pivot or stop, with the reasons.'],
                    ].map(([title, body], index) => (
                      <li key={title} className="rounded-lg border border-border/60 p-4">
                        <p className="text-sm font-medium text-foreground">{index + 1}. {title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </PreviewModeWrapper>
            )
          ) : hasAccess ? (
            renderSignedIn()
          ) : (
            // Defensive only: pmf_lab is `state: 'full'` on every plan, so this branch is
            // currently unreachable. The unlock copy is derived from the plan config.
            <BlurredToolPreview
              featureName="PMF Lab"
              unlockCondition="PMF Lab is available on every plan. Refresh the page or contact support if this message persists."
              requiredPlan={upgradeTarget}
              locked
            >
              <div />
            </BlurredToolPreview>
          )}
        </ToolPageShell>
      </main>

      <Footer />
    </div>
  );
}
