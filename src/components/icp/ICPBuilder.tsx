import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, RotateCcw, TrendingUp } from "lucide-react";

import { IcpGuestResultView } from "@/components/icp/IcpGuestResultView";
import { IcpProgressBar } from "@/components/icp/IcpProgressBar";
import { IcpSamplePreviewSection } from "@/components/icp/IcpSamplePreviewSection";
import { IcpSynthesisLoader } from "@/components/icp/IcpSynthesisLoader";
import Footer from "@/components/Footer";
import PageFAQSection from "@/components/seo/PageFAQSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActivationJourney } from "@/hooks/useActivationJourney";
import { useToast } from "@/hooks/use-toast";
import { useWebPush } from "@/hooks/useWebPush";
import { useCredits } from "@/hooks/useCredits";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  captureEvent,
  normalizePlanId,
  trackActivationCompleted,
  trackICPBuilderAbandoned,
  trackICPBuilderCompleted,
  trackICPBuilderModeSelected,
  trackICPBuilderStarted,
  trackICPBuilderStepCompleted,
  trackICPDashboardOpened,
  trackICPPreviewReady,
  trackICPResumeLinkRequested,
  trackICPResumeRestored,
  trackICPSeedSubmitted,
  trackUpgradeClicked,
  trackUpgradePromptShown,
} from "@/lib/analytics";
import { markOnboardingPathCompleted } from "@/lib/onboardingPath";
import { normalizePlan } from "@/config/planPermissions";
import {
  fastIcpInputSchema,
  guidedIcpInputSchema,
  type GuidedIcpInputSchema,
  type IcpPersonaSuggestion,
} from "@/lib/icpBuilderSchema";
import {
  buildIcpUnlockReturnPath,
  buildEmptyGuidedAnswers,
  clearIcpBuilderSession,
  createEmptyIcpBuilderSession,
  persistIcpBuilderSession,
  readIcpBuilderSession,
  type IcpBuilderMode,
  type IcpBuilderSession,
  type IcpFlowScreen,
  type StoredIcpArtifact,
} from "@/lib/icpBuilderSession";
import { buildBuilderSessionFromArtifact, normalizeStoredArtifact } from "@/lib/icpDraftArtifacts";
import {
  buildIcpDraftSaveFailureMessage,
  readFunctionErrorDetails,
  type FunctionFailureDetails,
} from "@/lib/icpHandoff";
import {
  buildIcpSaveExistingArtifactRequest,
  buildIcpSaveFallbackPreviewRequest,
  buildIcpUnlockNavigationPath,
  isIcpDraftSaveReady,
  isZeroCreditDeductionFailureDetails,
  runIcpPostSaveSteps,
  type IcpPostSaveStep,
} from "@/lib/icpUnlockFlow";
import { consumeStoredIcpSeed, normalizeIcpSeed } from "@/lib/icpSeed";
import { markFirstArtifactCreated, sendRetentionEmail } from "@/lib/retentionSystem";

const ICP_RESULTS_TABLE = "icp_analysis_results";
const SEED_TIMEOUT_MS = 25000;
// Backend worst case is bounded at ~50s (enrichment <=10s + OpenAI <=38s), so
// the client must wait past that or it aborts a generation that would have
// succeeded. Generous ceilings; the loader streams progress meanwhile.
const PREVIEW_TIMEOUT_MS = 65000;
const SAVE_TIMEOUT_MS = 75000;
const SEED_ANALYSIS_MIN_MS = 2200;
const ICP_ANALYZER_ERROR_MESSAGE = "Something went wrong — please try again.";
const RETRY_DELAY_MS = 2000;
const SYNTHESIS_ERROR_USER_MESSAGE =
  "The AI took longer than usual. Your inputs are saved — click 'Try again' and it usually works on the second attempt.";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GUIDED_SCREEN_ORDER: IcpFlowScreen[] = [
  "guided_seed",
  "guided_persona",
  "guided_pain",
  "guided_workaround",
];

const FAST_SCREEN_ORDER: IcpFlowScreen[] = ["fast_input"];

const PROGRESS_BY_SCREEN: Record<IcpFlowScreen | "seed_loading" | "synthesis", number> = {
  mode_select: 0,
  fast_input: 48,
  guided_seed: 16,
  guided_persona: 42,
  guided_pain: 68,
  guided_workaround: 84,
  seed_loading: 28,
  synthesis: 97,
  gate: 100,
};

type LoadingPhase = "seed_loading" | "synthesis" | null;

const ICP_BUILDER_FAQS = [
  {
    question: "What is the Ideal Customer Profile (ICP) and why is it so important?",
    answer:
      "Your Ideal Customer Profile is the specific type of customer most likely to need your product, feel the pain acutely, and take action when they see your offer. It is more specific than saying \"small businesses\" or \"creators\" because it forces you to define who has the problem, what situation they are in, and why the problem feels urgent right now.\n\nThis matters because your ICP influences almost everything else: your messaging, your landing page copy, the features you prioritize, the interviews you run, and the channels you use to reach people. If your ICP is vague, the rest of your strategy becomes vague too.\n\nA clear ICP helps you stop trying to talk to everyone and start speaking directly to the people most likely to care.",
  },
  {
    question: "Why does ICP definition matter before building?",
    answer:
      "Defining the ICP before building helps you avoid wasting time on the wrong product, the wrong features, and the wrong audience. If you do not know exactly who you are building for, it becomes much harder to decide what belongs in version one, what pain point should be front and center, and what success signal actually proves demand.\n\nFounders often build too broadly because they want to keep every option open, but that usually creates weak positioning and confusing offers. A sharper ICP gives you a practical filter for product decisions, customer interviews, onboarding, pricing assumptions, and early acquisition.\n\nIt turns building from guesswork into a more focused test.",
  },
  {
    question: "Can ICP Builder help with positioning?",
    answer:
      "Yes. ICP Builder is not only about naming a customer segment; it also helps you understand the pain points, frustrations, and context that make that segment worth targeting first. That gives you the raw material for stronger positioning.\n\nOnce you know who the customer is, what problem they are actively trying to solve, and what alternatives they are using today, it becomes much easier to explain why your offer matters and how it should be framed. Better positioning usually means clearer copy, stronger hooks, more relevant outreach, and a product story that feels specific instead of generic.\n\nIn practice, that makes your startup easier for people to understand and easier for the right users to say yes to.",
  },
];

type SeedPrefillResponse = {
  success: boolean;
  persona?: IcpPersonaSuggestion;
  error?: string;
};

type ResumeDraftResponse = {
  success: boolean;
  artifact?: StoredIcpArtifact;
  error?: string;
};

type QueueEmailDraftResponse = {
  success: boolean;
  queued?: boolean;
  error?: string;
};

type IcpDraftGenerationResponse = {
  success?: boolean;
  status?: string;
  artifact?: StoredIcpArtifact;
  analysisId?: string;
  error?: string;
};

type IcpUnlockEmailPayload = {
  entryMode?: "fast" | "guided";
  fastInput?: { description: string } | null;
  guidedInput?: GuidedIcpInputSchema | null;
  personaEditedSignificantly?: boolean;
  artifact?: StoredIcpArtifact | null;
};

type LegacyAnalysis = Record<string, unknown>;
type FallbackEmailState = "idle" | "submitting" | "submitted";

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

