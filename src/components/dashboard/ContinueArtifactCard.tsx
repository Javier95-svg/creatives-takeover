import { useState } from "react";
import { ArrowRight, PlayCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { captureEvent } from "@/lib/analytics";

const DISMISS_KEY_PREFIX = "ct_continue_artifact_dismissed_";

interface ContinueArtifactCardProps {
  /** Deep link back into the saved artifact (firstArtifactResumeUrl). */
  continueUrl: string;
  /** Human label of the artifact, e.g. "Acme demo". */
  artifactLabel: string | null;
  artifactType: string | null;
}

// Surfaces the saved first artifact on the dashboard so a returning user lands
// back in their work instead of a generic feed. The resume URL has been
// persisted since signup (markFirstArtifactCreated) but was never shown here.
const ContinueArtifactCard = ({ continueUrl, artifactLabel, artifactType }: ContinueArtifactCardProps) => {
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

  return (
    <div className="mb-6 rounded-2xl border border-primary/25 bg-primary/8 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <PlayCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Continue where you left off</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {label} is saved and waiting — pick it up in one click.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to={continueUrl}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={() => captureEvent("artifact_resume_card_clicked", { artifact_type: artifactType })}
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContinueArtifactCard;
