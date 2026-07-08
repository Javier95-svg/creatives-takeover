import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { ExternalLink, FileText, Loader2, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServicePitchDeckType } from "@/types/serviceMarketplace";

interface PitchDeckViewerProps {
  url: string | null;
  type: ServicePitchDeckType | null;
  title: string;
}

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function buildViewerUrl(url: string, type: ServicePitchDeckType | null) {
  const cleanUrl = url.split("#")[0];

  if (type === "pptx") {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(cleanUrl)}`;
  }

  return `${cleanUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH&page=1`;
}

async function fetchPdfBytes(url: string, signal: AbortSignal) {
  const response = await fetch(url.split("#")[0], {
    cache: "force-cache",
    credentials: "omit",
    mode: "cors",
    signal,
  });

  if (!response.ok) {
    throw new Error(`PDF request failed with ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function PdfCanvasViewer({ url, title }: { url: string; title: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "native">("loading");

  useEffect(() => {
    let cancelled = false;
    let renderedPages = 0;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let pdfDocument: PDFDocumentProxy | null = null;
    const controller = new AbortController();

    const renderPdf = async () => {
      const container = containerRef.current;
      if (!container) return;

      setStatus("loading");
      container.innerHTML = "";

      try {
        const pdfBytes = await fetchPdfBytes(url, controller.signal);
        if (cancelled) return;

        loadingTask = pdfjsLib.getDocument({
          data: pdfBytes,
          disableAutoFetch: true,
          disableRange: true,
          disableStream: true,
        });
        pdfDocument = await loadingTask.promise;
        if (cancelled) return;

        const availableWidth = Math.max(container.clientWidth - 32, 320);
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          if (cancelled) return;

          const page = await pdfDocument.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(availableWidth / baseViewport.width, 1.6);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Could not create PDF page canvas.");
          }

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className = "block max-w-full rounded-md bg-white shadow-sm";

          const pageShell = document.createElement("div");
          pageShell.className = "flex flex-col items-center gap-2 px-4 py-5";

          const pageLabel = document.createElement("p");
          pageLabel.className = "text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground";
          pageLabel.textContent = `Slide ${pageNumber} of ${pdfDocument.numPages}`;

          pageShell.appendChild(pageLabel);
          pageShell.appendChild(canvas);
          container.appendChild(pageShell);

          if (pageNumber === 1) {
            setStatus("ready");
          }

          await page.render({
            canvasContext: context,
            viewport,
            transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
          }).promise;
          renderedPages += 1;
        }

        setStatus("ready");
      } catch (error) {
        if (!cancelled && renderedPages === 0) {
          console.warn("Service pitch deck canvas render failed, using native PDF viewer:", error);
          container.replaceChildren();
          setStatus("native");
        }
      }
    };

    void renderPdf();

    return () => {
      cancelled = true;
      controller.abort();
      containerRef.current?.replaceChildren();
      void loadingTask?.destroy?.();
      void pdfDocument?.destroy?.();
    };
  }, [url]);

  if (status === "native") {
    return (
      <iframe
        src={buildViewerUrl(url, "pdf")}
        title={title}
        className="h-[560px] w-full bg-muted md:h-[720px]"
        loading="eager"
      />
    );
  }

  return (
    <div className="relative h-[560px] overflow-y-auto bg-muted md:h-[720px]" aria-label={title}>
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Rendering PDF slides
          </div>
        </div>
      )}
      <div ref={containerRef} className="mx-auto w-full max-w-5xl" />
    </div>
  );
}

export function PitchDeckViewer({ url, type, title }: PitchDeckViewerProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
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
          <PdfCanvasViewer url={url} title={title} />
        ) : (
          <iframe
            src={viewerUrl}
            title={title}
            className="h-[560px] w-full bg-muted md:h-[720px]"
            loading="eager"
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
        Scroll inside the preview to move through the deck.
      </p>
    </div>
  );
}
