import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { IcpUnlockGate } from "@/components/icp/IcpUnlockGate";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";

interface IcpGuestResultViewProps {
  artifact: StoredIcpArtifact;
  seed?: string;
  returnPath: string;
  onBeforeAuthContinue?: () => void;
  onEmailLinkRequest?: (email: string) => Promise<void>;
}

const GUEST_VISIBLE_SECTIONS = ["customer", "pain", "build", "moat"] as const;
const GUEST_LOCKED_SECTIONS = ["build", "moat"] as const;

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
      visibleSections={GUEST_VISIBLE_SECTIONS}
      lockedSections={GUEST_LOCKED_SECTIONS}
      lockedSectionBreak={
        <IcpUnlockGate
          artifact={artifact}
          seed={seed}
          returnPath={returnPath}
          onBeforeAuthContinue={onBeforeAuthContinue}
          onEmailLinkRequest={onEmailLinkRequest}
        />
      }
    />
  );
}
