import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  generateFirstSlice,
  generateFullDraft,
  type HeroFirstSlice,
} from "@/lib/heroIcpGeneration";
import {
  markSignupPromptDismissed,
  resolveOutputErrorType,
  trackFirstOutputGenerated,
  trackOutputGenerationFailed,
  trackSignupPromptShown,
  wasSignupPromptDismissed,
} from "@/lib/heroFunnel";
import {
  createEmptyIcpBuilderSession,
  persistIcpBuilderSession,
  type StoredIcpArtifact,
} from "@/lib/icpBuilderSession";

interface HeroResultIslandProps {
  description: string;
  /** Bumped by the parent to force a fresh generation (submit / retry). */
  runId: number;
  isAuthenticated: boolean;
  onRetry: () => void;
}

type Phase = "reading" | "drafting" | "slice" | "complete" | "failed";

const LOADING_COPY: Record<string, string> = {
  reading: "Reading your idea…",
  drafting: "Drafting your segment…",
};

/**
 * Runs two-stage generation and renders the result directly under the hero
 * input - no navigation, no account, nothing blurred or truncated.
 *
 * Lazy-loaded on first submit so none of this ships in the fold-blocking
 * bundle.
 */
export function HeroResultIsland({ description, runId, isAuthenticated, onRetry }: HeroResultIslandProps) {
  const [phase, setPhase] = useState<Phase>("reading");
  const [slice, setSlice] = useState<HeroFirstSlice | null>(null);
  const [artifact, setArtifact] = useState<StoredIcpArtifact | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(() => wasSignupPromptDismissed());
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    setPhase("reading");
    setSlice(null);
    setArtifact(null);

    // Both stages start together. The slice is only there to put real content
    // on screen while the full draft - which is the actual deliverable - runs.
    const slicePromise = generateFirstSlice(description);
    const draftPromise = generateFullDraft(description);

    // A rejected promise with no attached handler is an unhandled rejection if
    // the other stage settles first, so both get a no-op catch here.
    slicePromise.catch(() => undefined);
    draftPromise.catch(() => undefined);

    void (async () => {
      try {
        const firstSlice = await slicePromise;
        if (cancelled) return;
        setSlice(firstSlice);
        setPhase((current) => (current === "complete" ? current : "slice"));
        trackFirstOutputGenerated({
          route: "icp",
          latency_ms: Date.now() - startedAt,
          is_anonymous: !isAuthenticated,
        });
      } catch {
        // Non-fatal: the full draft is still running and is the real output.
        if (!cancelled) setPhase((current) => (current === "reading" ? "drafting" : current));
      }
    })();

    void (async () => {
      try {
        const fullArtifact = await draftPromise;
        if (cancelled) return;
        setArtifact(fullArtifact);
        setPhase("complete");

        // Hand the draft to the builder session so /icp-builder can continue it
        // and the existing auth handoff can claim it on signup.
        const session = createEmptyIcpBuilderSession();
        persistIcpBuilderSession({
          ...session,
          mode: "fast",
          currentScreen: "gate",
          fastDescription: description,
          draftPreview: fullArtifact,
          unlockRequired: !isAuthenticated,
        });

        // Covers the case where the fast slice failed but the draft succeeded:
        // this is still the visitor's first rendered output. The helper is
        // once-per-session, so a successful slice already claimed it.
        trackFirstOutputGenerated({
          route: "icp",
          latency_ms: Date.now() - startedAt,
          is_anonymous: !isAuthenticated,
        });
      } catch (error) {
        if (cancelled) return;
        setPhase("failed");
        trackOutputGenerationFailed({ route: "icp", error_type: resolveOutputErrorType(error) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [description, runId, isAuthenticated]);

  // Progress copy advances on a timer so the visitor sees movement rather than
  // a bare spinner during the slow gpt-4o call.
  useEffect(() => {
    if (phase !== "reading") return;
    const timer = setTimeout(() => setPhase((current) => (current === "reading" ? "drafting" : current)), 1600);
    return () => clearTimeout(timer);
  }, [phase]);

  const hasOutput = Boolean(slice || artifact);
  const showSignupCard = phase === "complete" && !isAuthenticated && !promptDismissed;

  useEffect(() => {
    if (!showSignupCard) return;
    trackSignupPromptShown({ trigger: "post_output", has_output: true });
  }, [showSignupCard]);

  if (phase === "failed" && !hasOutput) {
    return (
      <div className="ct-hero__result" role="status">
        <p className="ct-hero__result-error">That didn&apos;t generate — try again</p>
        <button type="button" className="ct-hero__cta ct-hero__result-retry" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="ct-hero__result" ref={resultRef}>
      {!hasOutput ? (
        <p className="ct-hero__result-loading" role="status" aria-live="polite">
          {LOADING_COPY[phase] ?? LOADING_COPY.drafting}
        </p>
      ) : null}

      {slice ? (
        <div className="ct-hero__result-card">
          <p className="ct-hero__result-kicker">Your best-fit customer</p>
          <h3 className="ct-hero__result-persona">{slice.personaName}</h3>
          {slice.roleLine ? <p className="ct-hero__result-line">{slice.roleLine}</p> : null}

          {slice.segment ? (
            <div className="ct-hero__result-block">
              <span className="ct-hero__result-label">Segment</span>
              <p>{slice.segment}</p>
            </div>
          ) : null}
          {slice.corePain ? (
            <div className="ct-hero__result-block">
              <span className="ct-hero__result-label">Core pain</span>
              <p>{slice.corePain}</p>
            </div>
          ) : null}
          {slice.buyingTrigger ? (
            <div className="ct-hero__result-block">
              <span className="ct-hero__result-label">Buying trigger</span>
              <p>{slice.buyingTrigger}</p>
            </div>
          ) : null}

          {phase !== "complete" ? (
            <p className="ct-hero__result-pending" aria-live="polite">
              Building the full brief — evidence gaps, competition and your interview plan…
            </p>
          ) : null}
        </div>
      ) : null}

      {phase === "complete" ? (
        <div className="ct-hero__result-actions">
          <Link className="ct-hero__cta" to="/icp-builder?continue=1">
            See the full brief
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
          <Link className="ct-hero__result-crosslink" to="/demo-studio/try">
            Already have something live? Build a demo instead →
          </Link>
          <Link className="ct-hero__result-crosslink" to="/icp-builder?mode=guided">
            Go deeper — 4-step guided version →
          </Link>
        </div>
      ) : null}

      {showSignupCard ? (
        <div className="ct-hero__save-card">
          <h3>Save this and keep going</h3>
          <p>Your profile is saved for 7 days. Create a free account to keep it and move to the next step.</p>
          <div className="ct-hero__save-card-actions">
            <Link className="ct-hero__cta" to="/signup?return=%2Ficp-builder%3Fcontinue%3D1">
              Create free account
            </Link>
            <button
              type="button"
              className="ct-hero__save-card-dismiss"
              onClick={() => {
                markSignupPromptDismissed();
                setPromptDismissed(true);
              }}
            >
              Keep exploring
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default HeroResultIsland;
