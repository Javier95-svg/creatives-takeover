import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, RotateCcw, Sparkles } from "lucide-react";

import SoftGateModal from "@/components/auth/SoftGateModal";
import { ICPDraftDocument } from "@/components/icp/ICPDraftDocument";
import ICPNicheProfile from "@/components/icp/ICPNicheProfile";
import ICPPainPoints from "@/components/icp/ICPPainPoints";
import ICPPositioning from "@/components/icp/ICPPositioning";
import ICPNicheScore from "@/components/icp/ICPNicheScore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useActivationJourney } from "@/hooks/useActivationJourney";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { captureEvent, trackActivationCompleted, trackICPBuilderCompleted, trackICPBuilderStarted } from "@/lib/analytics";
import { icpInputFormSchema, type IcpInputSchema } from "@/lib/icpBuilderSchema";
import {
  buildIcpUnlockReturnPath,
  clearIcpBuilderSession,
  createEmptyIcpBuilderSession,
  persistIcpBuilderSession,
  readIcpBuilderSession,
  type IcpBuilderSession,
  type IcpClarificationExchange,
  type IcpDashboardContext,
  type StoredIcpArtifact,
} from "@/lib/icpBuilderSession";
import { consumeStoredIcpSeed, normalizeIcpSeed } from "@/lib/icpSeed";
import { markFirstArtifactCreated, sendRetentionEmail } from "@/lib/retentionSystem";

type LegacyAnalysis = Record<string, any>;

const ICP_RESULTS_TABLE = "icp_analysis_results";
const PREVIEW_TIMEOUT_MS = 30000;
const SAVE_TIMEOUT_MS = 45000;

