import { useState } from "react";
import { ExternalLink, FileText, Loader2, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServicePitchDeckType } from "@/types/serviceMarketplace";

interface PitchDeckViewerProps {
  url: string | null;
  type: ServicePitchDeckType | null;
  title: string;
}

function buildViewerUrl(url: string, type: ServicePitchDeckType | null) {
  if (type === "pptx") {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  }

  return `${url.split("#")[0]}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`;
}

export function PitchDeckViewer({ url, type, title }: PitchDeckViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

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

  const viewerUrl = buildViewerUrl(url, type);
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
        <Button variant="outline" size="sm" asChild className="self-start sm:self-auto">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in new tab
          </a>
        </Button>
      </div>
      <div className="relative min-h-[560px] bg-muted md:min-h-[720px]">
        {!isPdf && !loaded && !failed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading deck preview
            </div>
          </div>
        )}

        {isPdf ? (
          <object
            data={viewerUrl}
            type="application/pdf"
            title={title}
            className="h-[560px] w-full bg-muted md:h-[720px]"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          >
            <iframe
              src={viewerUrl}
              title={title}
              className="h-[560px] w-full bg-muted md:h-[720px]"
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          </object>
        ) : (
          <iframe
            src={viewerUrl}
            title={title}
            className="h-[560px] w-full bg-muted md:h-[720px]"
            loading="lazy"
            allow="fullscreen"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        )}

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
        Scroll inside the preview to move through the deck. PPTX files use the embedded Office viewer.
      </p>
    </div>
  );
}
