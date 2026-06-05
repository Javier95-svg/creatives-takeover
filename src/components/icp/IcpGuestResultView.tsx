import { IcpDraftShareBar } from "@/components/icp/IcpDraftShareBar";
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

// Full draft shown as a lead magnet — no sections are blurred or hidden.
// Account creation is driven by the share / save actions.
const GUEST_LOCKED_SECTIONS: readonly never[] = [];

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
      topBar={
        // Share/save bar sits above the draft so visitors see it without
        // scrolling to the bottom. Buttons are visible but all require sign up.
        <IcpDraftShareBar shareUrl={null} returnPath={returnPath} />
      }
      footer={
        <div className="border-t border-border/80 pt-8">
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
  );
}
