import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SoftGateModal from "@/components/auth/SoftGateModal";
import { captureEvent } from '@/lib/analytics';
import {
  buildHeroClaimReturnPath,
  loadHeroGuestArtifact,
  persistHeroGuestArtifact,
  retryHeroDeepGeneration,
  startHeroIcpGeneration,
  type HeroDecisionBrief,
  type HeroGuestArtifactRef,
} from "@/lib/heroIcpGeneration";
import {
  trackDeepOutputGenerated,
  trackFirstOutputGenerated,
  trackOutputGenerationFailed,
  trackSignupPromptShown,
} from "@/lib/heroFunnel";
import {
  createEmptyIcpBuilderSession,
  persistIcpBuilderSession,
  type IcpBuilderSession,
  type StoredIcpArtifact,
} from "@/lib/icpBuilderSession";
import { persistOutputSignupContext } from "@/lib/outputSignupContext";
import {
  resolveHeroArtifactState,
  type HeroRunState,
} from "@/lib/heroFunnelRules";

interface HeroResultIslandProps {
  description: string;
  runId: number;
  resumeToken?: string | null;
  isAuthenticated: boolean;
  onRetry: () => void;
  onBusyChange?: (busy: boolean) => void;
  onArtifactReady?: (artifact: HeroGuestArtifactRef) => void;
  /**
   * Fires once on mount so the hero can tell "the island is running" from "the
   * lazy chunk never arrived". Without it a stalled import is indistinguishable
   * from a slow generation, and the submit button stays disabled either way.
   */
  onMounted?: () => void;
  /**
   * Terminal failure with nothing to show. The visitor keeps their description
   * and continues in the ICP Builder rather than being left on a dead card.
   */
  onFailureHandoff?: () => void;
}

const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 75_000;

function buildSession(description: string, artifact: StoredIcpArtifact): IcpBuilderSession {
  return {
    ...createEmptyIcpBuilderSession(),
    mode: "fast",
    currentScreen: "gate",
    fastDescription: description || artifact.founderInputs.fastDescription || "",
    draftPreview: artifact,
    unlockRequired: true,
  };
}

