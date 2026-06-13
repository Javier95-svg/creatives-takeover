import { Button } from "@/components/ui/button";
import { IcpFolioDocument } from "@/components/icp/IcpFolioDocument";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";

interface ICPDraftDocumentProps {
  artifact: StoredIcpArtifact;
  locked?: boolean;
  onUnlock?: () => void;
  onViewLegacy?: () => void;
  showLegacyFallback?: boolean;
}

export function ICPDraftDocument({
  artifact,
  locked = false,
  onUnlock,
  onViewLegacy,
  showLegacyFallback = false,
}: ICPDraftDocumentProps) {
  return (
    <div className="space-y-6">
      <IcpFolioDocument draft={artifact.draftDocument} blurred={locked} />

      {locked ? (
        <div className="mx-auto max-w-5xl rounded-4xl border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Your ICP Draft is ready</p>
              <p className="text-sm text-muted-foreground">Create a free account to unlock the full document.</p>
            </div>
            <Button type="button" onClick={onUnlock}>
              Unlock my ICP Draft
            </Button>
          </div>
        </div>
      ) : null}

      {showLegacyFallback ? (
        <div className="mx-auto max-w-5xl rounded-3xl border border-border bg-white p-4 text-sm text-muted-foreground shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>This draft was mapped from an older saved ICP analysis.</span>
            <Button type="button" variant="outline" onClick={onViewLegacy}>
              View legacy analysis
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