const CORE_STEPS: Array<{
  field: keyof IcpInputSchema;
  eyebrow: string;
  question: string;
  hint: string;
  placeholder: string;
}> = [
  {
    field: "problemStatement",
    eyebrow: "Question 1",
    question: "What painful moment are you solving?",
    hint: "Name the specific moment where work breaks, slows down, or gets expensive.",
    placeholder:
      "Example: Boutique agencies lose hours turning vague client briefs into clear campaign plans, so strategy work gets delayed and the team ships late.",
  },
  {
    field: "targetAudience",
    eyebrow: "Question 2",
    question: "Who feels this problem most acutely?",
    hint: "Be narrow. Role, company type, team shape, and context matter more than broad demographics.",
    placeholder:
      "Example: Small agency owners and strategy leads running 3-10 person teams with multiple active client campaigns.",
  },
  {
    field: "currentBehavior",
    eyebrow: "Question 3",
    question: "What do they do today instead?",
    hint: "Describe the real workaround, not the ideal process.",
    placeholder:
      "Example: They stitch together Google Docs, old campaign decks, and Slack threads, then one strategist manually turns it into a usable plan.",
  },
  {
    field: "desiredOutcome",
    eyebrow: "Question 4",
    question: "What outcome are they actually trying to get?",
    hint: "Describe the result they would gladly pay for, not the features you want to ship.",
    placeholder:
      "Example: They want a launch-ready strategy brief in under 30 minutes so the team can move straight into execution without clarification loops.",
  },
  {
    field: "solutionDifferentiator",
    eyebrow: "Question 5",
    question: "Why is your solution structurally better?",
    hint: "Focus on speed, effort, workflow fit, trust, or some other real advantage.",
    placeholder:
      "Example: Instead of generic AI copy, the product turns briefs into agency-style strategy outputs using reusable client context and campaign templates.",
  },
  {
    field: "founderEdge",
    eyebrow: "Question 6",
    question: "Why are you positioned to win now?",
    hint: "Use lived experience, access, timing, or a unique asset. Empty ambition is not a moat.",
    placeholder:
      "Example: I ran strategy inside agencies for years, already know the messy briefing workflow, and have direct access to early design partners who feel this weekly.",
  },
];

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutHandle: number | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = window.setTimeout(() => {
      reject(new Error(`ICP draft generation timed out after ${Math.round(timeoutMs / 1000)} seconds.`));
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

function buildDraftTasks(artifact: StoredIcpArtifact): IcpDashboardContext["prioritizedTasks"] {
  return artifact.draftDocument.nextActions.slice(0, 5).map((action, index) => ({
    id: `icp-draft-task-${index + 1}`,
    title: action.title,
    description: action.description,
    priority: index === 0 ? "high" : index < 3 ? "medium" : "low",
    route: action.route,
  }));
}

function buildDashboardContext(artifact: StoredIcpArtifact): IcpDashboardContext {
  const confidence = artifact.draftDocument.confidence.level;
  return {
    message: "We know who you’re building for — here’s what to do next.",
    suggestedStage: "IDENTITY",
    prioritizedTasks: buildDraftTasks(artifact),
    recommendations: [
      {
        title: "We know who you’re building for — here’s what to do next",
        description:
          confidence === "low"
            ? "Validate the pain fast before you commit to a build path."
            : "Turn the ICP Draft into a concrete next move without losing momentum.",
        reason:
          confidence === "low"
            ? "Low-confidence drafts should produce better evidence, not more assumptions."
            : "A sharper ICP should immediately change what you build or test next.",
        actionUrl: confidence === "low" ? "/pmf-lab" : artifact.draftDocument.nextActions[0]?.route || "/waitlist",
        priority: 12,
        type: "action",
      },
      {
        title: confidence === "low" ? "Pressure-test the pain in PMF Lab" : "Capture demand with Waitlist Maker",
        description:
          confidence === "low"
            ? "Run interviews and demand checks against the exact segment the draft recommends."
            : "Use the ICP Draft language to create a clear waitlist message before you build more.",
        reason: "The best next move should follow from the draft, not from generic startup advice.",
        actionUrl: confidence === "low" ? "/pmf-lab" : "/waitlist",
        priority: 11,
        type: "action",
      },
      {
        title: "Get founder-context help from a mentor",
        description: "Use the draft to ask sharper questions about the segment, pain, and offer.",
        reason: "A first ICP usually improves fastest when someone challenges the assumptions directly.",
        actionUrl: "/community/mentor-marketplace",
        priority: 10,
        type: "mentor",
      },
    ],
  };
}

function mapLegacyAnalysisToArtifact(
  analysisData: LegacyAnalysis,
  targetAudience: string | null,
  businessDescription: string,
  verdict: string | null,
): StoredIcpArtifact | null {
  const topPain = Array.isArray(analysisData?.painPoints) ? analysisData.painPoints[0] : null;
  const nicheProfile = analysisData?.nicheProfile;
  const positioning = analysisData?.positioningStrategy ?? analysisData?.positioning;
  const nicheScore = analysisData?.nicheScore;

  if (!nicheProfile && !topPain && !positioning && !nicheScore) {
    return null;
  }

  const artifact: StoredIcpArtifact = {
    version: 2,
    generatedAt: analysisData?.generatedAt ?? new Date().toISOString(),
    founderInputs: {
      problemStatement: businessDescription || "Legacy ICP analysis",
      targetAudience: targetAudience || nicheProfile?.nicheName || "",
      currentBehavior: topPain?.currentSolution || topPain?.currentWorkaround || "",
      desiredOutcome: positioning?.uniqueValueProposition || positioning?.valueProposition || "",
      solutionDifferentiator: positioning?.positioningStatement || positioning?.oneLiner || "",
      founderEdge: positioning?.keyDifferentiators?.[0] || positioning?.differentiators?.[0] || "",
    },
    clarification: null,
    draftDocument: {
      who: { title: "Who", summary: "", bullets: [] },
      painPoint: { title: "Primary pain point", summary: "", bullets: [], severity: "Medium", frequency: "Recurring" },
      buildRecommendation: { title: "What to build first", summary: "", bullets: [] },
      moat: { title: "Moat", summary: "", bullets: [], weakClaims: [] },
      confidence: { level: "medium", summary: "", missingSignals: [] },
      nextActions: [],
    },
    dashboardContext: { message: "", suggestedStage: "IDENTITY", prioritizedTasks: [], recommendations: [] },
    enrichment: null,
  };

  artifact.draftDocument.who = {
    title: "Who",
    summary:
      nicheProfile?.nicheDescription ||
      targetAudience ||
      "A clear target segment was identified in the saved ICP analysis.",
    bullets: [
      nicheProfile?.demographics?.occupation ? `Occupation: ${nicheProfile.demographics.occupation}` : null,
      nicheProfile?.demographics?.location ? `Location: ${nicheProfile.demographics.location}` : null,
      nicheProfile?.buyingBehavior?.decisionProcess
        ? `Buying motion: ${nicheProfile.buyingBehavior.decisionProcess}`
        : null,
    ].filter((item): item is string => Boolean(item)),
  };

  artifact.draftDocument.painPoint = {
    title: "Primary pain point",
    summary:
      topPain?.painPoint ||
      topPain?.painPointDescription ||
      "The saved analysis identified a meaningful customer pain worth testing.",
    severity: topPain?.severity || verdict || "Medium",
    frequency: topPain?.frequency || topPain?.whenItShowsUp || "Recurring",
    bullets: [
      topPain?.gapInCurrentSolution ? `Why current options fail: ${topPain.gapInCurrentSolution}` : null,
      topPain?.currentSolution ? `Current workaround: ${topPain.currentSolution}` : null,
      topPain?.whyUnresolved ? `Why it persists: ${topPain.whyUnresolved}` : null,
    ].filter((item): item is string => Boolean(item)),
  };

  artifact.draftDocument.buildRecommendation = {
    title: "What to build first",
    summary:
      positioning?.uniqueValueProposition ||
      positioning?.valueProposition ||
      "Build the smallest offer that directly removes the core pain identified in the analysis.",
    bullets: (analysisData?.actionPlan || [])
      .slice(0, 3)
      .map((action: any) => action?.action || action?.description)
      .filter((item: unknown): item is string => typeof item === "string" && item.length > 0),
  };

  artifact.draftDocument.moat = {
    title: "Moat",
    summary:
      positioning?.positioningStatement ||
      positioning?.oneLiner ||
      "The saved analysis found an angle that differentiates this offer from current alternatives.",
    bullets: (positioning?.keyDifferentiators || positioning?.differentiators || []).slice(0, 4),
    weakClaims: [],
  };

  artifact.draftDocument.confidence = {
    level:
      nicheScore?.verdict === "Highly Viable"
        ? "high"
        : nicheScore?.verdict === "Promising" || verdict === "Promising"
          ? "medium"
          : "low",
    summary:
      nicheScore?.reasoning ||
      "This draft was mapped from an older ICP analysis, so confidence should be validated against fresh customer evidence.",
    missingSignals: Array.isArray(analysisData?.recommendation?.openQuestions)
      ? analysisData.recommendation.openQuestions.slice(0, 3)
      : ["Run a few customer conversations to confirm the top pain and switching trigger."],
  };

  artifact.draftDocument.nextActions = (analysisData?.actionPlan || [])
    .slice(0, 3)
    .map((action: any, index: number) => ({
      title: action?.action || `Next action ${index + 1}`,
      description: action?.description || "Use this saved ICP analysis to drive the next execution step.",
      route:
        action?.channel?.toLowerCase?.().includes("mentor")
          ? "/community/mentor-marketplace"
          : index === 0
            ? "/pmf-lab"
            : "/waitlist",
    }));

  artifact.dashboardContext = buildDashboardContext(artifact);
  return artifact;
}

function normalizeStoredArtifact(row: {
  analysis_data?: LegacyAnalysis | null;
  target_audience?: string | null;
  business_description?: string | null;
  verdict?: string | null;
}) {
  const analysisData = row.analysis_data ?? null;
  if (!analysisData) {
    return { artifact: null, legacyAvailable: false };
  }

  if (analysisData.version === 2 && analysisData.draftDocument) {
    return { artifact: analysisData as StoredIcpArtifact, legacyAvailable: false };
  }

  const artifact = mapLegacyAnalysisToArtifact(
    analysisData,
    row.target_audience ?? null,
    row.business_description ?? "",
    row.verdict ?? null,
  );

  return {
    artifact,
    legacyAvailable: Boolean(artifact),
    legacyAnalysis: artifact ? analysisData : null,
  };
}

const ICPBuilder: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshActivation } = useActivationJourney("stage_i");

  const [session, setSession] = useState<IcpBuilderSession>(() => readIcpBuilderSession() ?? createEmptyIcpBuilderSession());
  const [artifact, setArtifact] = useState<StoredIcpArtifact | null>(() => readIcpBuilderSession()?.draftPreview ?? null);
  const [legacyAnalysis, setLegacyAnalysis] = useState<LegacyAnalysis | null>(null);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hydratedSavedAnalysis, setHydratedSavedAnalysis] = useState(false);

  const totalSteps = CORE_STEPS.length;
  const safeStepIndex = Math.min(session.currentStep, totalSteps - 1);
  const currentStepConfig = CORE_STEPS[safeStepIndex]!;
  const currentValue = currentStepConfig ? session.answers[currentStepConfig.field] ?? "" : "";
  const unlockPath = buildIcpUnlockReturnPath();
  const shouldRestoreUnlock = searchParams.get("unlock") === "1";
  const progressPercent = Math.round(((session.currentStep + 1) / totalSteps) * 100);
  const validatedAnswers = useMemo(() => icpInputFormSchema.safeParse(session.answers), [session.answers]);
  const canContinue = currentValue.trim().length >= 12;

  useEffect(() => {
    persistIcpBuilderSession(session);
  }, [session]);

  useEffect(() => {
    const restoredSeed = normalizeIcpSeed(searchParams.get("seed"));
    const storedSeed = normalizeIcpSeed(window.sessionStorage.getItem("ct_icp_seed"));
    const effectiveSeed = restoredSeed || storedSeed;

    if (!effectiveSeed || session.answers.problemStatement) return;

    setSession((previous) => ({
      ...previous,
      answers: {
        ...previous.answers,
        problemStatement: effectiveSeed,
      },
    }));
    consumeStoredIcpSeed();
    trackActivationCompleted({ artifact: "icp_seed_prefilled" });

    if (restoredSeed) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("seed");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, session.answers.problemStatement, setSearchParams]);

  useEffect(() => {
    if (!user || artifact || session.draftPreview) {
      setHydratedSavedAnalysis(true);
      return;
    }

    let cancelled = false;

    const loadLatestSavedAnalysis = async () => {
      try {
        const { data, error } = await supabase
          .from(ICP_RESULTS_TABLE)
          .select("analysis_data, target_audience, business_description, verdict")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled || error || !data) {
          setHydratedSavedAnalysis(true);
          return;
        }

        const normalized = normalizeStoredArtifact(data as Record<string, any>);
        if (normalized.artifact) {
          setArtifact(normalized.artifact);
          setLegacyAvailable(Boolean(normalized.legacyAvailable));
          setLegacyAnalysis((normalized as { legacyAnalysis?: LegacyAnalysis | null }).legacyAnalysis ?? null);
        }
      } catch (error) {
        console.error("Failed to restore latest ICP Draft", error);
      } finally {
        if (!cancelled) {
          setHydratedSavedAnalysis(true);
        }
      }
    };

    void loadLatestSavedAnalysis();
    return () => {
      cancelled = true;
    };
  }, [artifact, session.draftPreview, user]);

  useEffect(() => {
    if (!user || !session.draftPreview || session.savedAnalysisId || isSaving) return;

    let active = true;

    const persistUnlockedDraft = async () => {
      try {
        setIsSaving(true);
        const validated = icpInputFormSchema.parse(session.answers);
        const { data, error } = await withTimeout(
          supabase.functions.invoke("icp-analyzer", {
            body: {
              mode: "save",
              answers: validated,
              clarification: session.clarification,
            },
          }),
          SAVE_TIMEOUT_MS,
        );

        if (error || !data?.success || !data?.artifact || !data?.analysisId) {
          throw error || new Error(data?.error || "Failed to save ICP Draft.");
        }

        if (!active) return;

        const savedArtifact = data.artifact as StoredIcpArtifact;
        setArtifact(savedArtifact);
        setLegacyAvailable(false);
        setLegacyAnalysis(null);
        setSession((previous) => ({
          ...previous,
          draftPreview: savedArtifact,
          unlockRequired: false,
          savedAnalysisId: data.analysisId as string,
        }));

        await markFirstArtifactCreated({
          userId: user.id,
          artifactType: "icp_analysis",
          artifactId: data.analysisId as string,
          label: `ICP: ${validated.targetAudience}`,
          resumeUrl: "/icp-builder",
          source: "icp_builder",
        });

        if (user.email) {
          await sendRetentionEmail({
            userId: user.id,
            email: user.email,
            fullName: user.user_metadata?.full_name ?? null,
            sequence: "activation_day0",
            ctaUrl: "/dashboard",
            ctaLabel: "Open dashboard",
            contextHeadline: "Your ICP Draft is unlocked.",
            contextBody: "Open the dashboard to see the first tasks and recommendations generated from your ICP Draft.",
          });
        }

        await supabase.functions.invoke("generate-recommendations", {
          body: { user_id: user.id },
        });
        await refreshActivation();

        const nextParams = new URLSearchParams(searchParams);
        if (nextParams.get("unlock") === "1") {
          nextParams.delete("unlock");
          setSearchParams(nextParams, { replace: true });
        }
      } catch (error) {
        console.error("Failed to persist unlocked ICP Draft", error);
        if (active) {
          toast({
            title: "Draft unlocked, save pending",
            description: "Your draft is visible, but we could not save it to your dashboard yet. Refresh and try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (active) {
          setIsSaving(false);
        }
      }
    };

    if (shouldRestoreUnlock || session.unlockRequired || !session.savedAnalysisId) {
      void persistUnlockedDraft();
    }

    return () => {
      active = false;
    };
  }, [isSaving, refreshActivation, searchParams, session.answers, session.clarification, session.draftPreview, session.savedAnalysisId, session.unlockRequired, setSearchParams, shouldRestoreUnlock, toast, user]);

  const updateAnswer = (value: string) => {
    if (!currentStepConfig) return;

    setSession((previous) => ({
      ...previous,
      answers: {
        ...previous.answers,
        [currentStepConfig.field]: value,
      },
    }));
  };

  const handleReset = () => {
    clearIcpBuilderSession();
    setSession(createEmptyIcpBuilderSession());
    setArtifact(null);
    setLegacyAnalysis(null);
    setLegacyAvailable(false);
    setShowLegacy(false);
    setUnlockOpen(false);
  };

  const runDraftGeneration = async (clarification: IcpClarificationExchange | null) => {
    if (!validatedAnswers.success) {
      toast({
        title: "Complete the required answers",
        description: "Each step needs enough detail before we can generate a trustworthy ICP Draft.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      trackICPBuilderStarted({ page_path: "/icp-builder" });
      captureEvent("icp_builder_started", {
        page_path: "/icp-builder",
        has_clarification: Boolean(clarification?.answer),
        isAuthenticated: Boolean(user),
      });

      const { data, error } = await withTimeout(
        supabase.functions.invoke("icp-analyzer", {
          body: {
            mode: "preview",
            answers: validatedAnswers.data,
            clarification,
          },
        }),
        PREVIEW_TIMEOUT_MS,
      );

      if (error || !data?.success) {
        throw error || new Error(data?.error || "Draft generation failed.");
      }

      if (data.status === "needs_clarification" && data.clarificationQuestion) {
        setSession((previous) => ({
          ...previous,
          clarification: {
            question: data.clarificationQuestion as string,
            answer: "",
          },
        }));
        return;
      }

      if (data.status !== "draft_ready" || !data.artifact) {
        throw new Error("The ICP analyzer returned an unexpected response.");
      }

      const nextArtifact = data.artifact as StoredIcpArtifact;
      const nextSession: IcpBuilderSession = {
        ...session,
        answers: validatedAnswers.data,
        clarification,
        draftPreview: nextArtifact,
        unlockRequired: !user,
      };

      setArtifact(nextArtifact);
      setLegacyAnalysis(null);
      setLegacyAvailable(false);
      setSession(nextSession);
      persistIcpBuilderSession(nextSession);

      captureEvent("icp_builder_completed", {
        page_path: "/icp-builder",
        success: true,
        confidence: nextArtifact.draftDocument.confidence.level,
        requires_unlock: !user,
      });

      if (!user) {
        toast({
          title: "Your ICP Draft is ready",
          description: "Create a free account to unlock it.",
        });
      } else {
        trackICPBuilderCompleted({
          page_path: "/icp-builder",
          confidence: nextArtifact.draftDocument.confidence.level,
        });
      }
    } catch (error) {
      console.error("ICP draft generation failed", error);
      toast({
        title: "Could not build the draft",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = async () => {
    if (!canContinue) {
      toast({
        title: "Add more detail",
        description: "The answer is still too thin to make the next decision useful.",
        variant: "destructive",
      });
      return;
    }

    if (session.currentStep < totalSteps - 1) {
      setSession((previous) => ({
        ...previous,
        currentStep: previous.currentStep + 1,
      }));
      return;
    }

    await runDraftGeneration(session.clarification);
  };

  const handleClarificationSubmit = async () => {
    if (!session.clarification?.answer.trim()) {
      toast({
        title: "Answer the follow-up first",
        description: "This is the last missing signal before we can produce a reliable draft.",
        variant: "destructive",
      });
      return;
    }

    await runDraftGeneration(session.clarification);
  };

  const questionBody = session.clarification ? (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <Badge variant="outline" className="w-fit">One smart follow-up</Badge>
        <CardTitle className="text-2xl">We need one sharper signal before we write the draft</CardTitle>
        <CardDescription>{session.clarification.question}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={session.clarification.answer}
          onChange={(event) =>
            setSession((previous) => ({
              ...previous,
              clarification: previous.clarification
                ? { ...previous.clarification, answer: event.target.value }
                : previous.clarification,
            }))
          }
          rows={7}
          placeholder="Add the missing detail in plain language."
          className="resize-none rounded-2xl"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => setSession((previous) => ({ ...previous, clarification: null }))}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to answers
          </Button>
          <Button type="button" size="lg" onClick={() => void handleClarificationSubmit()} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Building your draft...
              </>
            ) : (
              <>
                Generate my ICP Draft
                <Sparkles className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  ) : (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-border/60 bg-background/80 p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{currentStepConfig.eyebrow}</p>
            <p className="mt-2 text-sm text-muted-foreground">One question at a time. This should feel like a clarity session, not a form.</p>
          </div>
          <div className="text-right text-sm font-medium text-muted-foreground">
            {session.currentStep + 1} / {totalSteps}
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <Card className="rounded-[1.75rem] border-border/60 shadow-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl leading-snug md:text-[2rem]">{currentStepConfig.question}</CardTitle>
          <CardDescription className="text-sm leading-6">{currentStepConfig.hint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Textarea
            value={currentValue}
            onChange={(event) => updateAnswer(event.target.value)}
            placeholder={currentStepConfig.placeholder}
            rows={8}
            className="resize-none rounded-[1.35rem] border-border/60 bg-muted/20 p-5 text-base leading-relaxed"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {canContinue ? "Good. This is specific enough to move forward." : "Add enough detail to make the next decision obvious."}
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Autosaved in this browser
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setSession((previous) => ({
                  ...previous,
                  currentStep: Math.max(previous.currentStep - 1, 0),
                }))
              }
              disabled={session.currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="button" size="lg" className="sm:flex-1" onClick={() => void handleContinue()} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Building your draft...
                </>
              ) : session.currentStep === totalSteps - 1 ? (
                <>
                  Generate my ICP Draft
                  <Sparkles className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">5-minute clarity session</Badge>
            <Badge variant="outline">No signup required to start</Badge>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl md:text-3xl">Leave with a founder-specific ICP Draft, not a generic report</CardTitle>
            <CardDescription className="max-w-3xl text-sm sm:text-base">
              Answer six direct questions. We turn them into a draft you can hand to a designer, marketer, or co-founder and use to decide what to do next.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {artifact ? (
        <div className="space-y-6">
          <ICPDraftDocument
            artifact={artifact}
            locked={!user && session.unlockRequired}
            onUnlock={() => setUnlockOpen(true)}
            onViewLegacy={() => setShowLegacy((previous) => !previous)}
            showLegacyFallback={legacyAvailable}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Start a new ICP
            </Button>
            {user && isSaving ? (
              <Badge variant="outline">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving to dashboard...
              </Badge>
            ) : null}
            {user && session.savedAnalysisId ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                Draft synced to your dashboard
              </Badge>
            ) : null}
          </div>

          {showLegacy && legacyAnalysis ? (
            <div className="space-y-6">
              {legacyAnalysis?.nicheProfile ? <ICPNicheProfile profile={legacyAnalysis.nicheProfile} /> : null}
              {legacyAnalysis?.painPoints ? <ICPPainPoints painPoints={legacyAnalysis.painPoints} /> : null}
              {legacyAnalysis?.positioningStrategy ? <ICPPositioning positioning={legacyAnalysis.positioningStrategy} /> : null}
              {legacyAnalysis?.nicheScore ? (
                <ICPNicheScore score={legacyAnalysis.nicheScore} actionPlan={legacyAnalysis.actionPlan || []} />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : hydratedSavedAnalysis ? (
        questionBody
      ) : (
        <Card>
          <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Restoring your latest ICP context...
          </CardContent>
        </Card>
      )}

      <SoftGateModal
        open={unlockOpen}
        onOpenChange={setUnlockOpen}
        trigger="icp-draft-unlock"
        seed={session.answers.problemStatement}
        title="Your ICP Draft is ready"
        description="Create a free account to unlock it and keep building."
        returnPathOverride={unlockPath}
        onBeforeAuthContinue={() => persistIcpBuilderSession(session)}
      />
    </div>
  );
};

export default ICPBuilder;