const invokeIcpAnalyzer = async <T,>(body: unknown, timeoutMs: number, context: string): Promise<T | null> => {
  const operation = typeof body === "object" && body !== null && "operation" in body && typeof (body as { operation?: unknown }).operation === "string"
    ? (body as { operation: string }).operation
    : "unknown";
  const isPersistOperation =
    operation === "save_existing_artifact"
    || (typeof body === "object"
      && body !== null
      && "mode" in body
      && (body as { mode?: unknown }).mode === "save");

  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke("icp-analyzer", { body }),
      timeoutMs,
    );

    if (error) {
      const details = await readFunctionErrorDetails(error, operation);

      console.error("ICP analyzer invocation failed", {
        context,
        operation,
        step: details.step,
        errorCode: details.errorCode,
        requiredCredits: details.requiredCredits,
        message: details.message,
        error,
      });
      captureEvent("icp_analyzer_function_failed", {
        context,
        operation,
        step: details.step,
        error_code: details.errorCode,
        required_credits: details.requiredCredits,
        message: details.message,
      });

      const invocationError = new Error(
        isPersistOperation ? buildIcpDraftSaveFailureMessage(details) : ICP_ANALYZER_ERROR_MESSAGE,
      ) as Error & { details?: FunctionFailureDetails };
      invocationError.details = details;
      throw invocationError;
    }

    return (data ?? null) as T | null;
  } catch (error) {
    if (error instanceof Error && (error.message === ICP_ANALYZER_ERROR_MESSAGE || "details" in error)) {
      throw error;
    }

    console.error("ICP analyzer invocation failed", {
      context,
      operation,
      timedOut: error instanceof Error && /timed out/i.test(error.message),
      error,
    });
    throw new Error(
      isPersistOperation && error instanceof Error && /timed out/i.test(error.message)
        ? buildIcpDraftSaveFailureMessage({
            message: error.message,
            errorCode: null,
            requiredCredits: null,
          })
        : ICP_ANALYZER_ERROR_MESSAGE,
    );
  }
};

const isZeroCreditDeductionFailure = (error: unknown) => {
  const details = error instanceof Error && "details" in error
    ? (error as Error & { details?: FunctionFailureDetails }).details
    : null;

  return isZeroCreditDeductionFailureDetails(details);
};

const getFailureType = (error: unknown): "timeout" | "api_error" | "invalid_response" => {
  if (error instanceof Error && /timed out/i.test(error.message)) return "timeout";
  if (error instanceof Error && "details" in error) return "api_error";
  return "invalid_response";
};

