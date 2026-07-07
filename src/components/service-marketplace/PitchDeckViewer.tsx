import { useEffect, useState } from "react";
import { ExternalLink, FileText, Loader2, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServicePitchDeckType } from "@/types/serviceMarketplace";

interface PitchDeckViewerProps {
  url: string | null;
  type: ServicePitchDeckType | null;
  title: string;
}

type PdfViewerMode = "direct" | "backup";

function buildViewerUrl(url: string, type: ServicePitchDeckType | null, pdfMode: PdfViewerMode) {
  const cleanUrl = url.split("#")[0];

  if (type === "pptx") {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(cleanUrl)}`;
  }

  if (pdfMode === "backup") {
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(cleanUrl)}`;
  }

  return `${cleanUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`;
}

export function PitchDeckViewer({ url, type, title }: PitchDeckViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pdfMode, setPdfMode] = useState<PdfViewerMode>("direct");

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setPdfMode("direct");
  }, [type, url]);

  if (!url || !type) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
        <div className="space-y-3">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Pitch deck coming soon</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              This service profile is live, but its deck has not been published yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const viewerUrl = buildViewerUrl(url, type, pdfMode);
  const Icon = type === "pptx" ? Presentation : FileText;
  const isPdf = type === "pdf";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {type === "pptx" ? "PPTX deck" : "PDF deck"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isPdf && (
            <Button
              type="button"
              variant={pdfMode === "backup" ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setLoaded(false);
                setFailed(false);
                setPdfMode((currentMode) => (currentMode === "direct" ? "backup" : "direct"));
              }}
            >
              {pdfMode === "direct" ? "Backup viewer" : "Fast viewer"}
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in new tab
            </a>
          </Button>
        </div>
      </div>
      <div className="relative min-h-[560px] bg-muted md:min-h-[720px]">
        {!loaded && !failed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading deck preview
            </div>
          </div>
        )}

        <iframe
          src={viewerUrl}
          title={title}
          className="h-[560px] w-full bg-muted md:h-[720px]"
          loading="eager"
          allow="fullscreen"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />

        {failed && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-muted p-6 text-center">
            <div className="max-w-md space-y-3 rounded-lg border border-border bg-background p-6 shadow-sm">
              <Icon className="mx-auto h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Inline preview unavailable</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  The deck is still available, but this browser could not render it inside the page.
                </p>
              </div>
              <Button asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in new tab
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
      <p className="border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        Scroll inside the preview to move through the deck. If a PDF preview stays blank, switch to the backup viewer.
      </p>
    </div>
  );
}
