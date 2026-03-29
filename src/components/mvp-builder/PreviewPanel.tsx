import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Code2, Copy, ExternalLink, Loader2, Monitor, Tablet, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MVPBuilderCodePanel } from './MVPBuilderCodePanel';
import type {
  MVPProjectDependency,
  MVPProjectFile,
  MVPProjectFramework,
  MVPProjectSnapshot,
  MVPProjectType,
} from '@/lib/mvp-builder/project';

type PanelTab = 'preview' | 'code';
type DeviceMode = 'desktop' | 'tablet' | 'mobile';

interface PreviewPanelProps {
  html: string | null;
  generatedCode: string;
  isGenerating: boolean;
  projectFiles: MVPProjectFile[];
  baselineFiles: MVPProjectFile[];
  projectFramework: MVPProjectFramework;
  projectType: MVPProjectType;
  projectSummary: string;
  projectDependencies: MVPProjectDependency[];
  projectSnapshots: MVPProjectSnapshot[];
  selectedCodeFilePath: string | null;
  entryFilePath: string;
  codeChanges: Array<{ path: string; status: 'added' | 'modified' }>;
  onSelectCodeFile: (path: string) => void;
  onSaveCodeFile: (path: string, content: string) => void;
  onResetCodeFile: (path: string) => void;
  onResetProjectCode: () => void;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onSelectEntryFile: (path: string) => void;
}

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: '100%',
  tablet: '820px',
  mobile: '390px',
};

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  html,
  generatedCode,
  isGenerating,
  projectFiles,
  baselineFiles,
  projectFramework,
  projectType,
  projectSummary,
  projectDependencies,
  projectSnapshots,
  selectedCodeFilePath,
  entryFilePath,
  codeChanges,
  onSelectCodeFile,
  onSaveCodeFile,
  onResetCodeFile,
  onResetProjectCode,
  onCreateSnapshot,
  onRestoreSnapshot,
  onSelectEntryFile,
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('preview');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [copied, setCopied] = useState(false);
  const htmlEntryOptions = useMemo(
    () => projectFiles.filter((file) => file.path.toLowerCase().endsWith('.html')),
    [projectFiles]
  );

  const handleCopy = async () => {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success('Code copied.');
    window.setTimeout(() => setCopied(false), 1400);
  };

  const handleOpenInNewTab = () => {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <motion.section
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-border/60 bg-background/90 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.75)]"
    >
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/35 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 ease-out',
                activeTab === 'preview'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 ease-out',
                activeTab === 'code'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Code
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'preview' && (
              <div className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/35 p-1">
                {([
                  ['desktop', <Monitor key="desktop" className="h-3.5 w-3.5" />],
                  ['tablet', <Tablet key="tablet" className="h-3.5 w-3.5" />],
                  ['mobile', <Smartphone key="mobile" className="h-3.5 w-3.5" />],
                ] as Array<[DeviceMode, React.ReactNode]>).map(([mode, icon]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDeviceMode(mode)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ease-out',
                      deviceMode === mode
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl text-xs"
              onClick={handleOpenInNewTab}
              disabled={!html}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Open in new tab
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl text-xs"
              onClick={handleCopy}
              disabled={!generatedCode}
            >
              {copied ? (
                <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              Copy code
            </Button>
          </div>
        </div>
      </div>

      {activeTab === 'code' ? (
        <div className="min-h-0 flex-1">
          <MVPBuilderCodePanel
            files={projectFiles}
            baselineFiles={baselineFiles}
            projectFramework={projectFramework}
            projectType={projectType}
            projectSummary={projectSummary}
            projectDependencies={projectDependencies}
            projectSnapshots={projectSnapshots}
            selectedFilePath={selectedCodeFilePath}
            entryFilePath={entryFilePath}
            codeChanges={codeChanges}
            isGenerating={isGenerating}
            onSelectFile={onSelectCodeFile}
            onSaveFile={onSaveCodeFile}
            onResetFile={onResetCodeFile}
            onResetProject={onResetProjectCode}
            onCreateSnapshot={onCreateSnapshot}
            onRestoreSnapshot={onRestoreSnapshot}
            onSelectEntryFile={onSelectEntryFile}
          />
        </div>
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))]">
          {isGenerating && (
            <motion.div
              className="absolute left-0 right-0 top-0 z-20 h-1.5 overflow-hidden bg-border/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <motion.div
                className="h-full w-1/3 rounded-full bg-primary"
                animate={{ x: ['-20%', '220%'] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
              />
            </motion.div>
          )}

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4 md:p-6">
            {!html && !isGenerating ? (
              <div className="max-w-md text-center">
                <div className="mx-auto mb-6 h-20 w-20 rounded-[28px] border border-primary/20 bg-primary/10" />
                <p className="text-lg font-semibold text-foreground">
                  Describe what you want to build and watch it come to life
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  The live preview appears here as soon as the first code starts streaming.
                </p>
              </div>
            ) : (
              <div
                className={cn(
                  'relative h-full min-h-[540px] w-full overflow-hidden rounded-[28px] border border-border/60 bg-white shadow-[0_30px_80px_-55px_rgba(15,23,42,0.65)] transition-all duration-200 ease-out',
                  deviceMode === 'desktop' ? 'max-w-none' : 'mx-auto'
                )}
                style={{ width: DEVICE_WIDTHS[deviceMode] }}
              >
                {isGenerating && !html && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/85">
                    <div className="space-y-3 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Streaming your preview…
                      </p>
                    </div>
                  </div>
                )}

                {html ? (
                  <iframe
                    title="MVP Builder Preview"
                    srcDoc={html}
                    sandbox="allow-scripts allow-forms allow-modals allow-popups"
                    className="h-full w-full border-0 bg-white"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-background">
                    <div className="space-y-3 px-8 text-center">
                      <div className="grid gap-2">
                        <div className="h-3 rounded-full bg-muted animate-pulse" />
                        <div className="h-3 rounded-full bg-muted animate-pulse" />
                        <div className="h-3 rounded-full bg-muted animate-pulse" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Preparing preview surface…
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {activeTab === 'preview' && htmlEntryOptions.length > 1 && (
            <div className="border-t border-border/50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Code2 className="h-3.5 w-3.5" />
                Preview entry file
                <select
                  value={entryFilePath}
                  onChange={(event) => onSelectEntryFile(event.target.value)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none"
                >
                  {htmlEntryOptions.map((file) => (
                    <option key={file.path} value={file.path}>
                      {file.path}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.section>
  );
};
