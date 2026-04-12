import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, FolderOpen, Loader2, ArrowRight } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { buildIcpDashboardSnapshot, normalizeStoredArtifact } from '@/lib/icpDraftArtifacts';
import { IcpFolioDocument } from '@/components/icp/IcpFolioDocument';
import type { DashboardFileRecord, PrimaryIcpDashboardData } from '@/hooks/usePersonalizedDashboard';
import type { StoredIcpArtifact } from '@/lib/icpBuilderSession';

interface MyFilesSectionProps {
  files: DashboardFileRecord[];
  primaryIcp: PrimaryIcpDashboardData | null;
}

export function MyFilesSection({ files, primaryIcp }: MyFilesSectionProps) {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<StoredIcpArtifact | null>(primaryIcp?.artifact ?? null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(primaryIcp?.analysisId ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) ?? files[0] ?? null,
    [files, selectedFileId],
  );

  useEffect(() => {
    if (!selectedFileId && files.length > 0) {
      const defaultFile = primaryIcp
        ? files.find((file) => file.source_id === primaryIcp.analysisId) ?? files[0]
        : files[0];
      setSelectedFileId(defaultFile.id);
    }
  }, [files, primaryIcp, selectedFileId]);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedArtifact(null);
      setSelectedAnalysisId(null);
      setLoadError(null);
      return;
    }

    if (selectedFile.source_table !== 'icp_analysis_results') {
      setSelectedArtifact(null);
      setSelectedAnalysisId(null);
      setLoadError('This file type is not available in the viewer yet.');
      return;
    }

    if (primaryIcp && selectedFile.source_id === primaryIcp.analysisId) {
      setSelectedArtifact(primaryIcp.artifact);
      setSelectedAnalysisId(primaryIcp.analysisId);
      setLoadError(null);
      return;
    }

    let isCancelled = false;

    const loadArtifact = async () => {
      setIsLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from('icp_analysis_results')
        .select('id, analysis_data, target_audience, business_description, verdict')
        .eq('id', selectedFile.source_id)
        .maybeSingle();

      if (isCancelled) return;

      if (error || !data) {
        setSelectedArtifact(null);
        setSelectedAnalysisId(null);
        setLoadError('Could not load this ICP Draft right now.');
        setIsLoading(false);
        return;
      }

      const normalized = normalizeStoredArtifact(data);
      if (!normalized.artifact) {
        setSelectedArtifact(null);
        setSelectedAnalysisId(null);
        setLoadError('This saved file could not be rendered.');
        setIsLoading(false);
        return;
      }

      setSelectedArtifact(normalized.artifact);
      setSelectedAnalysisId(data.id);
      setIsLoading(false);
    };

    void loadArtifact();

    return () => {
      isCancelled = true;
    };
  }, [primaryIcp, selectedFile]);

  const selectedSummary = selectedArtifact ? buildIcpDashboardSnapshot(selectedArtifact) : null;

  return (
    <section id="my-files" className="space-y-6">
      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderOpen className="h-5 w-5 text-primary" />
            My Files
          </CardTitle>
          <CardDescription>
            Platform-generated documents live here automatically so founders can reopen them without rebuilding context.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-6 text-sm text-muted-foreground">
              Your saved ICP Draft will appear here automatically after it is created.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {files.map((file) => {
                const preview = (file.preview_payload ?? {}) as {
                  personaName?: string;
                  roleLine?: string;
                  painLine?: string;
                  industry?: string;
                };
                const isSelected = selectedFile?.id === file.id;

                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setSelectedFileId(file.id)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      isSelected
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border/60 bg-background/70 hover:border-primary/30 hover:bg-background'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{file.title}</p>
                        {preview.industry ? (
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{preview.industry}</p>
                        ) : null}
                      </div>
                      <FileText className="h-4.5 w-4.5 shrink-0 text-primary" />
                    </div>
                    {preview.roleLine ? <p className="mt-3 text-sm text-foreground/85">{preview.roleLine}</p> : null}
                    {preview.painLine ? <p className="mt-2 text-sm text-muted-foreground">{preview.painLine}</p> : null}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Updated {new Date(file.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedFile ? (
        <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl">{selectedFile.title}</CardTitle>
                  {selectedSummary ? <Badge variant="outline">{selectedSummary.suggestedStage}</Badge> : null}
                </div>
                {selectedSummary ? (
                  <CardDescription className="max-w-3xl">
                    {selectedSummary.personaName} · {selectedSummary.industry} · {selectedSummary.corePainPoint}
                  </CardDescription>
                ) : (
                  <CardDescription>{selectedFile.summary ?? 'Open the full file below.'}</CardDescription>
                )}
              </div>
              {selectedAnalysisId ? (
                <Button asChild variant="outline" className="shrink-0">
                  <Link to={`/icp/draft/${selectedAnalysisId}`}>
                    Open dedicated draft page
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading the full draft...
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
                {loadError}
              </div>
            ) : selectedArtifact ? (
              <div className="overflow-hidden rounded-[2rem] border border-border/60 bg-background/40">
                <IcpFolioDocument
                  draft={selectedArtifact.draftDocument}
                  tone="platformPreview"
                  layout="embedded"
                  className="px-3 py-3 sm:px-4 sm:py-4"
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
