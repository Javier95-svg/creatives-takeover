import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { IcpUnlockGate } from "@/components/icp/IcpUnlockGate";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";
import { ICP_GUEST_VISIBLE_SECTIONS } from "@/lib/icpUnlockFlow";

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
  return (
    <div className="pb-20 md:pb-0">
      <IcpFolioDocument
        draft={artifact.draftDocument}
        tone="platformPreview"
        ideaDescription={artifact.founderInputs.fastDescription ?? seed}
        visibleSections={ICP_GUEST_VISIBLE_SECTIONS}
        lockedSections={GUEST_LOCKED_SECTIONS}
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
