import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Maximize2, Minimize2 } from "lucide-react";

interface PDFViewerProps {
  pdfUrl: string;
}

const PDFViewer = ({ pdfUrl }: PDFViewerProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleDownload = () => {
    window.open(pdfUrl, '_blank');
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-2 justify-end flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleFullscreen}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-4 w-4 mr-2" />
              Exit Fullscreen
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4 mr-2" />
              Fullscreen
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
        >
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </a>
        </Button>
      </div>

      {/* PDF Embed */}
      <div
        className={`
          rounded-lg overflow-hidden border bg-muted/30
          ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'relative'}
        `}
        style={{ height: isFullscreen ? '100vh' : '800px' }}
      >
        <iframe
          src={pdfUrl}
          className="w-full h-full"
          title="Pitch Deck PDF"
          loading="lazy"
        />
      </div>

      {/* Fallback message */}
      <p className="text-xs text-muted-foreground text-center">
        Can't see the PDF?
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline ml-1"
        >
          Open it in a new tab
        </a>
      </p>
    </div>
  );
};

export default PDFViewer;
