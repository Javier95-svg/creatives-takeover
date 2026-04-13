import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, RotateCcw } from "lucide-react";

import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { IcpProgressBar } from "@/components/icp/IcpProgressBar";
import { IcpSynthesisLoader } from "@/components/icp/IcpSynthesisLoader";
import { IcpUnlockGate } from "@/components/icp/IcpUnlockGate";
import Footer from "@/components/Footer";
import PageFAQSection from "@/components/seo/PageFAQSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActivationJourney } from "@/hooks/useActivationJourney";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { captureEvent, trackICPBuilderCompleted, trackICPBuilderModeSelected, trackICPBuilderStarted, trackICPBuilderStepCompleted } from "@/lib/analytics";
import {
  fastIcpInputSchema,
  guidedIcpInputSchema,
  ICP_MARKET_CONTEXT_OPTIONS,
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
import { consumeStoredIcpSeed, normalizeIcpSeed } from "@/lib/icpSeed";
import { markFirstArtifactCreated, sendRetentionEmail } from "@/lib/retentionSystem";

const ICP_RESULTS_TABLE = "icp_analysis_results";
const SEED_TIMEOUT_MS = 20000;
const PREVIEW_TIMEOUT_MS = 45000;
const SAVE_TIMEOUT_MS = 55000;
const SEED_ANALYSIS_MIN_MS = 2200;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GUIDED_SCREEN_ORDER: IcpFlowScreen[] = [
  "guided_seed",
  "guided_persona",
  "guided_specificity",
  "guided_pain",
  "guided_workaround",
  "guided_solution",
  "guided_market_context",
  "guided_founder_edge",
];

const PROGRESS_BY_SCREEN: Record<IcpFlowScreen | "seed_loading" | "synthesis", number> = {
  mode_select: 0,
  fast_input: 50,
  guided_seed: 10,
  guided_persona: 22,
  guided_specificity: 34,
  guided_pain: 46,
  guided_workaround: 58,
  guided_solution: 70,
  guided_market_context: 82,
  guided_founder_edge: 94,
  seed_loading: 22,
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
    return mode === "fast" ? "fast_input" : "guided_founder_edge";
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
    case "guided_specificity":
      return "Now narrow it down. Who exactly?";
    case "guided_pain":
      return "What specific problem does this person face that drives them crazy?";
    case "guided_workaround":
      return `What does ${role} use today to deal with this problem?`;
    case "guided_solution":
      return "In one sentence, what does your product do for them?";
    case "guided_market_context":
      return "Which best describes your competitive landscape?";
    case "guided_founder_edge":
      return "Why are you the right person to build this?";
    default:
      return "";
  }
}

function getEnterHint(screen: IcpFlowScreen) {
  if (screen === "guided_market_context" || screen === "mode_select") return "";
  return "Press Enter ↵";
}

const ICPBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshActivation } = useActivationJourney("stage_i");

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

  const unlockPath = buildIcpUnlockReturnPath();
  const editDraftId = searchParams.get("edit");
  const resumeToken = searchParams.get("resume");
  const progress = getDisplayProgress(session.currentScreen, loadingPhase);
  const synthesisElapsedMs = loadingPhase === "synthesis" && loadingStartedAt ? Date.now() - loadingStartedAt : 0;

  const validatedGuided = useMemo(() => guidedIcpInputSchema.safeParse(session.guided), [session.guided]);
  const validatedFast = useMemo(() => fastIcpInputSchema.safeParse({ description: session.fastDescription }), [session.fastDescription]);

  useEffect(() => {
    persistIcpBuilderSession(session);
  }, [session]);

  useEffect(() => {
    if (!loadingStartedAt || loadingPhase !== "synthesis") return;

    const timer = window.setInterval(() => {
      setLoadingStartedAt((value) => (value ? value : Date.now()));
    }, 250);

    return () => window.clearInterval(timer);
  }, [loadingPhase, loadingStartedAt]);

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
          throw error || new Error(payload?.error || "We could not restore that ICP Draft.");
        }

        const restoredSession = buildBuilderSessionFromArtifact(payload.artifact, null);
        setSession({
          ...restoredSession,
          currentScreen: "gate",
          draftPreview: payload.artifact,
          unlockRequired: true,
        });
      } catch (error) {
        toast({
          title: "Draft unavailable",
          description: error instanceof Error ? error.message : "We could not restore that ICP Draft.",
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
        return validatedFast.success;
      case "guided_seed":
        return (session.guided.seed || "").trim().length >= 8;
      case "guided_persona":
        return Boolean(
          session.guided.persona?.role?.trim() &&
            session.guided.persona?.industry?.trim() &&
            session.guided.persona?.experience?.trim(),
        );
      case "guided_specificity":
        return (session.guided.specificity || "").trim().length >= 8;
      case "guided_pain":
        return (session.guided.pain || "").trim().length >= 12;
      case "guided_workaround":
        return (session.guided.workaround || "").trim().length >= 6;
      case "guided_solution":
        return (session.guided.solutionCompletion || "").trim().length >= 6;
      case "guided_market_context":
        return Boolean(session.guided.marketContext);
      case "guided_founder_edge":
        return (session.guided.founderEdge || "").trim().length >= 12;
      default:
        return false;
    }
  }, [session, validatedFast.success]);

  const updateGuided = <K extends keyof IcpBuilderSession["guided"]>(field: K, value: IcpBuilderSession["guided"][K]) => {
    setSession((previous) => ({
      ...previous,
      guided: {
        ...previous.guided,
        [field]: value,
      },
    }));
  };

  const resetBuilder = () => {
    clearIcpBuilderSession();
    setSession(createEmptyIcpBuilderSession());
    setLegacyAnalysis(null);
    setLegacyAvailable(false);
    setShowLegacy(false);
    navigate("/icp-builder", { replace: true });
  };

  const invokeSeedPrefill = async () => {
    const seed = (session.guided.seed || "").trim();
    if (seed.length < 8) {
      toast({
        title: "Add a rough idea first",
        description: "One or two sentences are enough to start.",
        variant: "destructive",
      });
      return;
    }

    setLoadingPhase("seed_loading");
    setLoadingStartedAt(Date.now());

    try {
      const [{ data, error }] = await Promise.all([
        withTimeout(
          supabase.functions.invoke("icp-analyzer", {
            body: {
              operation: "seed_prefill",
              seed,
            },
          }),
          SEED_TIMEOUT_MS,
        ),
        new Promise((resolve) => window.setTimeout(resolve, SEED_ANALYSIS_MIN_MS)),
      ]);

      if (error || !(data as SeedPrefillResponse | null)?.success || !(data as SeedPrefillResponse | null)?.persona) {
        throw error || new Error((data as SeedPrefillResponse | null)?.error || "We could not analyse the idea yet.");
      }

      const persona = (data as SeedPrefillResponse).persona as IcpPersonaSuggestion;
      setSession((previous) => ({
        ...previous,
        personaSuggestion: persona,
        mode: "guided",
        guided: {
          ...previous.guided,
          persona: {
            role: persona.role,
            industry: persona.industry,
            experience: persona.experience,
          },
        },
        currentScreen: "guided_persona",
      }));
    } catch (error) {
      toast({
        title: "Could not analyse the idea",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPhase(null);
      setLoadingStartedAt(null);
    }
  };

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

    setLoadingPhase("synthesis");
    setLoadingStartedAt(Date.now());
    setFallbackEmailError(null);
    setFallbackEmailState("idle");

    try {
      trackICPBuilderStarted({ page_path: "/icp-builder", mode });
      captureEvent("icp_builder_started", {
        page_path: "/icp-builder",
        entry_mode: mode,
        isAuthenticated: Boolean(user),
      });

      const { data, error } = await withTimeout(
        supabase.functions.invoke("icp-analyzer", { body }),
        persist ? SAVE_TIMEOUT_MS : PREVIEW_TIMEOUT_MS,
      );

      if (error || !data?.success || data.status !== "draft_ready" || !data.artifact) {
        throw error || new Error(data?.error || "Draft generation failed.");
      }

      const artifact = data.artifact as StoredIcpArtifact;

      if (!persist) {
        setSession((previous) => ({
          ...previous,
          draftPreview: artifact,
          unlockRequired: true,
          currentScreen: "gate",
        }));
        return;
      }

      const analysisId = typeof data.analysisId === "string" ? data.analysisId : null;
      if (!analysisId) {
        throw new Error("The saved ICP Draft is missing its analysis id.");
      }

      setSession((previous) => ({
        ...previous,
        draftPreview: artifact,
        unlockRequired: false,
        savedAnalysisId: analysisId,
      }));

      if (user) {
        await markFirstArtifactCreated({
          userId: user.id,
          artifactType: "icp_analysis",
          artifactId: analysisId,
          label: artifact.draftDocument.customer.personaName,
          resumeUrl: `/icp/draft/${analysisId}`,
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

        const { error: bootstrapError } = await supabase.functions.invoke("bootstrap-icp-dashboard", {
          body: { analysisId },
        });

        if (bootstrapError) {
          throw bootstrapError;
        }
      }

      await refreshActivation();
      trackICPBuilderCompleted({
        page_path: "/icp-builder",
        mode,
        confidence: artifact.draftDocument.confidence.level,
      });

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("ICP draft generation failed", error);
      toast({
        title: persist ? "Could not finish the dashboard handoff" : "Could not build the draft",
        description:
          error instanceof Error
            ? error.message
            : persist
              ? "The draft was saved, but the dashboard setup did not finish."
              : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPhase(null);
      setLoadingStartedAt(null);
    }
  }, [navigate, refreshActivation, session.mode, session.personaEditedSignificantly, toast, user, validatedFast, validatedGuided]);

  const persistDraftAndContinue = useCallback(async () => {
    if (isPersisting) return;
    setIsPersisting(true);
    try {
      if (user && session.draftPreview && session.unlockRequired) {
        const { data, error } = await withTimeout(
          supabase.functions.invoke("icp-analyzer", {
            body: {
              operation: "save_existing_artifact",
              artifact: session.draftPreview,
            },
          }),
          SAVE_TIMEOUT_MS,
        );

        if (error || !data?.success || data.status !== "draft_ready" || !data.analysisId) {
          throw error || new Error(data?.error || "Could not save the unlocked ICP Draft.");
        }

        const analysisId = data.analysisId as string;
        const artifact = (data.artifact as StoredIcpArtifact) ?? session.draftPreview;

        setSession((previous) => ({
          ...previous,
          draftPreview: artifact,
          unlockRequired: false,
          savedAnalysisId: analysisId,
        }));

        await markFirstArtifactCreated({
          userId: user.id,
          artifactType: "icp_analysis",
          artifactId: analysisId,
          label: artifact.draftDocument.customer.personaName,
          resumeUrl: `/icp/draft/${analysisId}`,
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

        const { error: bootstrapError } = await supabase.functions.invoke("bootstrap-icp-dashboard", {
          body: { analysisId },
        });

        if (bootstrapError) {
          throw bootstrapError;
        }

        await refreshActivation();
        trackICPBuilderCompleted({
          page_path: "/icp-builder",
          mode: session.mode,
          confidence: artifact.draftDocument.confidence.level,
        });

        navigate("/dashboard", { replace: true });
        return;
      }

      await completeDraftGeneration(true);
    } finally {
      setIsPersisting(false);
    }
  }, [completeDraftGeneration, isPersisting, navigate, refreshActivation, session.draftPreview, session.mode, session.unlockRequired, user]);

  useEffect(() => {
    if (!user || !session.draftPreview || !session.unlockRequired || session.savedAnalysisId || isPersisting) {
      return;
    }

    void persistDraftAndContinue();
  }, [isPersisting, persistDraftAndContinue, session.draftPreview, session.savedAnalysisId, session.unlockRequired, user]);

  const handleFallbackEmailSubmit = useCallback(async () => {
    if (fallbackEmailState === "submitting" || fallbackEmailState === "submitted") return;

    const email = fallbackEmail.trim();
    if (!emailRegex.test(email)) {
      setFallbackEmailError("Enter a valid email address.");
      return;
    }

    if ((session.mode === "fast" && !validatedFast.success) || (session.mode === "guided" && !validatedGuided.success)) {
      setFallbackEmailError("Finish the current answers first so we can send the right draft.");
      return;
    }

    setFallbackEmailError(null);
    setFallbackEmailState("submitting");

    try {
      const body =
        session.mode === "fast"
          ? {
              email,
              entryMode: "fast" as const,
              fastInput: validatedFast.data,
            }
          : {
              email,
              entryMode: "guided" as const,
              guidedInput: validatedGuided.data,
              personaEditedSignificantly: session.personaEditedSignificantly,
            };

      const { data, error } = await supabase.functions.invoke("request-icp-draft-email", {
        body,
      });
      const payload = data as QueueEmailDraftResponse | null;

      if (error || !payload?.success) {
        throw error || new Error(payload?.error || "We could not queue the email draft.");
      }

      setFallbackEmailState("submitted");
      toast({
        title: "Email queued",
        description: "We’ll send you a link to resume and unlock this ICP Draft.",
      });
    } catch (error) {
      setFallbackEmailState("idle");
      setFallbackEmailError(error instanceof Error ? error.message : "We could not queue the email draft.");
    }
  }, [
    fallbackEmail,
    fallbackEmailState,
    session.mode,
    session.personaEditedSignificantly,
    toast,
    validatedFast,
    validatedGuided,
  ]);

  const trackStepCompleted = (screen: IcpFlowScreen) => {
    const stepIndexMap: Partial<Record<IcpFlowScreen, number>> = {
      fast_input: 1,
      guided_seed: 1,
      guided_persona: 2,
      guided_specificity: 3,
      guided_pain: 4,
      guided_workaround: 5,
      guided_solution: 6,
      guided_market_context: 7,
      guided_founder_edge: 8,
    };
    const index = stepIndexMap[screen];
    if (!index || !session.mode) return;
    trackICPBuilderStepCompleted({
      step: screen,
      step_index: index,
      mode: session.mode,
      is_authenticated: Boolean(user),
    });
  };

  const handleContinue = async () => {
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
        currentScreen: "guided_specificity",
      }));
      return;
    }

    if (session.currentScreen === "guided_founder_edge") {
      trackStepCompleted("guided_founder_edge");
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
      event.preventDefault();
    }
    void handleContinue();
  };

  const renderModeSelect = () => (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 pb-20 pt-32 text-foreground sm:px-6 md:pt-36">
      <div className="space-y-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">ICP Builder</p>
        <h1 className="takeover-gradient creatives-font pb-3 text-4xl font-semibold leading-[1.12] tracking-tight sm:pb-4 sm:text-5xl">
          Get your ICP Draft
        </h1>
        <p className="mx-auto max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
          This takes about 5 minutes. You'll walk away with a clear picture of your ideal customer, their main pain
          points, and how to position your offer in the market.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <button
          type="button"
          className="group relative overflow-hidden rounded-[2rem] border border-border/60 bg-white/80 p-6 text-left shadow-[0_28px_90px_-52px_rgba(15,23,42,0.3)] backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:border-[#32b8c6]/40 hover:shadow-[0_32px_100px_-54px_rgba(50,184,198,0.4)] motion-safe:animate-[glow_4.8s_ease-in-out_infinite_alternate] dark:bg-slate-950/70"
          onClick={() => {
            trackICPBuilderModeSelected({ mode: "fast", is_authenticated: Boolean(user) });
            setSession((previous) => ({
              ...previous,
              mode: "fast",
              currentScreen: "fast_input",
            }));
          }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-[#32b8c6]/15 opacity-60 motion-safe:animate-[pulse-slow_4s_ease-in-out_infinite]" />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#32b8c6]">Fast Mode</p>
          <p className="mt-4 text-xl font-semibold text-foreground">I can describe my startup idea clearly</p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Paste a paragraph about your idea and get your ICP Draft in under 60 seconds.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#32b8c6]">
            Start here
            <ArrowRight className="h-4 w-4" />
          </div>
        </button>

        <button
          type="button"
          className="group relative overflow-hidden rounded-[2rem] border border-border/60 bg-white/80 p-6 text-left shadow-[0_28px_90px_-52px_rgba(15,23,42,0.3)] backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:border-[#32b8c6]/40 hover:shadow-[0_32px_100px_-54px_rgba(50,184,198,0.4)] motion-safe:animate-[glow_4.8s_ease-in-out_infinite_alternate] dark:bg-slate-950/70"
          style={{ animationDelay: "0.45s" }}
          onClick={() => {
            trackICPBuilderModeSelected({ mode: "guided", is_authenticated: Boolean(user) });
            setSession((previous) => ({
              ...previous,
              mode: "guided",
              currentScreen: "guided_seed",
              guided: previous.guided.seed ? previous.guided : buildEmptyGuidedAnswers(previous.fastDescription),
            }));
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-[2rem] border border-[#32b8c6]/15 opacity-60 motion-safe:animate-[pulse-slow_4s_ease-in-out_infinite]"
            style={{ animationDelay: "0.45s" }}
          />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#32b8c6]">Guided Mode</p>
          <p className="mt-4 text-xl font-semibold text-foreground">I'm still figuring things out</p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Answer 8 simple questions, one at a time, and we'll build the draft together.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#32b8c6]">
            Start here
            <ArrowRight className="h-4 w-4" />
          </div>
        </button>
      </div>

      <div className="mt-14 sm:mt-16">
        <PageFAQSection
          title="FAQ"
          description="If this is your first time defining an ICP, start here before choosing Fast Mode or Guided Mode."
          faqs={ICP_BUILDER_FAQS}
        />
      </div>
    </div>
  );

  const renderQuestionShell = (content: React.ReactNode) => (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-28 pt-32 text-foreground sm:px-6 md:pt-36">
      <div className="mb-8 flex items-center gap-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-white/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-white dark:bg-slate-950/70 dark:hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!getPreviousScreen(session.currentScreen, session.mode)}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1">{content}</div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/92 px-4 py-4 backdrop-blur sm:static sm:mt-12 sm:border-t-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{getEnterHint(session.currentScreen)}</div>
          <Button
            type="button"
            className="h-12 min-w-[180px] self-end text-base font-semibold"
            onClick={() => void handleContinue()}
            disabled={!canContinue || loadingPhase !== null}
          >
            {loadingPhase === "synthesis" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Building your draft...
              </>
            ) : session.currentScreen === "guided_founder_edge" || session.currentScreen === "fast_input" ? (
              "Generate my ICP Draft"
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

  const renderFastInput = () =>
    renderQuestionShell(
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Fast Mode</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
          <p className="text-base leading-7 text-muted-foreground">
            The more detail you give, the better your ICP Draft will be. 3–5 sentences is ideal.
          </p>
        </div>

        <Textarea
          rows={8}
          value={session.fastDescription}
          onChange={(event) =>
            setSession((previous) => ({
              ...previous,
              fastDescription: event.target.value,
            }))
          }
          onKeyDown={handleFieldSubmit}
          placeholder="e.g. I'm building a client feedback tool for freelance designers. Right now they manage revisions through email and WhatsApp, which causes things to get lost and makes them look unprofessional. My tool puts all revision feedback in one place with version tracking. I'm a freelance designer myself so I know this market well."
          className="min-h-[280px] rounded-[2rem] border-border/60 bg-white/85 px-5 py-5 text-base leading-7 shadow-sm dark:bg-slate-950/70"
        />
      </div>,
    );

  const renderGuidedScreen = () => {
    const role = session.guided.persona?.role || session.personaSuggestion?.role || "Freelance graphic designers";

    switch (session.currentScreen) {
      case "guided_seed":
        return renderQuestionShell(
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Guided Mode</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
              <p className="text-base leading-7 text-muted-foreground">One or two sentences. Don't overthink it — rough is fine.</p>
            </div>

            <Textarea
              rows={3}
              value={session.guided.seed || ""}
              onChange={(event) => updateGuided("seed", event.target.value)}
              onKeyDown={handleFieldSubmit}
              placeholder="e.g. A tool that helps freelancers manage client feedback without drowning in email threads"
              className="rounded-[2rem] border-border/60 bg-white/85 px-5 py-5 text-base leading-7 shadow-sm dark:bg-slate-950/70"
            />
          </div>,
        );

      case "guided_persona":
        return renderQuestionShell(
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Guided Mode</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
              <p className="text-base leading-7 text-muted-foreground">Edit anything that doesn't feel right.</p>
            </div>

            <div className="space-y-4 rounded-[2rem] border border-border/60 bg-white/80 p-5 shadow-sm backdrop-blur dark:bg-slate-950/70">
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
                  placeholder="2–5 years, working solo or with 1 assistant"
                  className="h-12 rounded-xl border-border/60 bg-sky-50/70 dark:bg-slate-900/70"
                />
              </div>
            </div>
          </div>,
        );

      case "guided_specificity":
        return renderQuestionShell(
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Guided Mode</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
              <p className="text-base leading-7 text-muted-foreground">
                "Small business owners" is too broad. "{role} with [specific constraint]" is better.
              </p>
            </div>
            <Input
              value={session.guided.specificity || ""}
              onChange={(event) => updateGuided("specificity", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleContinue();
                }
              }}
              placeholder={`e.g. ${role} who manage 3+ client projects at once`}
              className="h-14 rounded-[1.5rem] border-border/60 bg-white/85 px-5 text-base shadow-sm dark:bg-slate-950/70"
            />
          </div>,
        );

      case "guided_pain":
        return renderQuestionShell(
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Guided Mode</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
              <p className="text-base leading-7 text-muted-foreground">
                Think about a moment of frustration. What makes them want to throw their laptop? What do they complain about to friends?
              </p>
            </div>

            <Textarea
              rows={3}
              value={session.guided.pain || ""}
              onChange={(event) => updateGuided("pain", event.target.value)}
              onKeyDown={handleFieldSubmit}
              placeholder="e.g. They lose clients because revision feedback is scattered across email, WhatsApp, and voice notes — and nothing gets tracked"
              className="rounded-[2rem] border-border/60 bg-white/85 px-5 py-5 text-base leading-7 shadow-sm dark:bg-slate-950/70"
            />
          </div>,
        );

      case "guided_workaround":
        return renderQuestionShell(
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Guided Mode</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
              <p className="text-base leading-7 text-muted-foreground">
                Even if it's messy — email, spreadsheets, WhatsApp, sticky notes, or nothing at all.
              </p>
            </div>
            <Input
              value={session.guided.workaround || ""}
              onChange={(event) => updateGuided("workaround", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleContinue();
                }
              }}
              placeholder="e.g. A mix of email threads, Google Drive comments, and hoping clients remember what they said"
              className="h-14 rounded-[1.5rem] border-border/60 bg-white/85 px-5 text-base shadow-sm dark:bg-slate-950/70"
            />
          </div>,
        );

      case "guided_solution":
        return renderQuestionShell(
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Guided Mode</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
              <p className="text-base leading-7 text-muted-foreground">Complete this: "My product helps {role} to ___"</p>
            </div>

            <div className="rounded-[2rem] border border-border/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:bg-slate-950/70">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <span className="rounded-xl bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">
                  My product helps {role} to
                </span>
                <Input
                  value={session.guided.solutionCompletion || ""}
                  onChange={(event) => updateGuided("solutionCompletion", event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleContinue();
                    }
                  }}
                  placeholder="centralize client feedback without context switching"
                  className="h-14 rounded-[1.25rem] border-border/60 bg-white/85 px-4 text-base dark:bg-slate-950/70"
                />
              </div>
            </div>
          </div>,
        );

      case "guided_market_context":
        return renderQuestionShell(
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Guided Mode</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
            </div>

            <div className="space-y-3">
              {ICP_MARKET_CONTEXT_OPTIONS.map((option) => {
                const selected = session.guided.marketContext === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateGuided("marketContext", option.value)}
                    className={`w-full rounded-[1.5rem] border px-5 py-5 text-center text-sm font-medium transition-colors sm:text-base ${
                      selected
                        ? "border-[#32b8c6] bg-[#32b8c6] text-white"
                        : "border-border/60 bg-white/80 text-foreground hover:border-border dark:bg-slate-950/70"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>,
        );

      case "guided_founder_edge":
        return renderQuestionShell(
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Guided Mode</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{getScreenTitle(session.currentScreen, session)}</h1>
              <p className="text-base leading-7 text-muted-foreground">
                Your background, your access to this community, your personal experience with the problem — anything that gives you an unfair advantage.
              </p>
            </div>

            <Textarea
              rows={3}
              value={session.guided.founderEdge || ""}
              onChange={(event) => updateGuided("founderEdge", event.target.value)}
              onKeyDown={handleFieldSubmit}
              placeholder="e.g. I'm a freelance designer myself — I've lost clients because of this exact problem, and I know 50+ designers who feel the same way"
              className="rounded-[2rem] border-border/60 bg-white/85 px-5 py-5 text-base leading-7 shadow-sm dark:bg-slate-950/70"
            />
          </div>,
        );

      default:
        return null;
    }
  };

  if (isHydratingEdit || isHydratingResume) {
    return (
      <div className="min-h-screen bg-transparent">
        <IcpProgressBar progress={0} shellOffset />
        <div className="flex min-h-screen items-center justify-center px-6">
          <Card className="rounded-[2rem] border-border/60 bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/75">
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
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Guided Mode</p>
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
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
            <section className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-white/45 shadow-[0_40px_140px_-80px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:bg-slate-950/45">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(50,184,198,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_top,rgba(50,184,198,0.16),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.24),rgba(15,23,42,0))]" />
              <div className="relative">
                <IcpFolioDocument
                  draft={session.draftPreview.draftDocument}
                  blurred
                  tone="platformPreview"
                  className="pointer-events-none"
                />
              </div>
            </section>
          </div>
          <Footer />
        </div>
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <IcpUnlockGate
            artifact={session.draftPreview}
            seed={session.mode === "fast" ? session.fastDescription : session.guided.seed}
            returnPath={unlockPath}
            onBeforeAuthContinue={() => persistIcpBuilderSession(session)}
            className="pointer-events-auto max-w-xl"
          />
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
          <Card className="rounded-[2rem] border-border/60 bg-white/80 shadow-sm backdrop-blur dark:bg-slate-950/75">
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
