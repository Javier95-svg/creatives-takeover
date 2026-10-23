import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { captureEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { DASHBOARD_CARD } from "@/components/dashboard/DashboardPanel";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { trackRetentionEvent } from "@/lib/retentionSystem";

const DISMISS_KEY_PREFIX = "ct_continue_artifact_dismissed_";

interface ContinueArtifactCardProps {
  /** Deep link back into the saved artifact (firstArtifactResumeUrl). */
  continueUrl: string;
  /** Human label of the artifact, e.g. "Acme demo". */
  artifactLabel: string | null;
  artifactType: string | null;
  onboardingSessionId?: string | null;
  flowVersion?: string | null;
  rolloutVariant?: string | null;
}

// Surfaces the saved first artifact on the dashboard so a returning user lands
// back in their work instead of a generic feed. The resume URL has been
// persisted since signup (markFirstArtifactCreated) but was never shown here.
const ContinueArtifactCard = ({
  continueUrl,
  artifactLabel,
  artifactType,
  onboardingSessionId,
  flowVersion,
  rolloutVariant,
}: ContinueArtifactCardProps) => {
  const { user } = useAuth();
  const dismissKey = `${DISMISS_KEY_PREFIX}${continueUrl}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(dismissKey) === "true";
    } catch {
      return false;
    }
  });

  if (dismissed || !continueUrl || continueUrl === "/dashboard") return null;

  const label = artifactLabel?.trim() || "your last project";

  const handleDismiss = () => {
    try {
      localStorage.setItem(dismissKey, "true");
    } catch {
      /* ignore */
    }
    setDismissed(true);
    captureEvent("artifact_resume_card_dismissed", { artifact_type: artifactType });
  };

  const handleContinue = () => {
    captureEvent("artifact_resume_card_clicked", { artifact_type: artifactType });
    if (!user?.id) return;
    const properties = {
      user_id: user.id,
      artifact_type: artifactType,
      source: "dashboard_resume_card",
      onboarding_session_id: onboardingSessionId ?? null,
      flow_version: flowVersion ?? null,
      rollout_variant: rolloutVariant ?? null,
    };
    void trackRetentionEvent("dashboard_continue_clicked", properties);
    void trackRetentionEvent("artifact_resumed", properties);
  };

  return (
    <div className={cn(DASHBOARD_CARD, "mb-6 p-5 sm:p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Continue where you left off</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {label} is saved and waiting — pick it up in one click.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to={continueUrl} onClick={handleContinue}>
              Continue
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContinueArtifactCard;
