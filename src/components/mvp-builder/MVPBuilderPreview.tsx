import React, { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Download, Copy, Monitor, Smartphone, Check, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const LOADING_STEPS = ['Thinking...', 'Writing HTML...', 'Adding styles...', 'Almost ready...'];

interface MVPBuilderPreviewProps {
  html: string | null;
  isGenerating: boolean;
}

export const MVPBuilderPreview: React.FC<MVPBuilderPreviewProps> = ({ html, isGenerating }) => {
  const [previewKey, setPreviewKey] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingStep(0);
      return;
    }
    const id = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 1500);
    return () => clearInterval(id);
  }, [isGenerating]);

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

  const statusBadge = isGenerating ? (
    <span className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
      Building...
    </span>
  ) : html ? (
    <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
      Ready
    </span>
  ) : (
    <span className="text-xs text-muted-foreground font-medium">Preview</span>
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full min-h-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 h-10 border-b border-border/40 bg-background/80 shrink-0">
          {/* Pill viewport toggle */}
          <div className="flex items-center bg-muted rounded-full p-0.5">
            <button
              onClick={() => setViewMode('desktop')}
              className={cn(
                'h-6 w-7 rounded-full flex items-center justify-center transition-all duration-200',
                viewMode === 'desktop'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={cn(
                'h-6 w-7 rounded-full flex items-center justify-center transition-all duration-200',
                viewMode === 'mobile'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Status badge */}
          {statusBadge}

          {/* Grouped action buttons */}
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg px-1 py-0.5">
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
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
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
            'flex-1 min-h-0 flex items-center justify-center overflow-hidden',
            viewMode === 'mobile' ? 'p-4 bg-muted/20' : 'p-0 bg-muted/10'
          )}
          style={
            !html
              ? {
                  backgroundImage:
                    'radial-gradient(circle, hsl(var(--border)/0.6) 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }
              : undefined
          }
        >
          {!html && !isGenerating && (
            <div className="flex flex-col items-center gap-3 text-center px-8 py-12 select-none">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center">
                <Wand2 className="h-8 w-8 text-primary/50" />
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
            <div className="flex flex-col items-center gap-4 text-center px-8 py-12">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-medium">{LOADING_STEPS[loadingStep]}</p>
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
