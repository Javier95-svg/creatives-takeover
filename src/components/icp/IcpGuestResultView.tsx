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

// Half-gate is driven by ICP_GUEST_VISIBLE_SECTIONS (Customer + Pain only); the
// Build + Moat sections aren't rendered for guests, and the signup gate (footer)
// drives account creation to reveal them.
const GUEST_LOCKED_SECTIONS: readonly never[] = [];

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
        visibleSections={ICP_GUEST_VISIBLE_SECTIONS}
        lockedSections={GUEST_LOCKED_SECTIONS}
        topBar={
          <div className="rounded-2xl border border-accent-teal/20 bg-accent-teal/5 px-4 py-3 text-sm text-foreground">
            <span className="font-semibold">Your free brief:</span>{" "}
            best-fit customer, core pain, buying trigger, evidence gaps, and interview direction.
          </div>
        }
        footer={
          <div id="icp-unlock" className="scroll-mt-24 border-t border-border/80 pt-8">
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
        Save my brief and reveal the action plan
      </a>
    </div>
  );
}
