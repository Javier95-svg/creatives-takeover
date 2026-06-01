import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { IcpGuestUnlockTeaser } from "@/components/icp/IcpGuestUnlockTeaser";
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

// Pain is visible but blurred — the user can see it exists for their idea but
// can't read it, creating urgency to sign up. Build and Moat stay off-screen
// entirely and are teased below the gate.
const GUEST_LOCKED_SECTIONS = ["pain"] as const;

export function IcpGuestResultView({
  artifact,
  seed = "",
  returnPath,
  onBeforeAuthContinue,
  onEmailLinkRequest,
}: IcpGuestResultViewProps) {
  return (
    <IcpFolioDocument
      draft={artifact.draftDocument}
      tone="platformPreview"
      visibleSections={ICP_GUEST_VISIBLE_SECTIONS}
      lockedSections={GUEST_LOCKED_SECTIONS}
      footer={
        <div className="space-y-6 border-t border-border/80 pt-10">
          <IcpUnlockGate
            artifact={artifact}
            seed={seed}
            returnPath={returnPath}
            onBeforeAuthContinue={onBeforeAuthContinue}
            onEmailLinkRequest={onEmailLinkRequest}
          />
          <IcpGuestUnlockTeaser artifact={artifact} />
        </div>
      }
    />
  );
}
