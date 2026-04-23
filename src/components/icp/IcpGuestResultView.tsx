import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import { IcpGuestUnlockTeaser } from "@/components/icp/IcpGuestUnlockTeaser";
import { IcpUnlockGate } from "@/components/icp/IcpUnlockGate";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";

interface IcpGuestResultViewProps {
  artifact: StoredIcpArtifact;
  seed?: string;
  returnPath: string;
  onBeforeAuthContinue?: () => void;
  onEmailLinkRequest?: (email: string) => Promise<void>;
}

const GUEST_VISIBLE_SECTIONS = ["customer", "pain"] as const;
const GUEST_LOCKED_SECTIONS = [] as const;

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