export function HeroResultIsland({
  description,
  runId,
  resumeToken: initialResumeToken,
  isAuthenticated,
  onRetry,
  onBusyChange,
  onArtifactReady,
  onMounted,
  onFailureHandoff,
}: HeroResultIslandProps) {
  const [runState, setRunState] = useState<HeroRunState>("compact_generating");
  const [compact, setCompact] = useState<HeroDecisionBrief | null>(null);
  const [artifact, setArtifact] = useState<StoredIcpArtifact | null>(null);
  const [guestRef, setGuestRef] = useState<HeroGuestArtifactRef | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signupOpen, setSignupOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [activeResumeToken, setActiveResumeToken] = useState(initialResumeToken ?? null);
  const [resumeReloadKey, setResumeReloadKey] = useState(0);
  const outputGeneratedAtRef = useRef<number | null>(null);
  const generationStartedAtRef = useRef<number>(Date.now());
  const outputSourceRef = useRef<"homepage_hero" | "homepage_resume">(
    initialResumeToken ? "homepage_resume" : "homepage_hero",
  );
  const promptTrackedRef = useRef<string | null>(null);
  const generationRef = useRef<ReturnType<typeof startHeroIcpGeneration> | null>(null);
  const resultViewed = useRef(false);

  // Announce arrival before any generation work, so the hero's watchdog can
  // stand down the moment the chunk is actually running.
  useEffect(() => {
    onMounted?.();
  // Mount-only: re-firing on prop identity would defeat the point.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyDeepArtifact = useCallback((nextArtifact: StoredIcpArtifact, artifactId: string, startedAt: number) => {
    setArtifact(nextArtifact);
    setRunState("deep_ready");
    setErrorMessage(null);
    const session = buildSession(description, nextArtifact);
    persistIcpBuilderSession(session);
    trackDeepOutputGenerated({
      route: "icp",
      tool: "icp_builder",
      source: "homepage_hero",
      generation_run_id: String(runId),
      anonymous_artifact_id: artifactId,
      latency_ms: Math.max(0, Date.now() - startedAt),
      is_anonymous: !isAuthenticated,
    });
  }, [description, isAuthenticated, runId]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();
    const pollStartedAt = Date.now();
    generationStartedAtRef.current = startedAt;
    outputSourceRef.current = activeResumeToken ? "homepage_resume" : "homepage_hero";

    setRunState("compact_generating");
    setCompact(null);
    setArtifact(null);
    setGuestRef(null);
    setErrorMessage(null);
    onBusyChange?.(true);

    const poll = async (token: string, artifactId: string) => {
      if (cancelled) return;
      try {
        const snapshot = await loadHeroGuestArtifact(token);
        if (cancelled) return;
        if (snapshot.compact && !compact) setCompact(snapshot.compact);
        if (snapshot.artifact) {
          applyDeepArtifact(snapshot.artifact, artifactId, startedAt);
          onBusyChange?.(false);
          return;
        }
        if (snapshot.generationStatus === "deep_failed" || snapshot.generationStatus === "failed") {
          setRunState(resolveHeroArtifactState({
            hasCompact: Boolean(snapshot.compact || compact),
            hasDeep: false,
            generationStatus: snapshot.generationStatus,
          }));
          setErrorMessage("The deeper report did not finish. Your decision brief is safe and you can retry.");
          trackOutputGenerationFailed({
            route: "icp",
            source: "homepage_hero",
            generation_run_id: String(runId),
            anonymous_artifact_id: artifactId,
            failure_stage: "deep",
            error_type: snapshot.generationStatus,
          });
          onBusyChange?.(false);
          return;
        }
        if (Date.now() - pollStartedAt >= POLL_TIMEOUT_MS) {
          setRunState(resolveHeroArtifactState({
            hasCompact: Boolean(snapshot.compact || compact),
            hasDeep: false,
            generationStatus: snapshot.generationStatus,
            timedOut: true,
          }));
          setErrorMessage("The deeper report is taking longer than expected. Retry it without losing this brief.");
          onBusyChange?.(false);
          return;
        }
        setRunState(snapshot.compact || compact ? "deep_generating" : "compact_generating");
        pollTimer = setTimeout(() => void poll(token, artifactId), POLL_INTERVAL_MS);
      } catch (error) {
        if (cancelled) return;
        if (Date.now() - pollStartedAt < POLL_TIMEOUT_MS) {
          pollTimer = setTimeout(() => void poll(token, artifactId), POLL_INTERVAL_MS);
          return;
        }
        setRunState(resolveHeroArtifactState({
          hasCompact: Boolean(compact),
          hasDeep: false,
          timedOut: true,
        }));
        setErrorMessage(error instanceof Error ? error.message : "Could not restore the full result.");
        onBusyChange?.(false);
      }
    };

    const run = async () => {
      try {
        if (activeResumeToken) {
          const snapshot = await loadHeroGuestArtifact(activeResumeToken);
          if (cancelled) return;
          const ref: HeroGuestArtifactRef = {
            artifactId: snapshot.artifactId,
            resumeToken: activeResumeToken,
            expiresAt: snapshot.expiresAt || new Date(Date.now() + 7 * 86_400_000).toISOString(),
          };
          setGuestRef(ref);
          persistHeroGuestArtifact(ref);
          onArtifactReady?.(ref);
          if (snapshot.compact) {
            setCompact(snapshot.compact);
            outputGeneratedAtRef.current = Date.now();
          }
          if (snapshot.artifact) {
            applyDeepArtifact(snapshot.artifact, snapshot.artifactId, startedAt);
            onBusyChange?.(false);
            return;
          }
          setRunState(resolveHeroArtifactState({
            hasCompact: Boolean(snapshot.compact),
            hasDeep: false,
            generationStatus: snapshot.generationStatus,
          }));
          onBusyChange?.(!snapshot.compact);
          void poll(activeResumeToken, snapshot.artifactId);
          return;
        }

        generationRef.current ??= startHeroIcpGeneration(description);
        const result = await generationRef.current;
        if (cancelled) return;
        const ref: HeroGuestArtifactRef = {
          artifactId: result.artifactId,
          resumeToken: result.resumeToken,
          expiresAt: result.expiresAt,
        };
        setGuestRef(ref);
        onArtifactReady?.(ref);
        if (result.compact) {
          setCompact(result.compact);
          setRunState("compact_ready");
          outputGeneratedAtRef.current = Date.now();
          onBusyChange?.(false);
        } else {
          setRunState("compact_generating");
          setErrorMessage(result.error || null);
        }
        if (result.artifact) {
          applyDeepArtifact(result.artifact, result.artifactId, startedAt);
          onBusyChange?.(false);
          return;
        }
        void poll(result.resumeToken, result.artifactId);
      } catch (error) {
        if (cancelled) return;
        setRunState("failed");
        setErrorMessage(error instanceof Error ? error.message : "That did not generate. Try again.");
        trackOutputGenerationFailed({
          route: "icp",
          source: "homepage_hero",
          generation_run_id: String(runId),
          failure_stage: "compact",
          error_type: "api_error",
        });
        onBusyChange?.(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      onBusyChange?.(false);
    };
  // A new runId is the cancellation boundary. Callback props are intentionally
  // refs-by-contract from the parent and must not restart a live generation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeResumeToken, description, resumeReloadKey, runId]);

  const hasUsefulOutput = Boolean(compact || artifact);
  const showSignupCard = hasUsefulOutput && !isAuthenticated && Boolean(guestRef);

  // Effects run after React commits the result. This is the canonical
  // visibility boundary: request completion by itself is not an output view.
  useEffect(() => {
    if (!hasUsefulOutput || !guestRef) return;
    if (!resultViewed.current) {
      resultViewed.current = true;
      captureEvent('starting_experience_result_viewed', { mode: 'idea', source: 'hero-icp-output',
        experience_version: 'two_starts_v1', output_kind: 'customer_decision_brief' });
    }
    if (!outputGeneratedAtRef.current) outputGeneratedAtRef.current = Date.now();
    trackFirstOutputGenerated({
      route: "icp",
      tool: "icp_builder",
      source: outputSourceRef.current,
      generation_run_id: String(runId),
      anonymous_artifact_id: guestRef.artifactId,
      latency_ms: Math.max(0, outputGeneratedAtRef.current - generationStartedAtRef.current),
      is_anonymous: !isAuthenticated,
      mode: "idea", output_kind: "customer_decision_brief", experience_version: "two_starts_v1",
    });
  }, [guestRef, hasUsefulOutput, isAuthenticated, runId]);

  useEffect(() => {
    if (!showSignupCard || !guestRef || promptTrackedRef.current === guestRef.artifactId) return;
    promptTrackedRef.current = guestRef.artifactId;
    trackSignupPromptShown({
      trigger: "post_output",
      has_output: true,
      route: "icp",
      source: "homepage_hero",
      anonymous_artifact_id: guestRef.artifactId,
    });
  }, [guestRef, showSignupCard]);

  const retryDeep = async () => {
    if (!guestRef) {
      onRetry();
      return;
    }
    setRunState("deep_generating");
    setErrorMessage(null);
    try {
      await retryHeroDeepGeneration(guestRef.resumeToken);
      setActiveResumeToken(guestRef.resumeToken);
      setResumeReloadKey((current) => current + 1);
    } catch (error) {
      setRunState(hasUsefulOutput ? "partial_failure" : "failed");
      setErrorMessage(error instanceof Error ? error.message : "Could not retry the deeper report.");
    }
  };

  const prepareSignup = () => {
    if (!guestRef) return;
    persistOutputSignupContext({
      source: "hero-icp-output",
      outputRoute: "icp",
      anonymousArtifactId: guestRef.artifactId,
      outputGeneratedAt: outputGeneratedAtRef.current ?? Date.now(),
      mode: 'idea', experienceVersion: 'two_starts_v1', outputKind: 'customer_decision_brief',
    });
  };

  const copyBrief = async () => {
    const text = compact ? ["Your first validation test", compact.validationStep,
      "Likely customer: " + compact.primarySegment, "Urgent problem: " + compact.urgentProblem,
      "Assumptions to validate: the customer, urgency, and buying trigger are hypotheses based on your description.",
      "Buying trigger: " + compact.buyingTrigger].join("\n\n")
      : artifact ? [artifact.draftDocument.customer.summary, artifact.draftDocument.pain.quote].join("\n\n") : "";
    try { await navigator.clipboard.writeText(text); setCopied(true); setCopyError(null); }
    catch { setCopyError("Could not copy automatically. You can select and copy the brief below."); }
  };

  if (runState === "failed" && !hasUsefulOutput) {
    return (
      <div className="ct-hero__result" role="status">
        <p className="ct-hero__result-error">
          {errorMessage || "That did not generate."}
        </p>
        <div className="ct-hero__result-actions">
          <button type="button" className="ct-hero__cta ct-hero__result-retry" onClick={onRetry}>Try again</button>
          {/*
            * Never a dead end. A visitor who got nothing here still has their
            * description, and continuing in the builder is strictly better than
            * a card whose only option is to retry something that just failed.
            */}
          {onFailureHandoff ? (
            <button
              type="button"
              className="ct-hero__result-crosslink"
              onClick={onFailureHandoff}
            >
              Continue in ICP Builder →
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="ct-hero__result">
      {!hasUsefulOutput ? (
        <p className="ct-hero__result-loading" role="status" aria-live="polite">
          {errorMessage || "Working out your first step…"}
        </p>
      ) : null}

      {compact ? (
        <article className="ct-hero__result-card">
          {/*
            * The action leads; the analysis is the evidence for it.
            *
            * validationStep used to be the sixth cell of a six-cell grid, under
            * a persona name and five blocks of research. Someone who arrived
            * asking "what do I do next" had to read a document to find the
            * answer. It is required by normalizeCompact, so it is always
            * present whenever this card renders.
            */}
          <p className="ct-hero__result-kicker">Your idea brief</p>
          <p className="ct-story__assumption">The customer, problem, and buying trigger are starting assumptions. Your first test helps check them with real customers.</p>
          <ResultBlock
            className="ct-hero__result-firststep"
            label="Do this first"
            value={compact.validationStep}
          />
          <h3 className="ct-hero__result-persona">{compact.personaName}</h3>
          {compact.roleLine ? <p className="ct-hero__result-line">{compact.roleLine}</p> : null}
          <div className="ct-hero__result-grid">
            <ResultBlock label="Likely customer" value={compact.primarySegment} />
            <ResultBlock label="Urgent problem" value={compact.urgentProblem} />
            <ResultBlock label="Buying trigger" value={compact.buyingTrigger} />
            <ResultBlock label="Do not target first" value={compact.nonFitSegment} />
            <ResultBlock label="Messaging hook" value={compact.messagingHook} />
          </div>
          {runState === "deep_generating" || runState === "compact_ready" ? (
            <p className="ct-hero__result-pending" aria-live="polite">
              Building the deeper report in the background—your seven-day result is already safe.
            </p>
          ) : null}
          {runState === "partial_failure" ? (
            <div className="ct-hero__result-inline-error">
              <p>{errorMessage}</p>
              <button type="button" onClick={() => void retryDeep()}>Retry deeper report</button>
            </div>
          ) : null}
        </article>
      ) : null}

      {!compact && artifact ? <article className="ct-hero__result-card">
        <p className="ct-hero__result-kicker">Your idea brief</p>
        <p className="ct-story__assumption">These are assumptions to check with customers.</p>
        <ResultBlock label="Likely customer" value={artifact.draftDocument.customer.summary} />
        <ResultBlock label="Urgent problem" value={artifact.draftDocument.pain.quote} />
        <ResultBlock label="Your first test" value={artifact.draftDocument.decisionBrief?.interviewValidationPlan[0]?.question || "Ask a likely customer how they handle this problem today and what it costs them."} />
      </article> : null}
      {hasUsefulOutput ? <div className="ct-hero__result-actions">
        {isAuthenticated && guestRef ? <Link className="ct-hero__cta" to={buildHeroClaimReturnPath(guestRef.resumeToken)}>Save my brief</Link> : null}
        <button type="button" className="ct-hero__save-card-dismiss" onClick={() => void copyBrief()}>{copied ? "Copied" : "Copy brief"}</button>
        {copyError ? <p role="alert">{copyError}</p> : null}
      </div> : null}

      {/*
        * The save card trades on continuity, not storage. Asking someone to
        * value "keeping a file" is a weak offer to a first-time founder;
        * keeping their place in a sequence answers the question that brought
        * them here.
        */}
      {showSignupCard && guestRef ? (
        <div className="ct-hero__save-card">
          <h3>Keep your brief and continue</h3>
          <p>Create a free account to save this brief and unlock the deeper customer report.</p>
          <div className="ct-hero__save-card-actions">
            <button
              className="ct-hero__cta"
              type="button"
              onClick={() => {
                prepareSignup();
                setSignupOpen(true);
              }}
            >
              Save my brief
            </button>
          </div>
        </div>
      ) : null}

      {guestRef ? (
        <SoftGateModal
          open={signupOpen}
          onOpenChange={setSignupOpen}
          seed={description}
          trigger="hero-icp-output"
          title="Save your brief"
          description="Create your founder profile in seconds. Your result will be claimed automatically."
          returnPathOverride={buildHeroClaimReturnPath(guestRef.resumeToken)}
          onBeforeAuthContinue={prepareSignup}
          signupSource="hero-icp-output"
          entryId="icp_draft_unlock"
          activationTool="icp_builder"
          journeyTool="icp_builder"
          artifactType="customer_decision_brief"
        />
      ) : null}
    </div>
  );
}

function ResultBlock({ label, value, className }: { label: string; value: string; className?: string }) {
  if (!value?.trim()) return null;
  return (
    <div className={className ? `ct-hero__result-block ${className}` : "ct-hero__result-block"}>
      <span className="ct-hero__result-label">{label}</span>
      <p>{value}</p>
    </div>
  );
}

export default HeroResultIsland;
