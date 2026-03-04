import React, { useState, useCallback } from 'react';
import { RefreshCw, Download, Copy, Monitor, Smartphone, Check, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MVPBuilderPreviewProps {
  html: string | null;
  isGenerating: boolean;
}

export const MVPBuilderPreview: React.FC<MVPBuilderPreviewProps> = ({ html, isGenerating }) => {
  const [previewKey, setPreviewKey] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);

  const handleRefresh = () => setPreviewKey((k) => k + 1);

  const handleExport = useCallback(() => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'app.html';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('HTML file downloaded');
  }, [html]);

  const handleCopy = useCallback(async () => {
    if (!html) return;
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }, [html]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 h-10 border-b border-border/50 bg-background/80 shrink-0">
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('desktop')}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desktop view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('mobile')}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mobile view (375px)</TooltipContent>
            </Tooltip>
          </div>

          <span className="text-xs text-muted-foreground font-medium">Preview</span>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleRefresh}
                  disabled={!html}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh preview</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopy}
                  disabled={!html}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy HTML</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs px-2"
                  onClick={handleExport}
                  disabled={!html}
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download as .html file</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Preview area */}
        <div
          className={cn(
            'flex-1 min-h-0 flex items-center justify-center bg-muted/20 overflow-hidden',
            viewMode === 'mobile' ? 'p-4' : 'p-0'
          )}
        >
          {!html && !isGenerating && (
            /* Empty state */
            <div className="flex flex-col items-center gap-3 text-center px-8 py-12 select-none">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Wand2 className="h-8 w-8 text-primary/60" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Your app will appear here
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Describe what you want to build in the chat
                </p>
              </div>
            </div>
          )}

          {!html && isGenerating && (
            /* Generating skeleton */
            <div className="flex flex-col items-center gap-4 text-center px-8 py-12">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Building your app...</p>
                <p className="text-xs text-muted-foreground">
                  This usually takes 15–30 seconds
                </p>
              </div>
            </div>
          )}

          {html && (
            <div
              className={cn(
                'relative h-full transition-all duration-300',
                viewMode === 'desktop' ? 'w-full' : 'w-[375px] shadow-2xl rounded-xl overflow-hidden'
              )}
            >
              {isGenerating && (
                <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating…
                  </div>
                </div>
              )}
              <iframe
                key={previewKey}
                srcDoc={html}
                sandbox="allow-scripts allow-forms allow-modals allow-popups"
                className={cn(
                  'w-full h-full border-0',
                  viewMode === 'mobile' && 'rounded-xl'
                )}
                title="App Preview"
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
