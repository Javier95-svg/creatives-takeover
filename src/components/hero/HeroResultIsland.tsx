import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SoftGateModal from "@/components/auth/SoftGateModal";
import {
  buildHeroClaimReturnPath,
  buildHeroResumePath,
  loadHeroGuestArtifact,
  persistHeroGuestArtifact,
  retryHeroDeepGeneration,
  startHeroIcpGeneration,
  type HeroDecisionBrief,
  type HeroGuestArtifactRef,
} from "@/lib/heroIcpGeneration";
import {
  markSignupPromptDismissed,
  trackDeepOutputGenerated,
  trackFirstOutputGenerated,
  trackOutputGenerationFailed,
  trackSignupPromptShown,
  wasSignupPromptDismissed,
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
}: HeroResultIslandProps) {
  const [runState, setRunState] = useState<HeroRunState>("compact_generating");
  const [compact, setCompact] = useState<HeroDecisionBrief | null>(null);
  const [artifact, setArtifact] = useState<StoredIcpArtifact | null>(null);
  const [guestRef, setGuestRef] = useState<HeroGuestArtifactRef | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(() => wasSignupPromptDismissed());
  const [signupOpen, setSignupOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeResumeToken, setActiveResumeToken] = useState(initialResumeToken ?? null);
  const [resumeReloadKey, setResumeReloadKey] = useState(0);
  const outputGeneratedAtRef = useRef<number | null>(null);
  const generationStartedAtRef = useRef<number>(Date.now());
  const outputSourceRef = useRef<"homepage_hero" | "homepage_resume">(
    initialResumeToken ? "homepage_resume" : "homepage_hero",
  );
  const promptTrackedRef = useRef<string | null>(null);

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

        const result = await startHeroIcpGeneration(description);
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
  const showSignupCard = hasUsefulOutput && !isAuthenticated && !promptDismissed && Boolean(guestRef);

  // Effects run after React commits the result. This is the canonical
  // visibility boundary: request completion by itself is not an output view.
  useEffect(() => {
    if (!hasUsefulOutput || !guestRef) return;
    if (!outputGeneratedAtRef.current) outputGeneratedAtRef.current = Date.now();
    trackFirstOutputGenerated({
      route: "icp",
      tool: "icp_builder",
      source: outputSourceRef.current,
      generation_run_id: String(runId),
      anonymous_artifact_id: guestRef.artifactId,
      latency_ms: Math.max(0, outputGeneratedAtRef.current - generationStartedAtRef.current),
      is_anonymous: !isAuthenticated,
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
    });
  };

  const copyResumeLink = async () => {
    if (!guestRef || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(`${window.location.origin}${buildHeroResumePath(guestRef.resumeToken)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2_000);
  };

  if (runState === "failed" && !hasUsefulOutput) {
    return (
      <div className="ct-hero__result" role="status">
        <p className="ct-hero__result-error">{errorMessage || "That did not generate. Try again."}</p>
        <button type="button" className="ct-hero__cta ct-hero__result-retry" onClick={onRetry}>Try again</button>
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
          <p className="ct-hero__result-kicker">Your first step</p>
          <ResultBlock
            className="ct-hero__result-firststep"
            label="Do this first"
            value={compact.validationStep}
          />
          <h3 className="ct-hero__result-persona">{compact.personaName}</h3>
          {compact.roleLine ? <p className="ct-hero__result-line">{compact.roleLine}</p> : null}
          <div className="ct-hero__result-grid">
            <ResultBlock label="Primary segment" value={compact.primarySegment} />
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

      {artifact ? (
        <details className="ct-hero__deep-report">
          <summary>Deep customer report ready</summary>
          <ResultBlock label="Customer" value={artifact.draftDocument.customer.summary} />
          <ResultBlock label="Pain in their words" value={artifact.draftDocument.pain.quote} />
          <ResultBlock label="Value proposition" value={artifact.draftDocument.build.valueProposition} />
          <ResultBlock label="Current alternative" value={artifact.draftDocument.decisionBrief?.currentAlternative || artifact.draftDocument.build.replaces.join(", ")} />
        </details>
      ) : null}

      {artifact ? (
        <div className="ct-hero__result-actions">
          <Link className="ct-hero__result-crosslink" to="/icp-builder">Open the full report in ICP Builder →</Link>
        </div>
      ) : null}

      {/*
        * The save card trades on continuity, not storage. Asking someone to
        * value "keeping a file" is a weak offer to a first-time founder;
        * keeping their place in a sequence answers the question that brought
        * them here.
        */}
      {showSignupCard && guestRef ? (
        <div className="ct-hero__save-card">
          <h3>Pick up where you left off</h3>
          <p>Your first step is saved for seven days. Create a free account and we&apos;ll keep track of what&apos;s done and what&apos;s next.</p>
          <div className="ct-hero__save-card-actions">
            <button
              className="ct-hero__cta"
              type="button"
              onClick={() => {
                prepareSignup();
                setSignupOpen(true);
              }}
            >
              Save and continue free
            </button>
            <button type="button" className="ct-hero__save-card-dismiss" onClick={() => void copyResumeLink()}>
              {copied ? "Link copied" : "Copy 7-day link"}
            </button>
            <button
              type="button"
              className="ct-hero__save-card-dismiss"
              onClick={() => {
                markSignupPromptDismissed();
                setPromptDismissed(true);
              }}
            >
              Not now
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
          title="Save your first step"
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
