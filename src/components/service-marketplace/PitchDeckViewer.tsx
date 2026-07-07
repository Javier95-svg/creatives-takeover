import { ExternalLink, FileText, Presentation } from "lucide-react";
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

  return `${url}#toolbar=1&navpanes=0`;
}

export function PitchDeckViewer({ url, type, title }: PitchDeckViewerProps) {
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
            Open
          </a>
        </Button>
      </div>
      <iframe
        src={viewerUrl}
        title={title}
        className="h-[520px] w-full bg-muted md:h-[680px]"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