function normaliseText(value: string | null | undefined) {
  return (value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function hasSignificantPersonaChange(
  suggestion: IcpPersonaSuggestion | null,
  value: { role?: string; industry?: string; experience?: string } | null | undefined,
) {
  if (!suggestion || !value) return false;

  const checks: Array<[string, string]> = [
    [suggestion.role, value.role || ""],
    [suggestion.industry, value.industry || ""],
    [suggestion.experience, value.experience || ""],
  ];

  return checks.some(([original, edited]) => {
    const normalizedOriginal = normaliseText(original);
    const normalizedEdited = normaliseText(edited);
    if (!normalizedOriginal || !normalizedEdited || normalizedOriginal === normalizedEdited) {
      return false;
    }

    const overlap = normalizedEdited
      .split(" ")
      .filter((token) => normalizedOriginal.includes(token))
      .join(" ").length;
    return overlap / Math.max(normalizedOriginal.length, 1) < 0.5;
  });
}

function getPreviousScreen(screen: IcpFlowScreen, mode: IcpBuilderMode | null): IcpFlowScreen | null {
  if (screen === "mode_select") return null;
  if (screen === "fast_input") return "mode_select";
  if (screen === "gate") {
    return mode === "fast" ? "fast_input" : "guided_workaround";
  }

  const currentIndex = GUIDED_SCREEN_ORDER.indexOf(screen);
  if (currentIndex === -1) return "mode_select";
  if (currentIndex === 0) return "mode_select";
  return GUIDED_SCREEN_ORDER[currentIndex - 1] ?? "mode_select";
}

function getNextGuidedScreen(screen: IcpFlowScreen) {
  const currentIndex = GUIDED_SCREEN_ORDER.indexOf(screen);
  return GUIDED_SCREEN_ORDER[currentIndex + 1] ?? null;
}

function getDisplayProgress(screen: IcpFlowScreen, loadingPhase: LoadingPhase) {
  if (loadingPhase) return PROGRESS_BY_SCREEN[loadingPhase];
  return PROGRESS_BY_SCREEN[screen];
}

function getScreenTitle(screen: IcpFlowScreen, session: IcpBuilderSession) {
  const role = session.guided.persona?.role || session.personaSuggestion?.role || "this customer";

  switch (screen) {
    case "fast_input":
      return "Describe your startup idea, who it's for, and what problem it solves.";
    case "guided_seed":
      return "What's your startup idea?";
    case "guided_persona":
      return "Based on your idea, here's who we think you're building for.";
    case "guided_pain":
      return "What's the biggest pain this customer wants gone right now?";
    case "guided_workaround":
      return `What does ${role} use today to deal with this problem?`;
    default:
      return "";
  }
}

function getEnterHint(screen: IcpFlowScreen) {
  if (screen === "mode_select") return "";
  if (screen === "guided_persona") return "Press Enter ↵";
  return "Press Ctrl/Cmd+Enter ↵";
}

function getFlowScreens(mode: IcpBuilderMode | null) {
  if (mode === "fast") return FAST_SCREEN_ORDER;
  if (mode === "guided") return GUIDED_SCREEN_ORDER;
  return [];
}

function getStepsCompleted(screen: IcpFlowScreen, mode: IcpBuilderMode | null) {
  const flowScreens = getFlowScreens(mode);
  if (flowScreens.length === 0) return 0;
  if (screen === "gate") return flowScreens.length;

  const currentIndex = flowScreens.indexOf(screen);
  return currentIndex < 0 ? 0 : currentIndex;
}

const ICPBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const webPush = useWebPush();
  const { refreshActivation } = useActivationJourney("stage_i");
  const { totalAvailable, subscriptionTier, loading: creditsLoading } = useCredits();
  const { createCheckout } = useSubscription();

  const [session, setSession] = useState<IcpBuilderSession>(() => readIcpBuilderSession() ?? createEmptyIcpBuilderSession());
  const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>(null);
  const [loadingStartedAt, setLoadingStartedAt] = useState<number | null>(null);
  const [isPersisting, setIsPersisting] = useState(false);
  const [isHydratingEdit, setIsHydratingEdit] = useState(false);
  const [isHydratingResume, setIsHydratingResume] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [legacyAnalysis, setLegacyAnalysis] = useState<LegacyAnalysis | null>(null);
  const [_legacyAvailable, setLegacyAvailable] = useState(false);
  const [fallbackEmail, setFallbackEmail] = useState("");
  const [fallbackEmailError, setFallbackEmailError] = useState<string | null>(null);
  const [fallbackEmailState, setFallbackEmailState] = useState<FallbackEmailState>("idle");
  const [isPersonaEditorOpen, setIsPersonaEditorOpen] = useState(false);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPushOffer, setCelebrationPushOffer] = useState(false);
  const [pendingNavigatePath, setPendingNavigatePath] = useState<string | null>(null);
  const [pendingPostIcpNudge, setPendingPostIcpNudge] = useState(false);
  const [showPostIcpNudge, setShowPostIcpNudge] = useState(false);
  const [isStarterCheckoutLoading, setIsStarterCheckoutLoading] = useState(false);
  const completedRef = useRef(false);
  const postIcpPromptTrackedRef = useRef(false);
  const currentStepRef = useRef<IcpFlowScreen>(session.currentScreen);
  const modeRef = useRef<IcpBuilderMode | null>(session.mode);
  const stepsCompletedRef = useRef(0);
  const totalStepsRef = useRef(0);
  const hasStartedTypingRef = useRef(false);
  const icpStartedAtRef = useRef<number | null>(null);
  const fastInputRef = useRef<HTMLTextAreaElement>(null);
  const guidedSeedRef = useRef<HTMLTextAreaElement>(null);
  const autoModeAppliedRef = useRef(false);

  const unlockPath = buildIcpUnlockReturnPath();
  const editDraftId = searchParams.get("edit");
  const resumeToken = searchParams.get("resume");
  const progress = getDisplayProgress(session.currentScreen, loadingPhase);
  const synthesisElapsedMs = loadingPhase === "synthesis" && loadingStartedAt ? Date.now() - loadingStartedAt : 0;
  const validatedGuided = useMemo(() => guidedIcpInputSchema.safeParse(session.guided), [session.guided]);
  const validatedFast = useMemo(() => fastIcpInputSchema.safeParse({ description: session.fastDescription }), [session.fastDescription]);
  const fastWordCount = useMemo(
    () => (session.fastDescription.trim() ? session.fastDescription.trim().split(/\s+/).length : 0),
    [session.fastDescription],
  );
  const unlockEmailPayload = useMemo<IcpUnlockEmailPayload | null>(() => {
    if (!session.draftPreview) return null;

    if (session.mode === "fast") {
      return {
        entryMode: "fast",
        fastInput: { description: session.fastDescription },
        artifact: session.draftPreview,
      };
    }

    return {
      entryMode: "guided",
      guidedInput: validatedGuided.success ? validatedGuided.data : null,
      personaEditedSignificantly: session.personaEditedSignificantly,
      artifact: session.draftPreview,
    };
  }, [session.draftPreview, session.fastDescription, session.mode, session.personaEditedSignificantly, validatedGuided]);

  useEffect(() => {
    persistIcpBuilderSession(session);
  }, [session]);

  useEffect(() => {
    currentStepRef.current = session.currentScreen;
    modeRef.current = session.mode;
    stepsCompletedRef.current = getStepsCompleted(session.currentScreen, session.mode);
    totalStepsRef.current = getFlowScreens(session.mode).length;
  }, [session.currentScreen, session.mode]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (completedRef.current) return;
      trackICPBuilderAbandoned({
        last_step: currentStepRef.current,
        mode: modeRef.current,
        steps_completed: stepsCompletedRef.current,
        total_steps: totalStepsRef.current,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (completedRef.current) return;
      trackICPBuilderAbandoned({
        last_step: currentStepRef.current,
        mode: modeRef.current,
        steps_completed: stepsCompletedRef.current,
        total_steps: totalStepsRef.current,
      });
    };
  }, []);

  useEffect(() => {
    if (!loadingStartedAt || loadingPhase !== "synthesis") return;

    const timer = window.setInterval(() => {
      setLoadingStartedAt((value) => (value ? value : Date.now()));
    }, 250);

    return () => window.clearInterval(timer);
  }, [loadingPhase, loadingStartedAt]);

  useEffect(() => {
    if (session.currentScreen !== "guided_persona") {
      setIsPersonaEditorOpen(false);
    }
  }, [session.currentScreen]);

  useEffect(() => {
    if (session.currentScreen === "fast_input") {
      requestAnimationFrame(() => fastInputRef.current?.focus());
    } else if (session.currentScreen === "guided_seed") {
      requestAnimationFrame(() => guidedSeedRef.current?.focus());
    }
  }, [session.currentScreen]);

  const proceedAfterCelebration = useCallback(() => {
    if (!pendingNavigatePath) return;
    if (pendingPostIcpNudge) {
      setShowCelebration(false);
      setShowPostIcpNudge(true);
      if (!postIcpPromptTrackedRef.current) {
        postIcpPromptTrackedRef.current = true;
        trackUpgradePromptShown({
          trigger: "post_icp_nudge",
          credits_remaining: totalAvailable,
          current_plan: "rookie",
          target_plan: "starter",
        });
      }
      return;
    }

    navigate(pendingNavigatePath, { replace: true });
  }, [pendingNavigatePath, pendingPostIcpNudge, totalAvailable, navigate]);

  // RET-005: the moment the first ICP lands is the highest-intent point in the
  // product — offer push there ("notify me when the next step is ready") instead
  // of relying on a passive dashboard card. Ineligible users keep the old 2s
  // auto-redirect.
  const handleEnablePushAfterIcp = useCallback(async () => {
    const ok = await webPush.subscribe();
    captureEvent("push_prompt_answered", { placement: "post_icp_celebration", enabled: ok });
    if (ok) {
      toast({
        title: "Notifications on",
        description: "We'll nudge you when your next validation step is ready.",
      });
    }
    proceedAfterCelebration();
  }, [webPush, proceedAfterCelebration, toast]);

  useEffect(() => {
    if (!showCelebration || !pendingNavigatePath) return;
    if (celebrationPushOffer) return; // offer is showing — wait for the user

    const pushEligible =
      webPush.supported && !webPush.isSubscribed && webPush.permission !== "denied";

    if (pushEligible) {
      const timer = window.setTimeout(() => {
        setCelebrationPushOffer(true);
        captureEvent("push_prompt_shown", { placement: "post_icp_celebration" });
      }, 1200);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(proceedAfterCelebration, 2000);
    return () => window.clearTimeout(timer);
  }, [
    showCelebration,
    pendingNavigatePath,
    celebrationPushOffer,
    webPush.supported,
    webPush.isSubscribed,
    webPush.permission,
    proceedAfterCelebration,
  ]);

  useEffect(() => {
    const restoredSeed = normalizeIcpSeed(searchParams.get("seed"));
    const storedSeed = normalizeIcpSeed(window.sessionStorage.getItem("ct_icp_seed"));
    const effectiveSeed = restoredSeed || storedSeed;

    if (!effectiveSeed) return;
    if (session.fastDescription || session.guided.seed) return;

    setSession((previous) => ({
      ...previous,
      fastDescription: effectiveSeed,
      guided: {
        ...buildEmptyGuidedAnswers(effectiveSeed),
        ...previous.guided,
        seed: effectiveSeed,
      },
    }));
    consumeStoredIcpSeed();

    if (restoredSeed) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("seed");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, session.fastDescription, session.guided.seed, setSearchParams]);

  useEffect(() => {
    if (!editDraftId || !user) return;
    if (session.savedAnalysisId === editDraftId) return;

    let cancelled = false;

    const hydrateEditDraft = async () => {
      setIsHydratingEdit(true);
      try {
        const { data, error } = await supabase
          .from(ICP_RESULTS_TABLE)
          .select("id, analysis_data, target_audience, business_description, verdict")
          .eq("id", editDraftId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error || !data) {
          toast({
            title: "Draft unavailable",
            description: "We could not load that ICP Draft for editing.",
            variant: "destructive",
          });
          return;
        }

        const normalized = normalizeStoredArtifact(data);
        if (!normalized.artifact) {
          toast({
            title: "Draft unavailable",
            description: "That ICP Draft could not be mapped into the new editor.",
            variant: "destructive",
          });
          return;
        }

        setLegacyAvailable(Boolean(normalized.legacyAvailable));
        setLegacyAnalysis(normalized.legacyAnalysis);
        setSession(buildBuilderSessionFromArtifact(normalized.artifact, editDraftId));
      } catch (error) {
        console.error("Failed to load ICP draft for editing", error);
      } finally {
        if (!cancelled) {
          setIsHydratingEdit(false);
        }
      }
    };

    void hydrateEditDraft();

    return () => {
      cancelled = true;
    };
  }, [editDraftId, session.savedAnalysisId, toast, user]);

  useEffect(() => {
    if (!resumeToken || session.draftPreview || session.savedAnalysisId || isHydratingResume) {
      return;
    }

    let cancelled = false;

    const loadResumeDraft = async () => {
      setIsHydratingResume(true);
      try {
        const { data, error } = await supabase.functions.invoke("load-icp-email-draft", {
          body: { resumeToken },
        });

        if (cancelled) return;
        const payload = data as ResumeDraftResponse | null;
        if (error || !payload?.success || !payload.artifact) {
          console.error("ICP email draft restore returned an error", error || payload?.error || data);
          throw new Error("We could not restore that ICP Draft.");
        }

        const restoredSession = buildBuilderSessionFromArtifact(payload.artifact, null);
        setSession({
          ...restoredSession,
          currentScreen: "gate",
          draftPreview: payload.artifact,
          unlockRequired: true,
        });
        trackICPResumeRestored({
          source: "resume_token",
          page_path: "/icp-builder",
        });
      } catch (error) {
        console.error("ICP email draft restore failed", error);
        toast({
          title: "Draft unavailable",
          description: "We could not restore that ICP Draft.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setIsHydratingResume(false);
        }
      }
    };

    void loadResumeDraft();

    return () => {
      cancelled = true;
    };
  }, [isHydratingResume, resumeToken, session.draftPreview, session.savedAnalysisId, toast]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (loadingPhase) return;

      const previousScreen = getPreviousScreen(session.currentScreen, session.mode);
      if (!previousScreen) return;
      event.preventDefault();
      setSession((previous) => ({
        ...previous,
        currentScreen: previousScreen,
      }));
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [loadingPhase, session.currentScreen, session.mode]);

  const canContinue = useMemo(() => {
    switch (session.currentScreen) {
      case "fast_input":
        return fastWordCount >= 30;
      case "guided_seed":
        return (session.guided.seed || "").trim().length >= 8;
      case "guided_persona":
        return Boolean(
          session.guided.persona?.role?.trim() &&
            session.guided.persona?.industry?.trim() &&
            session.guided.persona?.experience?.trim(),
        );
      case "guided_pain":
        return (session.guided.pain || "").trim().length >= 12;
      case "guided_workaround":
        return (session.guided.workaround || "").trim().length >= 6;
      default:
        return false;
    }
  }, [session, fastWordCount]);

  const updateGuided = <K extends keyof IcpBuilderSession["guided"]>(field: K, value: IcpBuilderSession["guided"][K]) => {
    if (!hasStartedTypingRef.current) {
      hasStartedTypingRef.current = true;
      icpStartedAtRef.current = Date.now();
      trackICPBuilderStarted({ page_path: "/icp-builder", mode: session.mode, userId: user?.id });
    }
    setSession((previous) => ({
      ...previous,
      guided: {
        ...previous.guided,
        [field]: value,
      },
    }));
  };

  const updateQuickstartSeed = (value: string) => {
    if (!hasStartedTypingRef.current) {
      hasStartedTypingRef.current = true;
      icpStartedAtRef.current = Date.now();
      trackICPBuilderStarted({ page_path: "/icp-builder", mode: session.mode, userId: user?.id });
    }
    setSession((previous) => {
      const previousSeed = previous.guided.seed || "";
      const shouldMirrorFast = !previous.fastDescription || previous.fastDescription === previousSeed;

      return {
        ...previous,
        fastDescription: shouldMirrorFast ? value : previous.fastDescription,
        guided: {
          ...previous.guided,
          seed: value,
        },
      };
    });
  };

  const resetBuilder = () => {
    hasStartedTypingRef.current = false;
    clearIcpBuilderSession();
    setSession(createEmptyIcpBuilderSession());
    setLegacyAnalysis(null);
    setLegacyAvailable(false);
    setShowLegacy(false);
    setShowCelebration(false);
    setShowPostIcpNudge(false);
    setPendingPostIcpNudge(false);
    setPendingNavigatePath(null);
    navigate("/icp-builder", { replace: true });
  };

  const invokeSeedPrefill = async (seedOverride?: string, source: "guided_seed" | "quickstart" = "guided_seed") => {
    const seed = (seedOverride ?? session.guided.seed ?? "").trim();
    if (seed.length < 8) {
      toast({
        title: "Add a rough idea first",
        description: "One or two sentences are enough to start.",
        variant: "destructive",
      });
      return;
    }

    setSynthesisError(null);
    setLoadingPhase("seed_loading");
    setLoadingStartedAt(Date.now());
    trackICPSeedSubmitted({
      page_path: "/icp-builder",
      source,
      is_authenticated: Boolean(user),
      seed_length: seed.length,
    });

    try {
      const [data] = await Promise.all([
        invokeIcpAnalyzer<SeedPrefillResponse>(
          {
            operation: "seed_prefill",
            seed,
          },
          SEED_TIMEOUT_MS,
          "ICP seed prefill invocation failed",
        ),
        new Promise((resolve) => window.setTimeout(resolve, SEED_ANALYSIS_MIN_MS)),
      ]);

      if (!data?.success || !data.persona) {
        console.error("ICP seed prefill returned an error", data?.error || data);
        throw new Error(ICP_ANALYZER_ERROR_MESSAGE);
      }

      const persona = data.persona as IcpPersonaSuggestion;
      setSession((previous) => ({
        ...previous,
        personaSuggestion: persona,
        mode: "guided",
        guided: {
          ...buildEmptyGuidedAnswers(seed),
          ...previous.guided,
          seed,
          persona: {
            role: persona.role,
            industry: persona.industry,
            experience: persona.experience,
          },
          pain: previous.guided.pain || persona.suggestedPain,
        },
        currentScreen: "guided_persona",
      }));
      setIsPersonaEditorOpen(false);
    } catch (error) {
      console.error("ICP seed prefill failed", error);
      setSynthesisError(ICP_ANALYZER_ERROR_MESSAGE);
      toast({
        title: "Could not analyse the idea",
        description: ICP_ANALYZER_ERROR_MESSAGE,
        variant: "destructive",
      });
    } finally {
      setLoadingPhase(null);
      setLoadingStartedAt(null);
    }
  };

  const runPostSaveHandoff = useCallback(async ({
    analysisId,
    artifact,
  }: {
    analysisId: string;
    artifact: StoredIcpArtifact;
  }) => {
    const handoffSteps: IcpPostSaveStep[] = [];

    if (user) {
      handoffSteps.push({
        name: "markFirstArtifactCreated",
        run: () => markFirstArtifactCreated({
          userId: user.id,
          artifactType: "icp_analysis",
          artifactId: analysisId,
          label: artifact.draftDocument.customer.personaName,
          resumeUrl: `/icp/draft/${analysisId}`,
          source: "icp_builder",
        }),
      });

      const userEmail = user.email;
      if (userEmail) {
        handoffSteps.push({
          name: "sendRetentionEmail",
          run: () => sendRetentionEmail({
            userId: user.id,
            email: userEmail,
            fullName: user.user_metadata?.full_name ?? null,
            sequence: "activation_day0",
            ctaUrl: "/dashboard",
            ctaLabel: "Open dashboard",
            contextHeadline: "Your ICP Draft is unlocked.",
            contextBody: "Open the dashboard to see the first tasks and recommendations generated from your ICP Draft.",
          }),
        });
      }

      handoffSteps.push(
        {
          name: "refreshSession",
          run: () => supabase.auth.refreshSession(),
        },
        {
          name: "bootstrap-icp-dashboard",
          run: async () => {
            const { error: bootstrapError } = await supabase.functions.invoke("bootstrap-icp-dashboard", {
              body: { analysisId },
            });

            if (bootstrapError) {
              throw bootstrapError;
            }
          },
        },
      );
    }

    handoffSteps.push({
      name: "refreshActivation",
      run: () => refreshActivation(),
    });

    await runIcpPostSaveSteps(handoffSteps);
  }, [refreshActivation, user]);

  const shouldShowPostIcpStarterNudge = useCallback(async (analysisId: string) => {
    if (!user?.id || creditsLoading || normalizePlan(subscriptionTier) !== "rookie") {
      return false;
    }

    const { count, error } = await supabase
      .from(ICP_RESULTS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("id", analysisId);

    if (error) {
      console.warn("Unable to check prior ICP results before Starter nudge", error);
      return false;
    }

    return (count ?? 0) === 0;
  }, [creditsLoading, subscriptionTier, user?.id]);

  const unlockSavedDraft = useCallback(async ({
    analysisId,
    artifact,
    mode,
    source,
  }: {
    analysisId: string;
    artifact: StoredIcpArtifact;
    mode: IcpBuilderMode | null;
    source: "draft_saved" | "unlock_gate";
  }) => {
    setSession((previous) => ({
      ...previous,
      draftPreview: artifact,
      unlockRequired: false,
      savedAnalysisId: analysisId,
    }));
    completedRef.current = true;
    const completionMode = mode || "guided";
    const timeToCompleteSeconds = Math.max(
      0,
      Math.round((Date.now() - (icpStartedAtRef.current ?? Date.now())) / 1000),
    );
    trackICPBuilderCompleted({
      mode: completionMode,
      time_to_complete_seconds: timeToCompleteSeconds,
      credits_used: 0,
    });
    trackActivationCompleted({ trigger: 'icp_completed', artifact: 'icp_completed' });
    // Task 4: completing the ICP path unlocks the full dashboard nav (flag-gated no-op otherwise).
    if (user?.id) {
      void markOnboardingPathCompleted(user.id, 'icp');
    }
    trackICPDashboardOpened({
      page_path: "/icp-builder",
      mode,
      source,
    });
    const showStarterNudge = await shouldShowPostIcpStarterNudge(analysisId);
    postIcpPromptTrackedRef.current = false;
    setPendingPostIcpNudge(showStarterNudge);
    setPendingNavigatePath(buildIcpUnlockNavigationPath(analysisId));
    setShowCelebration(true);
    void runPostSaveHandoff({ analysisId, artifact });
  }, [runPostSaveHandoff, shouldShowPostIcpStarterNudge]);

  const completeDraftGeneration = useCallback(async (persist: boolean) => {
    const mode = session.mode;
    if (!mode) return;

    const body =
      mode === "fast"
        ? {
            operation: "build_draft",
            mode: persist ? "save" : "preview",
            entryMode: "fast",
            fastInput: validatedFast.success ? validatedFast.data : null,
          }
        : {
            operation: "build_draft",
            mode: persist ? "save" : "preview",
            entryMode: "guided",
            guidedInput: validatedGuided.success ? validatedGuided.data : null,
            personaEditedSignificantly: session.personaEditedSignificantly,
          };

    if ((mode === "fast" && !validatedFast.success) || (mode === "guided" && !validatedGuided.success)) {
      toast({
        title: "Complete the current draft first",
        description: "Every answer needs enough detail before we can generate a trustworthy ICP Draft.",
        variant: "destructive",
      });
      return;
    }

    setSynthesisError(null);
    setLoadingPhase("synthesis");
    setLoadingStartedAt(Date.now());
    setFallbackEmailError(null);
    setFallbackEmailState("idle");

    const invokeWithRetry = async () => {
      try {
        return await invokeIcpAnalyzer<IcpDraftGenerationResponse>(
          body,
          persist ? SAVE_TIMEOUT_MS : PREVIEW_TIMEOUT_MS,
          "ICP draft generation invocation failed",
        );
      } catch (firstError) {
        if (isZeroCreditDeductionFailure(firstError)) throw firstError;
        await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return await invokeIcpAnalyzer<IcpDraftGenerationResponse>(
          body,
          persist ? SAVE_TIMEOUT_MS : PREVIEW_TIMEOUT_MS,
          "ICP draft generation retry invocation failed",
        );
      }
    };

    try {
      const data = await invokeWithRetry();

      if (!data?.success || data.status !== "draft_ready" || !data.artifact) {
        console.error("ICP draft generation returned an error", data?.error || data);
        throw new Error(ICP_ANALYZER_ERROR_MESSAGE);
      }

      const artifact = data.artifact as StoredIcpArtifact;

      if (!persist) {
        trackICPPreviewReady({
          page_path: "/icp-builder",
          mode,
          confidence: artifact.draftDocument.confidence.level,
          is_authenticated: Boolean(user),
          preview_variant: "partial_before_signup",
          revealed_sections: 2,
        });
        setSession((previous) => ({
          ...previous,
          draftPreview: artifact,
          unlockRequired: true,
          currentScreen: "gate",
        }));
        return;
      }

      if (!isIcpDraftSaveReady(data)) {
        console.error("ICP draft generation returned no analysis id", data);
        throw new Error(ICP_ANALYZER_ERROR_MESSAGE);
      }

      await unlockSavedDraft({
        analysisId: data.analysisId,
        artifact,
        mode,
        source: "draft_saved",
      });
    } catch (error) {
      let saveError = error;

      if (persist && user && isZeroCreditDeductionFailure(error)) {
        try {
          captureEvent("icp_zero_credit_save_fallback_started", {
            mode,
            userId: user.id,
          });

          const previewData = await invokeIcpAnalyzer<IcpDraftGenerationResponse>(
            buildIcpSaveFallbackPreviewRequest(body),
            PREVIEW_TIMEOUT_MS,
            "ICP zero-credit save fallback preview invocation failed",
          );

          if (!previewData?.success || previewData.status !== "draft_ready" || !previewData.artifact) {
            console.error("ICP zero-credit save fallback preview returned an error", previewData?.error || previewData);
            throw new Error(ICP_ANALYZER_ERROR_MESSAGE);
          }

          const fallbackArtifact = previewData.artifact as StoredIcpArtifact;
          const saveData = await invokeIcpAnalyzer<IcpDraftGenerationResponse>(
            buildIcpSaveExistingArtifactRequest(fallbackArtifact),
            SAVE_TIMEOUT_MS,
            "ICP zero-credit save fallback persist invocation failed",
          );

          if (!isIcpDraftSaveReady(saveData)) {
            console.error("ICP zero-credit save fallback persist returned an error", saveData?.error || saveData);
            throw new Error(ICP_ANALYZER_ERROR_MESSAGE);
          }

          captureEvent("icp_zero_credit_save_fallback_completed", {
            mode,
            userId: user.id,
          });
          await unlockSavedDraft({
            analysisId: saveData.analysisId,
            artifact: (saveData.artifact as StoredIcpArtifact) ?? fallbackArtifact,
            mode,
            source: "draft_saved",
          });
          return;
        } catch (fallbackError) {
          console.error("ICP zero-credit save fallback failed", fallbackError);
          captureEvent("icp_zero_credit_save_fallback_failed", {
            mode,
            error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            userId: user.id,
          });
          saveError = fallbackError;
        }
      }

      console.error("ICP draft generation failed", saveError);
      captureEvent("icp_draft_generation_failed", {
        mode,
        persist,
        failure_type: getFailureType(saveError),
        error: saveError instanceof Error ? saveError.message : String(saveError),
        userId: user?.id,
      });
      if (!persist) {
        setSynthesisError(SYNTHESIS_ERROR_USER_MESSAGE);
      } else {
        toast({
          title: "Could not save your ICP Draft",
          description: SYNTHESIS_ERROR_USER_MESSAGE,
          variant: "destructive",
        });
      }
    } finally {
      setLoadingPhase(null);
      setLoadingStartedAt(null);
    }
  }, [session.mode, session.personaEditedSignificantly, toast, unlockSavedDraft, user, validatedFast, validatedGuided]);

  const persistDraftAndContinue = useCallback(async () => {
    if (isPersisting) return;
    setPersistError(null);
    setIsPersisting(true);
    try {
      if (user && session.draftPreview && session.unlockRequired) {
        const saveWithRetry = async () => {
          try {
            return await invokeIcpAnalyzer<IcpDraftGenerationResponse>(
              buildIcpSaveExistingArtifactRequest(session.draftPreview!),
              SAVE_TIMEOUT_MS,
              "ICP unlocked draft save invocation failed",
            );
          } catch (firstError) {
            if (isZeroCreditDeductionFailure(firstError)) throw firstError;
            await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
            return await invokeIcpAnalyzer<IcpDraftGenerationResponse>(
              buildIcpSaveExistingArtifactRequest(session.draftPreview!),
              SAVE_TIMEOUT_MS,
              "ICP unlocked draft save retry invocation failed",
            );
          }
        };
        const data = await saveWithRetry();

        if (!isIcpDraftSaveReady(data)) {
          console.error("ICP unlocked draft save returned an error", data?.error || data);
          throw new Error(ICP_ANALYZER_ERROR_MESSAGE);
        }

        const artifact = (data.artifact as StoredIcpArtifact) ?? session.draftPreview;

        await unlockSavedDraft({
          analysisId: data.analysisId,
          artifact,
          mode: session.mode,
          source: "unlock_gate",
        });
        return;
      }

      await completeDraftGeneration(true);
    } catch (error) {
      console.error("ICP draft persist failed", error);
      captureEvent("icp_draft_generation_failed", {
        mode: session.mode,
        persist: true,
        flow: "persist_and_continue",
        failure_type: getFailureType(error),
        error: error instanceof Error ? error.message : String(error),
        userId: user?.id,
      });
      setPersistError(SYNTHESIS_ERROR_USER_MESSAGE);
    } finally {
      setIsPersisting(false);
    }
  }, [completeDraftGeneration, isPersisting, session.draftPreview, session.mode, session.unlockRequired, unlockSavedDraft, user]);

  useEffect(() => {
    if (!user || !session.draftPreview || !session.unlockRequired || session.savedAnalysisId || isPersisting || persistError) {
      return;
    }

    void persistDraftAndContinue();
  }, [isPersisting, persistDraftAndContinue, persistError, session.draftPreview, session.savedAnalysisId, session.unlockRequired, user]);

  const requestResumeLink = useCallback(async ({
    email,
    source,
    includeArtifact = false,
  }: {
    email: string;
    source: "synthesis_loader" | "unlock_gate";
    includeArtifact?: boolean;
  }) => {
    const normalizedEmail = email.trim();
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error("Enter a valid email address.");
    }

    const body =
      includeArtifact && unlockEmailPayload?.artifact
        ? {
            email: normalizedEmail,
            ...unlockEmailPayload,
          }
        : session.mode === "fast" && validatedFast.success
          ? {
              email: normalizedEmail,
              entryMode: "fast" as const,
              fastInput: validatedFast.data,
            }
          : session.mode === "guided" && validatedGuided.success
            ? {
                email: normalizedEmail,
                entryMode: "guided" as const,
                guidedInput: validatedGuided.data,
                personaEditedSignificantly: session.personaEditedSignificantly,
              }
            : null;

    if (!body) {
      throw new Error("Finish the current answers first so we can send the right draft.");
    }

    const { data, error } = await supabase.functions.invoke("request-icp-draft-email", {
      body,
    });
    const payload = data as QueueEmailDraftResponse | null;

    if (error || !payload?.success) {
      console.error("ICP draft email request returned an error", error || payload?.error || data);
      throw new Error("We could not queue the email draft.");
    }

    trackICPResumeLinkRequested({
      page_path: "/icp-builder",
      source,
      has_preview: includeArtifact,
    });
  }, [
    session.mode,
    session.personaEditedSignificantly,
    unlockEmailPayload,
    validatedFast,
    validatedGuided,
  ]);

  const handleFallbackEmailSubmit = useCallback(async () => {
    if (fallbackEmailState === "submitting" || fallbackEmailState === "submitted") return;

    setFallbackEmailError(null);
    setFallbackEmailState("submitting");

    try {
      await requestResumeLink({
        email: fallbackEmail,
        source: "synthesis_loader",
      });
      setFallbackEmailState("submitted");
      toast({
        title: "Email queued",
        description: "We’ll send you a link to resume and unlock this ICP Draft.",
      });
    } catch (error) {
      setFallbackEmailState("idle");
      setFallbackEmailError(error instanceof Error ? error.message : "We could not queue the email draft.");
    }
  }, [fallbackEmail, fallbackEmailState, requestResumeLink, toast]);

  const trackStepCompleted = (screen: IcpFlowScreen) => {
    if (!session.mode) return;

    const flowScreens = getFlowScreens(session.mode);
    const stepIndex = flowScreens.indexOf(screen) + 1;
    if (stepIndex < 1) return;

    trackICPBuilderStepCompleted({
      step: stepIndex,
      step_name: screen,
      total_steps: flowScreens.length,
      mode: session.mode,
      userId: user?.id,
    });
  };

  const handleContinue = async () => {
    if (loadingPhase) return;

    if (!canContinue) {
      toast({
        title: "Add a bit more detail",
        description: "The next step should feel obvious from this answer.",
        variant: "destructive",
      });
      return;
    }

    if (session.currentScreen === "fast_input") {
      trackStepCompleted("fast_input");
      await completeDraftGeneration(Boolean(user));
      return;
    }

    if (session.currentScreen === "guided_seed") {
      trackStepCompleted("guided_seed");
      await invokeSeedPrefill();
      return;
    }

    if (session.currentScreen === "guided_persona") {
      trackStepCompleted("guided_persona");
      const personaEditedSignificantly = hasSignificantPersonaChange(session.personaSuggestion, session.guided.persona);
      setSession((previous) => ({
        ...previous,
        personaEditedSignificantly,
        currentScreen: "guided_pain",
      }));
      return;
    }

    if (session.currentScreen === "guided_workaround") {
      trackStepCompleted("guided_workaround");
      await completeDraftGeneration(Boolean(user));
      return;
    }

    const nextScreen = getNextGuidedScreen(session.currentScreen);
    if (nextScreen) {
      trackStepCompleted(session.currentScreen);
      setSession((previous) => ({
        ...previous,
        currentScreen: nextScreen,
      }));
    }
  };

  const handleBack = () => {
    if (loadingPhase) return;
    const previousScreen = getPreviousScreen(session.currentScreen, session.mode);
    if (!previousScreen) return;
    setSession((previous) => ({
      ...previous,
      currentScreen: previousScreen,
    }));
  };

  const handleFieldSubmit = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.currentTarget instanceof HTMLTextAreaElement) {
      if (!event.metaKey && !event.ctrlKey) return;
    }
    event.preventDefault();
    void handleContinue();
  };

  const handleModeCardKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, selectMode: () => void) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectMode();
  };

  const handleSelectFastMode = useCallback(() => {
    trackICPBuilderModeSelected({ mode: "fast", is_authenticated: Boolean(user) });
    setSession((previous) => ({
      ...previous,
      mode: "fast",
      currentScreen: "fast_input",
    }));
  }, [user]);

  const handleSelectGuidedMode = useCallback(() => {
    trackICPBuilderModeSelected({ mode: "guided", is_authenticated: Boolean(user) });
    setSession((previous) => ({
      ...previous,
      mode: "guided",
      currentScreen: "guided_seed",
      guided: previous.guided.seed ? previous.guided : buildEmptyGuidedAnswers(previous.fastDescription),
    }));
  }, [user]);

  useEffect(() => {
    if (autoModeAppliedRef.current) return;
    if (session.currentScreen !== "mode_select") return;
    if (searchParams.get("mode") !== "fast") return;
    autoModeAppliedRef.current = true;
    handleSelectFastMode();
    const next = new URLSearchParams(searchParams);
    next.delete("mode");
    setSearchParams(next, { replace: true });
  }, [session.currentScreen, searchParams, handleSelectFastMode, setSearchParams]);

  const handleSkipPersona = useCallback(() => {
    captureEvent("icp_guided_step_skipped", { step: 2 });
    setSession((prev) => ({
      ...prev,
      guided: {
        ...prev.guided,
        persona: {
          role: prev.guided.persona?.role || "Not defined yet",
          industry: prev.guided.persona?.industry || "Not defined yet",
          experience: prev.guided.persona?.experience || "Not defined yet",
        },
      },
      currentScreen: "guided_pain",
    }));
  }, []);

  const renderModeSelect = () => (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 pb-20 pt-32 text-foreground sm:px-6 md:pt-36">
      <div className="space-y-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-teal">ICP Builder</p>
        <h1 className="takeover-gradient creatives-font pb-3 text-4xl font-semibold leading-[1.12] tracking-tight sm:pb-4 sm:text-5xl">
          Get your ICP Draft
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          Your draft covers four things: who your ideal customer is, what pain drives them to buy, what to build for them, and your competitive edge.
        </p>
      </div>

      {session.mode !== null && (
        <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-5xl border border-accent-teal/30 bg-accent-teal/10 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">You have an unfinished ICP draft</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Pick up where you left off, or start fresh.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={resetBuilder}
            >
              Start over
            </button>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-full px-4 text-xs font-semibold"
              onClick={() =>
                setSession((prev) => ({
                  ...prev,
                  currentScreen:
                    prev.currentScreen === "mode_select"
                      ? prev.mode === "fast"
                        ? "fast_input"
                        : "guided_seed"
                      : prev.currentScreen,
                }))
              }
            >
              Continue where I left off
            </Button>
          </div>
        </div>
      )}

      <div id="icp-mode-selector" className="mt-10 grid gap-5 lg:grid-cols-2">
        <button
          type="button"
          role="button"
          tabIndex={0}
          className="group relative overflow-hidden rounded-5xl border border-border/60 bg-white/80 p-6 text-left shadow-[0_28px_90px_-52px_rgba(15,23,42,0.3)] backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:border-accent-teal/40 hover:shadow-accent-teal-lg motion-safe:animate-[glow_4.8s_ease-in-out_infinite_alternate] dark:bg-slate-950/70"
          onClick={handleSelectFastMode}
          onKeyDown={(event) => handleModeCardKeyDown(event, handleSelectFastMode)}
        >
          <div className="pointer-events-none absolute inset-0 rounded-5xl border border-accent-teal/15 opacity-60 motion-safe:animate-[pulse-slow_4s_ease-in-out_infinite]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-teal">Fast Mode</p>
              <span className="rounded-full border border-accent-teal/30 bg-accent-teal/10 px-2.5 py-0.5 text-label font-semibold text-accent-teal">~60 sec</span>
            </div>
            <p className="mt-4 text-xl font-semibold text-foreground">I can describe my startup idea clearly</p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Paste a paragraph about your idea and see your ideal customer and their biggest frustration in under 60 seconds.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-teal">
              Start here
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </button>

        <button
          type="button"
          role="button"
          tabIndex={0}
          className="group relative overflow-hidden rounded-5xl border border-border/60 bg-white/80 p-6 text-left shadow-[0_28px_90px_-52px_rgba(15,23,42,0.3)] backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:border-accent-teal/40 hover:shadow-accent-teal-lg motion-safe:animate-[glow_4.8s_ease-in-out_infinite_alternate] dark:bg-slate-950/70"
          style={{ animationDelay: "0.45s" }}
          onClick={handleSelectGuidedMode}
          onKeyDown={(event) => handleModeCardKeyDown(event, handleSelectGuidedMode)}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-5xl border border-accent-teal/15 opacity-60 motion-safe:animate-[pulse-slow_4s_ease-in-out_infinite]"
            style={{ animationDelay: "0.45s" }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-teal">Guided Mode</p>
              <span className="rounded-full border border-accent-teal/30 bg-accent-teal/10 px-2.5 py-0.5 text-label font-semibold text-accent-teal">~4 min, 4 steps</span>
            </div>
            <p className="mt-4 text-xl font-semibold text-foreground">I&apos;m still figuring things out</p>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Answer 4 short questions, one at a time, and we&apos;ll reveal the sharpest part of the draft before signup. Usually 3–4 minutes.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-teal">
              Start here
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Free forever &middot; No credit card required
      </p>

      <IcpSamplePreviewSection />

      <div className="mt-14 sm:mt-16">
        <PageFAQSection
          title="FAQ"
          description="If this is your first time defining an ICP, start here before choosing Fast Mode or Guided Mode."
          faqs={ICP_BUILDER_FAQS}
        />
      </div>
    </div>
  );

  const renderQuestionShell = (content: React.ReactNode) => {
    const guidedStep = GUIDED_SCREEN_ORDER.indexOf(session.currentScreen);
    const isGuided = guidedStep >= 0;
    const guidedPct = isGuided ? ((guidedStep + 1) / GUIDED_SCREEN_ORDER.length) * 100 : 0;

    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-28 pt-32 text-foreground sm:px-6 md:pt-36">
        <div className="mb-8 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-white/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-white dark:bg-slate-950/70 dark:hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!getPreviousScreen(session.currentScreen, session.mode)}
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              {isGuided && (
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Question {guidedStep + 1} of {GUIDED_SCREEN_ORDER.length}
                </span>
              )}
            </div>
            <span className="select-none text-label text-muted-foreground/60">Auto-saved</span>
          </div>
          {isGuided && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-border/40">
              <div
                className="h-full rounded-full bg-accent-teal transition-all duration-500 ease-out"
                style={{ width: `${guidedPct}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex-1">{content}</div>

        <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-[60] border-t border-border/60 bg-background/92 px-4 py-4 backdrop-blur sm:static sm:mt-12 sm:border-t-0 sm:bg-transparent sm:px-0 sm:py-0">
          {synthesisError ? (
            <div className="relative z-[70] mx-auto mb-3 max-w-3xl rounded-2xl border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
              <span className="font-semibold">
                {session.currentScreen === "guided_seed" ? "Analysis failed." : "Generation failed."}
              </span>{" "}
              {synthesisError}
            </div>
          ) : null}
          <div className="relative z-[70] mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{getEnterHint(session.currentScreen)}</div>
            <Button
              type="button"
              className="relative z-[80] h-12 min-w-[180px] self-end text-base font-semibold"
              onClick={() => void handleContinue()}
              disabled={loadingPhase !== null || !canContinue}
            >
              {loadingPhase === "synthesis" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Building your draft...
                </>
              ) : synthesisError ? (
                "Try again"
              ) : session.currentScreen === "guided_workaround" || session.currentScreen === "fast_input" ? (
                "Generate my free draft"
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderFastInput = () =>
    renderQuestionShell(
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-teal">Fast Mode</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
          <p className="text-base leading-7 text-muted-foreground">
            The more detail you give, the better your ICP Draft will be. 3–5 sentences is ideal.
          </p>
        </div>

        <div className="space-y-2">
          <Textarea
            ref={fastInputRef}
            rows={8}
            value={session.fastDescription}
            onChange={(event) => {
              if (!hasStartedTypingRef.current) {
                hasStartedTypingRef.current = true;
                icpStartedAtRef.current = Date.now();
                trackICPBuilderStarted({ page_path: "/icp-builder", mode: session.mode, userId: user?.id });
              }
              setSession((previous) => ({
                ...previous,
                fastDescription: event.target.value,
              }));
            }}
            onKeyDown={handleFieldSubmit}
            placeholder="e.g. I'm building a client feedback tool for freelance designers. Right now they manage revisions through email and WhatsApp, which causes things to get lost and makes them look unprofessional. My tool puts all revision feedback in one place with version tracking. I'm a freelance designer myself so I know this market well."
            className="min-h-[280px] rounded-5xl border-border/60 bg-white/85 px-5 py-5 text-base leading-7 shadow-sm dark:bg-slate-950/70"
          />
          {session.fastDescription.length > 0 ? (
            <p className={`px-1 text-xs transition-colors ${fastWordCount >= 30 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {fastWordCount >= 30 ? "✓ Ready to generate" : `${fastWordCount} / 30 words minimum`}
            </p>
          ) : null}
        </div>
      </div>,
    );

  const renderGuidedScreen = () => {
    const suggestedPain = session.guided.pain || session.personaSuggestion?.suggestedPain || "";

    switch (session.currentScreen) {
      case "guided_seed":
        return renderQuestionShell(
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-teal">Guided Mode</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
              <p className="text-base leading-7 text-muted-foreground">
                One or two sentences is enough. We&apos;ll predict the customer first, then pressure-test their pain and workaround.
              </p>
            </div>

            <Textarea
              ref={guidedSeedRef}
              rows={3}
              value={session.guided.seed || ""}
              onChange={(event) => updateQuickstartSeed(event.target.value)}
              onKeyDown={handleFieldSubmit}
              placeholder="e.g. A tool that helps freelancers manage client feedback without drowning in email threads"
              className="rounded-5xl border-border/60 bg-white/85 px-5 py-5 text-base leading-7 shadow-sm dark:bg-slate-950/70"
            />
          </div>,
        );

      case "guided_persona":
        return renderQuestionShell(
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-teal">Predicted ICP</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
              <p className="text-base leading-7 text-muted-foreground">
                We used your idea to draft the most likely early customer. Keep it if it feels right, or edit the details.
              </p>
            </div>

            <div className="space-y-4 rounded-5xl border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur dark:bg-slate-950/70">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-teal">Best-fit customer</p>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">{session.guided.persona?.role || "Ideal customer"}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{session.guided.persona?.industry || "Industry"}</p>
                    <p className="text-sm text-muted-foreground">{session.guided.persona?.experience || "Experience band"}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  onClick={() => setIsPersonaEditorOpen((value) => !value)}
                >
                  {isPersonaEditorOpen ? "Looks right" : "Edit details"}
                </button>
              </div>

              {suggestedPain ? (
                <div className="rounded-3xl border border-accent-teal/20 bg-accent-teal/10 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f5b64] dark:text-[#8fe6ef]">Pain we expect first</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{suggestedPain}</p>
                </div>
              ) : null}

              {isPersonaEditorOpen ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground/85">Role</label>
                    <Input
                      value={session.guided.persona?.role || ""}
                      onChange={(event) =>
                        updateGuided("persona", {
                          role: event.target.value,
                          industry: session.guided.persona?.industry || "",
                          experience: session.guided.persona?.experience || "",
                        })
                      }
                      onKeyDown={handleFieldSubmit}
                      placeholder="Freelance Graphic Designer"
                      className="h-12 rounded-xl border-border/60 bg-sky-50/70 dark:bg-slate-900/70"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground/85">Industry</label>
                    <Input
                      value={session.guided.persona?.industry || ""}
                      onChange={(event) =>
                        updateGuided("persona", {
                          role: session.guided.persona?.role || "",
                          industry: event.target.value,
                          experience: session.guided.persona?.experience || "",
                        })
                      }
                      onKeyDown={handleFieldSubmit}
                      placeholder="Creative Services"
                      className="h-12 rounded-xl border-border/60 bg-sky-50/70 dark:bg-slate-900/70"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground/85">Experience</label>
                    <Input
                      value={session.guided.persona?.experience || ""}
                      onChange={(event) =>
                        updateGuided("persona", {
                          role: session.guided.persona?.role || "",
                          industry: session.guided.persona?.industry || "",
                          experience: event.target.value,
                        })
                      }
                      onKeyDown={handleFieldSubmit}
                      placeholder="2–5 years, working solo or with 1 assistant"
                      className="h-12 rounded-xl border-border/60 bg-sky-50/70 dark:bg-slate-900/70"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Continue if this looks directionally right. You can sharpen the positioning and founder edge after you unlock the full draft.
                </p>
              )}
            </div>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
                onClick={handleSkipPersona}
              >
                Skip for now →
              </button>
            </div>
          </div>,
        );

      case "guided_pain":
        return renderQuestionShell(
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-teal">Guided Mode</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
              <p className="text-base leading-7 text-muted-foreground">
                Think about the moment this customer gets most frustrated. What breaks, what gets delayed, or what makes them look bad?
              </p>
            </div>

            <Textarea
              rows={3}
              value={session.guided.pain || ""}
              onChange={(event) => updateGuided("pain", event.target.value)}
              onKeyDown={handleFieldSubmit}
              placeholder="e.g. They lose clients because revision feedback is scattered across email, WhatsApp, and voice notes — and nothing gets tracked"
              className="rounded-5xl border-border/60 bg-white/85 px-5 py-5 text-base leading-7 shadow-sm dark:bg-slate-950/70"
            />
          </div>,
        );

      case "guided_workaround":
        return renderQuestionShell(
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-teal">Guided Mode</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
              <p className="text-base leading-7 text-muted-foreground">
                Even if it&apos;s messy. Email, spreadsheets, agencies, WhatsApp, or just brute force all count.
              </p>
            </div>
            <Textarea
              rows={3}
              value={session.guided.workaround || ""}
              onChange={(event) => updateGuided("workaround", event.target.value)}
              onKeyDown={handleFieldSubmit}
              placeholder="e.g. A mix of email threads, Google Drive comments, and hoping clients remember what they said"
              className="rounded-5xl border-border/60 bg-white/85 px-5 py-5 text-base leading-7 shadow-sm dark:bg-slate-950/70"
            />
            <p className="text-sm leading-6 text-muted-foreground">
              We&apos;ll use this to generate your preview now. You can sharpen solution angle, founder edge, and market context after you unlock the full draft.
            </p>
          </div>,
        );

      default:
        return null;
    }
  };

  const continueToDashboard = useCallback(() => {
    setShowPostIcpNudge(false);
    setPendingPostIcpNudge(false);
    navigate(pendingNavigatePath || "/dashboard", { replace: true });
  }, [navigate, pendingNavigatePath]);

  const handlePostIcpStarterUpgrade = useCallback(async () => {
    trackUpgradeClicked({
      from_plan: normalizePlanId(subscriptionTier),
      to_plan: "STARTER",
      location: "post_icp_nudge",
    });

    setIsStarterCheckoutLoading(true);
    try {
      await createCheckout("starter", undefined, "monthly");
    } catch (error) {
      console.error("Starter checkout failed from post-ICP nudge", error);
      toast({
        title: "Unable to open checkout",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsStarterCheckoutLoading(false);
    }
  }, [createCheckout, subscriptionTier, toast]);

  if (showCelebration) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur">
        <div
          className="flex flex-col items-center gap-4 text-center"
          style={{ animation: "fadeInScale 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
          <p className="text-5xl" role="img" aria-label="Celebration">🎉</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Your ICP is ready</h1>
          {celebrationPushOffer ? (
            <>
              <p className="max-w-sm text-sm text-muted-foreground">
                Tomorrow's validation step builds on this. Want a nudge when it's ready?
              </p>
              <div className="flex items-center gap-2">
                <Button onClick={handleEnablePushAfterIcp} disabled={webPush.isBusy}>
                  {webPush.isBusy ? "Enabling…" : "Notify me"}
                </Button>
                <Button variant="ghost" onClick={proceedAfterCelebration} disabled={webPush.isBusy}>
                  Continue
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Taking you to your dashboard...</p>
          )}
        </div>
        <style>{`@keyframes fadeInScale { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }`}</style>
      </div>
    );
  }

  if (showPostIcpNudge) {
    return (
      <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
        <Card className="w-full max-w-[480px] border-2 border-blue-500/70 bg-background shadow-2xl">
          <CardContent className="space-y-6 p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Your ICP is live. Now validate the demand behind it.
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Starter gives you 100 credits/month, PMF Lab, Email Templates, and deeper research access so you can turn your ICP into real validation.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="flex-1"
                onClick={() => void handlePostIcpStarterUpgrade()}
                disabled={isStarterCheckoutLoading}
              >
                {isStarterCheckoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Upgrade to Starter - $9/mo
              </Button>
              <Button variant="ghost" onClick={continueToDashboard}>
                Skip for now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isHydratingEdit || isHydratingResume) {
    return (
      <div className="min-h-screen bg-transparent">
        <IcpProgressBar progress={0} shellOffset />
        <div className="flex min-h-screen items-center justify-center px-6">
          <Card className="rounded-5xl border-border/60 bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/75">
            <CardContent className="flex items-center gap-3 px-6 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {isHydratingEdit ? "Restoring your ICP Draft for editing..." : "Restoring your ICP Draft..."}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loadingPhase === "seed_loading") {
    return (
      <div className="min-h-screen bg-transparent">
        <IcpProgressBar progress={progress} pulse shellOffset />
        <div className="flex min-h-screen items-center justify-center px-6 text-center">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-teal">Guided Mode</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Analysing your idea...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (loadingPhase === "synthesis") {
    return (
      <div className="min-h-screen bg-transparent">
        <IcpProgressBar progress={progress} pulse shellOffset />
        <IcpSynthesisLoader
          elapsedMs={synthesisElapsedMs}
          fallbackEmail={fallbackEmail}
          fallbackEmailError={fallbackEmailError}
          fallbackState={fallbackEmailState}
          onFallbackEmailChange={(value) => {
            setFallbackEmail(value);
            if (fallbackEmailError) {
              setFallbackEmailError(null);
            }
          }}
          onFallbackEmailSubmit={handleFallbackEmailSubmit}
        />
      </div>
    );
  }

  if (session.currentScreen === "gate" && session.draftPreview) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-transparent">
        <IcpProgressBar progress={progress} shellOffset />
        <div className="relative z-10 pt-24 sm:pt-28 md:pt-32">
          {persistError ? (
            <div className="mx-auto mb-4 max-w-3xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-destructive">
                  <span className="font-semibold">We couldn&apos;t save your draft.</span> {persistError}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={isPersisting}
                  onClick={() => void persistDraftAndContinue()}
                >
                  {isPersisting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Retry saving draft"}
                </Button>
              </div>
            </div>
          ) : null}
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
            <IcpGuestResultView
              artifact={session.draftPreview}
              seed={session.mode === "fast" ? session.fastDescription : session.guided.seed}
              returnPath={unlockPath}
              onBeforeAuthContinue={() => persistIcpBuilderSession(session)}
              onEmailLinkRequest={(email) => requestResumeLink({ email, source: "unlock_gate", includeArtifact: true })}
            />
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <IcpProgressBar progress={progress} shellOffset />

      {session.currentScreen === "mode_select" ? renderModeSelect() : null}
      {session.currentScreen === "fast_input" ? renderFastInput() : null}
      {session.currentScreen !== "mode_select" &&
      session.currentScreen !== "fast_input" &&
      session.currentScreen !== "gate"
        ? renderGuidedScreen()
        : null}

      {showLegacy && legacyAnalysis ? (
        <div className="mx-auto max-w-4xl px-4 pb-10 sm:px-6">
          <Card className="rounded-5xl border-border/60 bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/75">
            <CardContent className="space-y-4 p-6 text-sm leading-7 text-muted-foreground">
              <p className="font-semibold text-foreground">Legacy analysis</p>
              <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                {JSON.stringify(legacyAnalysis, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {(session.currentScreen === "fast_input" || session.currentScreen.startsWith("guided_")) && session.mode ? (
        <div className="fixed right-3 top-[92px] z-40 sm:right-6 sm:top-[100px] md:top-[108px]">
          <Button type="button" variant="ghost" className="border border-border/60 bg-background/90 text-muted-foreground shadow-sm backdrop-blur hover:bg-background" onClick={resetBuilder}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Start over
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default ICPBuilder;
