import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IcpScoreShareModal } from "@/components/icp/IcpScoreShareModal";
import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { IcpSaveDraftCard } from "@/components/icp/IcpSaveDraftCard";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";
import { ICP_GUEST_LOCKED_SECTIONS, ICP_GUEST_VISIBLE_SECTIONS } from "@/lib/icpUnlockFlow";
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
 * Guests read the whole draft, then are asked to save it.
 *
 * Until 2026-11-22 "what to build", the moat and the decision brief were
 * blurred behind an account wall; 13 guests saw it in a month and 1 clicked.
 * A draft the founder cannot read gives them no reason to keep it, so nothing
 * is locked now (ICP_GUEST_LOCKED_SECTIONS) and the account buys what comes
 * next. See the history in src/lib/icpUnlockFlow.ts.
 */
export function IcpGuestResultView({
  artifact,
  seed = "",
  returnPath,
  onBeforeAuthContinue,
  onEmailLinkRequest,
}: IcpGuestResultViewProps) {
  const [saveOpen, setSaveOpen] = useState(false);
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
   * willingness. Only the card is published.
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
        lockedSections={ICP_GUEST_LOCKED_SECTIONS}
        scoreAction={
          <div className="flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="gap-2"
              onClick={() => {
                onBeforeAuthContinue?.();
                setSaveOpen(true);
              }}
            >
              Save my draft
              <ArrowRight className="h-4 w-4" />
            </Button>
            <IcpScoreShareModal
              card={scoreCard}
              onResolveUrl={handleShare}
              autoOpenKey={artifact.generatedAt}
            />
          </div>
        }
      />
      <div id="icp-save" className="scroll-mt-24 px-4">
        <IcpSaveDraftCard
          artifact={artifact}
          seed={seed}
          returnPath={returnPath}
          onBeforeAuthContinue={onBeforeAuthContinue}
          onEmailLinkRequest={onEmailLinkRequest}
          open={saveOpen}
          onOpenChange={setSaveOpen}
        />
      </div>
      <a
        href="#icp-save"
        className="fixed inset-x-4 bottom-4 z-40 flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-center text-sm font-semibold text-primary-foreground shadow-xl md:hidden"
      >
        Save this draft
      </a>
    </div>
  );
}
