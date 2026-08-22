import { useMemo } from "react";
import { toast } from "sonner";

import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IcpScoreShareModal } from "@/components/icp/IcpScoreShareModal";
import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { IcpUnlockGate } from "@/components/icp/IcpUnlockGate";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";
import { ICP_GUEST_VISIBLE_SECTIONS } from "@/lib/icpUnlockFlow";
import { buildIcpScoreCard } from "@/lib/icpScoreCard";
import { getGuestScoreCardUrl, publishGuestScoreCard } from "@/lib/guestActivationArtifacts";
import { readHeroGuestArtifact } from "@/lib/heroIcpGeneration";

interface IcpGuestResultViewProps {
  artifact: StoredIcpArtifact;
  seed?: string;
  returnPath: string;
  onBeforeAuthContinue?: () => void;
  onEmailLinkRequest?: (email: string) => Promise<void>;
}

/**
 * Guests read their idea, their ideal customer and their core pain in full,
 * then hit the gate. What they are building and their moat stay blurred behind
 * it, along with the decision brief - which the folio moves in with them.
 *
 * The previous build locked nothing and put the gate in the footer, so the
 * whole draft was readable and creating an account bought the reader nothing
 * they could see. Enough is given away to prove the output is real; the part
 * that answers "so what do I do about it" is the reason to sign up.
 */
const GUEST_LOCKED_SECTIONS = ["build", "moat"] as const;

export function IcpGuestResultView({
  artifact,
  seed = "",
  returnPath,
  onBeforeAuthContinue,
  onEmailLinkRequest,
}: IcpGuestResultViewProps) {
  const navigate = useNavigate();
  const signUpPath = `/signup?source=icp-score-cta&return=${encodeURIComponent(returnPath)}`;
  const scoreCard = useMemo(
    () =>
      buildIcpScoreCard(artifact.draftDocument, {
        idea: artifact.founderInputs.fastDescription ?? seed,
        generatedAt: artifact.generatedAt,
      }),
    [artifact, seed],
  );

  /*
   * Minting the link is what makes the loop run, and it has to happen here:
   * this is the one moment the founder is looking at their own number. Asking
   * them to create an account first puts the request at the point of least
   * willingness. Only the card is published; the draft stays behind the gate.
   */
  const handleShare = async (): Promise<string | null> => {
    const guest = readHeroGuestArtifact();
    if (!guest?.resumeToken) {
      toast.error("Could not create a share link for this result.");
      return null;
    }
    try {
      const slug = await publishGuestScoreCard(guest.resumeToken, scoreCard);
      return getGuestScoreCardUrl(slug);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create a share link.");
      return null;
    }
  };

  return (
    <div className="pb-20 md:pb-0">
      <IcpFolioDocument
        draft={artifact.draftDocument}
        tone="platformPreview"
        ideaDescription={artifact.founderInputs.fastDescription ?? seed}
        visibleSections={ICP_GUEST_VISIBLE_SECTIONS}
        lockedSections={GUEST_LOCKED_SECTIONS}
        scoreAction={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => {
                onBeforeAuthContinue?.();
                navigate(signUpPath);
              }}
            >
              Create my demo
              <ArrowRight className="h-4 w-4" />
            </Button>
            <IcpScoreShareModal
              card={scoreCard}
              onResolveUrl={handleShare}
              autoOpenKey={artifact.generatedAt}
            />
          </div>
        }
        lockedSectionBreak={
          <div id="icp-unlock" className="scroll-mt-24">
            <IcpUnlockGate
              artifact={artifact}
              seed={seed}
              returnPath={returnPath}
              onBeforeAuthContinue={onBeforeAuthContinue}
              onEmailLinkRequest={onEmailLinkRequest}
            />
          </div>
        }
      />
      <a
        href="#icp-unlock"
        className="fixed inset-x-4 bottom-4 z-40 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-center text-sm font-semibold text-primary-foreground shadow-xl md:hidden"
      >
        Save this and keep going
      </a>
    </div>
  );
}
