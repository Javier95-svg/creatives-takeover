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
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-cyan-500/30 bg-cyan-500/[0.04] p-8 text-center dark:bg-cyan-300/[0.05]">
        <div className="space-y-3">
          <FileText className="mx-auto h-8 w-8 text-cyan-700 dark:text-cyan-300" />
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
    <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_18px_50px_-40px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-950">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-slate-950 px-4 py-3 text-white dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-300/12 text-cyan-200">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">
              {type === "pptx" ? "PPTX deck" : "PDF deck"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="self-start rounded-lg border-white/15 bg-white/8 text-white hover:bg-white/14 hover:text-white sm:self-auto">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open
          </a>
        </Button>
      </div>
      <iframe
        src={viewerUrl}
        title={title}
        className="h-[520px] w-full bg-slate-100 dark:bg-slate-900 md:h-[680px]"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
