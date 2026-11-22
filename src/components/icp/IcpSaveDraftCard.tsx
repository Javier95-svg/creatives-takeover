import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

import SoftGateModal from "@/components/auth/SoftGateModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackActivationFunnelEvent } from "@/lib/activationEntry";
import { trackICPLoginClicked, trackICPUnlockClicked, trackICPUnlockGateShown } from "@/lib/analytics";
import { persistOnboardingReturn } from "@/lib/authRedirect";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";
import { normalizeIcpSeed, persistIcpSeed } from "@/lib/icpSeed";

/**
 * The ask after a guest has read their whole draft.
 *
 * It replaced a gate that blurred "what to build", the moat and the decision
 * brief behind an account wall (13 saw it in the month to 2026-11-22, 1 clicked).
 * The draft is now free to read; the account keeps it and leads to what comes
 * next. Sign-up opens inline (Google or email) instead of sending the reader to
 * /signup, where most of the few who started never finished.
 *
 * Event names are the gate's, so before and after stay comparable in PostHog.
 */

const WHAT_SAVING_GETS_YOU = [
  "Keep this draft and update it as you learn",
  "Turn its five interview questions into your first conversations",
  "Start your demo, go-to-market plan and first version from it",
] as const;

interface IcpSaveDraftCardProps {
  artifact: StoredIcpArtifact;
  seed?: string;
  returnPath: string;
  onBeforeAuthContinue?: () => void;
  onEmailLinkRequest?: (email: string) => Promise<void>;
  /** Opened from the button beside the score as well as from the card. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IcpSaveDraftCard({
  artifact,
  seed = "",
  returnPath,
  onBeforeAuthContinue,
  onEmailLinkRequest,
  open,
  onOpenChange,
}: IcpSaveDraftCardProps) {
  const navigate = useNavigate();
  const normalizedSeed = useMemo(() => normalizeIcpSeed(seed), [seed]);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkState, setLinkState] = useState<"idle" | "open" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    trackICPUnlockGateShown({
      page_path: "/icp-builder",
      has_seed: Boolean(normalizedSeed),
      confidence: artifact.draftDocument.confidence.level,
      layout: "save_card",
      locked_after: "none",
    });
    trackActivationFunnelEvent("activation_gate_shown", {
      entry_id: "icp_draft_unlock",
      tool: "icp_builder",
      source: "icp-draft-save",
      step: "signup_gate",
      is_authenticated: false,
      return_path: returnPath,
    });
  }, [artifact.draftDocument.confidence.level, normalizedSeed, returnPath]);

  const prepareAuth = () => {
    onBeforeAuthContinue?.();
    persistIcpSeed(normalizedSeed);
    persistOnboardingReturn(returnPath);
  };

  const handleSave = () => {
    trackICPUnlockClicked({ page_path: "/icp-builder", method: "save_modal", surface: "save_card" });
    trackActivationFunnelEvent("activation_gate_clicked", {
      entry_id: "icp_draft_unlock", tool: "icp_builder", source: "icp-draft-save",
      step: "signup_modal", is_authenticated: false, return_path: returnPath,
    });
    prepareAuth();
    onOpenChange(true);
  };

  const handleLogin = () => {
    trackICPLoginClicked({ page_path: "/icp-builder", source: "save_card" });
    prepareAuth();
    navigate(`/login?source=icp-draft-save&return=${encodeURIComponent(returnPath)}`);
  };

  const handleEmailLink = async (event: FormEvent) => {
    event.preventDefault();
    if (!onEmailLinkRequest || !linkEmail.trim()) return;
    setLinkState("sending");
    try {
      await onEmailLinkRequest(linkEmail.trim());
      setLinkState("sent");
    } catch {
      setLinkState("error");
    }
  };

  return (
    <section
      aria-labelledby="icp-save-title"
      className="mx-auto mt-10 w-full max-w-xl overflow-hidden rounded-3xl border border-primary/25 bg-background shadow-[0_24px_70px_-40px_hsl(var(--primary)/0.5)]"
    >
      <div className="h-1 w-full bg-gradient-to-r from-primary via-accent-teal to-primary" aria-hidden="true" />
      <div className="px-6 py-8 sm:px-10">
        <div className="space-y-2 text-center">
          <h2 id="icp-save-title" className="text-2xl font-semibold tracking-tight">
            Save this draft and get your next step
          </h2>
          <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
            It is yours to read either way. A free account keeps it and shows you how to test it this week.
          </p>
        </div>

        <ul className="mx-auto mt-6 max-w-sm space-y-2.5">
          {WHAT_SAVING_GETS_YOU.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-foreground">
              <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <Button type="button" className="mt-7 h-14 w-full text-base font-semibold" onClick={handleSave}>
          Save my draft
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Free. No credit card. Google or email.</p>

        <div className="mt-4 flex flex-col items-center gap-2 text-sm">
          <button type="button" className="font-medium text-primary transition-opacity hover:opacity-80" onClick={handleLogin}>
            I already have an account
          </button>
          {onEmailLinkRequest && linkState === "idle" ? (
            <button
              type="button"
              className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
              onClick={() => setLinkState("open")}
            >
              Not now? Email me this draft
            </button>
          ) : null}
        </div>

        {onEmailLinkRequest && (linkState === "open" || linkState === "sending" || linkState === "error") ? (
          <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={handleEmailLink}>
            <label htmlFor="icp-save-link-email" className="sr-only">Email</label>
            <Input
              id="icp-save-link-email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              value={linkEmail}
              onChange={(event) => setLinkEmail(event.target.value)}
              data-ph-no-capture
            />
            <Button type="submit" variant="outline" disabled={linkState === "sending"}>
              {linkState === "sending" ? "Sending…" : "Send"}
            </Button>
          </form>
        ) : null}
        {linkState === "error" ? (
          <p className="mt-2 text-center text-xs text-destructive">That did not send. Check the address and try again.</p>
        ) : null}
        {linkState === "sent" ? (
          <p className="mt-4 text-center text-sm text-muted-foreground" role="status">
            Sent. Check your inbox for your draft.
          </p>
        ) : null}
      </div>

      <SoftGateModal
        open={open}
        onOpenChange={onOpenChange}
        seed={normalizedSeed}
        trigger="icp-save-card"
        title="Save your draft"
        description="Create your founder profile in seconds. This draft is saved to it automatically."
        returnPathOverride={returnPath}
        onBeforeAuthContinue={prepareAuth}
        signupSource="icp-draft-save"
        entryId="icp_draft_unlock"
        activationTool="icp_builder"
        journeyTool="icp_builder"
        artifactType="customer_decision_brief"
      />
    </section>
  );
}
