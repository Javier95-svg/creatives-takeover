import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import {
  ArrowRight,
  Check,
  FileText,
  FolderOpen,
  Loader2,
  Pencil,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { buildIcpDashboardSnapshot, normalizeStoredArtifact } from '@/lib/icpDraftArtifacts';
import { IcpFolioDocument } from '@/components/icp/IcpFolioDocument';
import type { DashboardFileRecord, PrimaryIcpDashboardData } from '@/hooks/usePersonalizedDashboard';
import type { StoredIcpArtifact } from '@/lib/icpBuilderSession';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import {
  DASHBOARD_FILES_BUCKET,
  DASHBOARD_FILE_MAX_UPLOAD_BYTES,
  buildUploadedFilePreview,
  formatFileSize,
  getDashboardFileTypeLabel,
  getDashboardStorageLimit,
  getFileExtension,
  isSupportedDashboardFile,
  stripFileExtension,
} from '@/lib/dashboardFiles';

interface MyFilesSectionProps {
  files: DashboardFileRecord[];
  primaryIcp: PrimaryIcpDashboardData | null;
  refreshDashboard?: () => Promise<void>;
}

type PreviewPayload = {
  excerpt?: string;
  stage?: string;
  file_type?: string;
  personaName?: string;
  roleLine?: string;
  painLine?: string;
  industry?: string;
};

const sortFiles = (files: DashboardFileRecord[]) =>
  [...files].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

const mergeFiles = (incoming: DashboardFileRecord[], current: DashboardFileRecord[]) => {
  const merged = new Map<string, DashboardFileRecord>();

  current.forEach((file) => merged.set(file.id, file));
  incoming.forEach((file) => merged.set(file.id, { ...merged.get(file.id), ...file }));

  return sortFiles(Array.from(merged.values()));
};

const getUploadStage = (file: DashboardFileRecord) => {
  const preview = (file.preview_payload ?? {}) as PreviewPayload;
  if (file.upload_status === 'ready') return 'Ready';
  if (preview.stage === 'Preparing preview') return 'Preparing preview';
  return 'Uploading';
};

const getUploadStageProgress = (file: DashboardFileRecord) => {
  const stage = getUploadStage(file);
  if (stage === 'Uploading') return 35;
  if (stage === 'Preparing preview') return 72;
  return 100;
};

const formatFileDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const describeUploadFailure = (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason ?? '');
  const lower = message.toLowerCase();

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection')) {
    return "We couldn't upload this file because the connection dropped. Please try again.";
  }

  return "We couldn't upload this file right now. Please try again.";
};

export function MyFilesSection({ files, primaryIcp, refreshDashboard }: MyFilesSectionProps) {
  const { user } = useAuth();
  const { subscriptionData } = useSubscription();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [localFiles, setLocalFiles] = useState<DashboardFileRecord[]>(() => sortFiles(files));
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<StoredIcpArtifact | null>(primaryIcp?.artifact ?? null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(primaryIcp?.analysisId ?? null);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DashboardFileRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLocalFiles((current) => mergeFiles(files, current));
  }, [files]);

  const selectedFile = useMemo(
    () => localFiles.find((file) => file.id === selectedFileId) ?? localFiles[0] ?? null,
    [localFiles, selectedFileId],
  );

  useEffect(() => {
    if (!selectedFileId && localFiles.length > 0) {
      const defaultFile = primaryIcp
        ? localFiles.find((file) => file.source_id === primaryIcp.analysisId) ?? localFiles[0]
        : localFiles[0];
      setSelectedFileId(defaultFile.id);
    }
  }, [localFiles, primaryIcp, selectedFileId]);

  useEffect(() => {
    if (!selectedFile && localFiles.length > 0) {
      setSelectedFileId(localFiles[0].id);
    }
  }, [localFiles, selectedFile]);

  useEffect(() => {
    if (!selectedFile) {
      setSelectedArtifact(null);
      setSelectedAnalysisId(null);
      setSelectedPdfUrl(null);
      setLoadError(null);
      return;
    }

    if (selectedFile.source_table === 'icp_analysis_results') {
      setSelectedPdfUrl(null);

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
    }

    setSelectedArtifact(null);
    setSelectedAnalysisId(null);
    setSelectedPdfUrl(null);

    const extension = selectedFile.file_extension?.toLowerCase() ?? '';
    if (extension === 'pdf' && selectedFile.storage_path) {
      let isCancelled = false;

      const loadPdf = async () => {
        setIsLoading(true);
        setLoadError(null);

        const { data, error } = await supabase.storage
          .from(DASHBOARD_FILES_BUCKET)
          .createSignedUrl(selectedFile.storage_path, 60 * 60);

        if (isCancelled) return;

        if (error || !data?.signedUrl) {
          setLoadError('Could not open this PDF right now.');
          setSelectedPdfUrl(null);
          setIsLoading(false);
          return;
        }

        setSelectedPdfUrl(data.signedUrl);
        setIsLoading(false);
      };

      void loadPdf();

      return () => {
        isCancelled = true;
      };
    }

    setIsLoading(false);
    if (selectedFile.upload_status === 'failed' && !selectedFile.extracted_text) {
      setLoadError('Preview unavailable right now. You can retry the upload if needed.');
      return;
    }

    setLoadError(null);
  }, [primaryIcp, selectedFile]);

  const selectedSummary = selectedArtifact ? buildIcpDashboardSnapshot(selectedArtifact) : null;
  const storageLimit = getDashboardStorageLimit(subscriptionData.subscription_tier);
  const userUploadedBytes = useMemo(
    () =>
      localFiles.reduce((total, file) => {
        if (file.origin !== 'user_upload') return total;
        return total + (file.file_size_bytes ?? 0);
      }, 0),
    [localFiles],
  );
  const storageUsagePercent = Math.min(Math.round((userUploadedBytes / storageLimit) * 100), 100);

  const syncDashboardFiles = async () => {
    if (!refreshDashboard) return;
    await refreshDashboard();
  };

  const patchLocalFile = (fileId: string, updates: Partial<DashboardFileRecord>) => {
    setLocalFiles((current) =>
      sortFiles(
        current.map((file) => (file.id === fileId ? { ...file, ...updates, updated_at: new Date().toISOString() } : file)),
      ),
    );
  };

  const removeLocalFile = (fileId: string) => {
    setLocalFiles((current) => current.filter((file) => file.id !== fileId));
    setSelectedFileId((currentSelected) => (currentSelected === fileId ? null : currentSelected));
  };

  const uploadDashboardFile = async (file: File, reservedBytes = 0) => {
    if (!user) {
      toast.error('Please sign in to upload files.');
      return 0;
    }

    if (!isSupportedDashboardFile(file)) {
      toast.error('You can upload PDF, Word, TXT, or Markdown files only.');
      return 0;
    }

    if (file.size > DASHBOARD_FILE_MAX_UPLOAD_BYTES) {
      toast.error('This file is larger than the 10MB limit.');
      return 0;
    }

    if (userUploadedBytes + reservedBytes + file.size > storageLimit) {
      toast.error('This upload would exceed your My Files storage limit.');
      return 0;
    }

    const extension = getFileExtension(file.name);
    const fileId = crypto.randomUUID();
    const now = new Date().toISOString();
    const storagePath = `${user.id}/${fileId}.${extension}`;

    const provisionalRow: DashboardFileRecord = {
      id: fileId,
      file_kind: 'uploaded_file',
      title: stripFileExtension(file.name),
      summary: 'Uploading file...',
      source_table: 'dashboard_files',
      source_id: fileId,
      preview_payload: { stage: 'Uploading' },
      origin: 'user_upload',
      storage_path: storagePath,
      mime_type: file.type || null,
      file_extension: extension,
      file_size_bytes: file.size,
      extracted_text: null,
      upload_status: 'processing',
      is_protected: false,
      created_at: now,
      updated_at: now,
    };

    setLocalFiles((current) => sortFiles([provisionalRow, ...current]));
    setSelectedFileId(fileId);

    const { error: insertError } = await supabase.from('dashboard_files').insert({
      id: fileId,
      user_id: user.id,
      file_kind: 'uploaded_file',
      title: stripFileExtension(file.name),
      summary: 'Uploading file...',
      origin: 'user_upload',
      source_table: 'dashboard_files',
      source_id: fileId,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_extension: extension,
      file_size_bytes: file.size,
      preview_payload: { stage: 'Uploading' },
      upload_status: 'processing',
      is_protected: false,
      created_at: now,
      updated_at: now,
    });

    if (insertError) {
      removeLocalFile(fileId);
      toast.error("We couldn't create this file entry right now.");
      return 0;
    }

    const { error: uploadError } = await supabase.storage.from(DASHBOARD_FILES_BUCKET).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

    if (uploadError) {
      await supabase.from('dashboard_files').delete().eq('id', fileId).eq('user_id', user.id);
      removeLocalFile(fileId);
      toast.error(describeUploadFailure(uploadError));
      return 0;
    }

    patchLocalFile(fileId, {
      summary: 'Preparing preview...',
      preview_payload: { stage: 'Preparing preview' },
    });

    const { data: parseData, error: parseError } = await supabase.functions.invoke('document-parser', {
      body: {
        file_path: storagePath,
        user_id: user.id,
        bucket: DASHBOARD_FILES_BUCKET,
        target_table: 'dashboard_files',
        record_id: fileId,
      },
    });

    if (parseError || !parseData?.success) {
      patchLocalFile(fileId, {
        upload_status: 'failed',
        summary: 'Preview unavailable right now.',
        preview_payload: { excerpt: 'Preview unavailable right now.' },
      });
      toast.error("We uploaded the file, but couldn't prepare the preview right now.");
      void syncDashboardFiles();
      return file.size;
    }

    const parsedRow = parseData.dashboard_file as Partial<DashboardFileRecord> | null;
    patchLocalFile(fileId, {
      ...(parsedRow ?? {}),
      upload_status: 'ready',
      summary: parsedRow?.summary ?? buildUploadedFilePreview(parseData.document?.text) ?? 'Ready',
      extracted_text: parsedRow?.extracted_text ?? parseData.document?.text ?? null,
      preview_payload:
        parsedRow?.preview_payload ??
        ({
          excerpt: buildUploadedFilePreview(parseData.document?.text),
          file_type: extension,
        } satisfies PreviewPayload),
    });

    toast.success('File uploaded successfully.');
    void syncDashboardFiles();
    return file.size;
  };

  const handleSelectedFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    let reservedBytes = 0;
    for (const file of Array.from(fileList)) {
      reservedBytes += await uploadDashboardFile(file, reservedBytes);
    }
  };

  const handleRenameStart = (file: DashboardFileRecord) => {
    setEditingFileId(file.id);
    setDraftTitle(file.title);
  };

  const handleRenameSave = async () => {
    if (!selectedFile || selectedFile.origin !== 'user_upload') return;

    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === selectedFile.title) {
      setEditingFileId(null);
      setDraftTitle('');
      return;
    }

    setIsSavingTitle(true);
    const { error } = await supabase
      .from('dashboard_files')
      .update({ title: nextTitle })
      .eq('id', selectedFile.id)
      .eq('user_id', user?.id ?? '');

    setIsSavingTitle(false);

    if (error) {
      toast.error("We couldn't rename this file right now.");
      return;
    }

    patchLocalFile(selectedFile.id, { title: nextTitle });
    setEditingFileId(null);
    setDraftTitle('');
    toast.success('File renamed.');
    void syncDashboardFiles();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !user) return;

    setIsDeleting(true);

    if (deleteTarget.storage_path) {
      const { error: storageError } = await supabase.storage.from(DASHBOARD_FILES_BUCKET).remove([deleteTarget.storage_path]);
      if (storageError) {
        console.error('Dashboard file storage delete failed', storageError);
      }
    }

    const { error } = await supabase
      .from('dashboard_files')
      .delete()
      .eq('id', deleteTarget.id)
      .eq('user_id', user.id);

    setIsDeleting(false);

    if (error) {
      toast.error("We couldn't delete this file right now.");
      return;
    }

    removeLocalFile(deleteTarget.id);
    setDeleteTarget(null);
    toast.success('File deleted.');
    void syncDashboardFiles();
  };

  const selectedFileType = getDashboardFileTypeLabel(selectedFile?.file_extension, selectedFile?.file_kind);
  const selectedPreview = (selectedFile?.preview_payload ?? {}) as PreviewPayload;

  return (
    <section id="my-files" className="space-y-6">
      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FolderOpen className="h-5 w-5 text-primary" />
                My Files
              </CardTitle>
              <CardDescription>
                Upload notes, decks, and source docs here. Your ICP Draft stays here automatically as a protected system file.
              </CardDescription>
            </div>
            <div className="w-full max-w-sm space-y-2 rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Storage used</span>
                <span className="font-medium text-foreground">
                  {formatFileSize(userUploadedBytes)} / {formatFileSize(storageLimit)}
                </span>
              </div>
              <Progress value={storageUsagePercent} className="h-2 bg-background/70" />
              <p className="text-xs text-muted-foreground">
                Rookie, Starter, and Rising include 100MB. Pro includes 500MB.
              </p>
            </div>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragActive(false);
              void handleSelectedFiles(event.dataTransfer.files);
            }}
            className={`rounded-2xl border border-dashed px-5 py-5 transition-colors ${
              isDragActive
                ? 'border-primary/50 bg-primary/10'
                : 'border-border/70 bg-background/60 hover:border-primary/30 hover:bg-background/80'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.md"
              multiple
              className="hidden"
              onChange={(event) => {
                void handleSelectedFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Upload files</p>
                <p className="text-sm text-muted-foreground">
                  Drag files here or choose PDF, Word, TXT, or Markdown documents up to 10MB each.
                </p>
              </div>
              <Button type="button" variant="outline" className="shrink-0">
                <Upload className="h-4 w-4" />
                Upload files
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {localFiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-6 text-sm text-muted-foreground">
              Upload your first document here. Your ICP Draft will also appear automatically once it is created.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {localFiles.map((file) => {
                const preview = (file.preview_payload ?? {}) as PreviewPayload;
                const isSelected = selectedFile?.id === file.id;
                const typeLabel = getDashboardFileTypeLabel(file.file_extension, file.file_kind);

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
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">{file.title}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{typeLabel}</Badge>
                          {file.origin === 'system_generated' ? (
                            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                              System
                            </Badge>
                          ) : null}
                          {file.upload_status === 'processing' ? <Badge variant="outline">{getUploadStage(file)}</Badge> : null}
                          {file.upload_status === 'failed' ? <Badge variant="outline">Preview failed</Badge> : null}
                        </div>
                      </div>
                      <FileText className="h-4.5 w-4.5 shrink-0 text-primary" />
                    </div>
                    {file.file_kind === 'icp_draft' ? (
                      <>
                        {preview.industry ? (
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{preview.industry}</p>
                        ) : null}
                        {preview.roleLine ? <p className="mt-2 text-sm text-foreground/85">{preview.roleLine}</p> : null}
                        {preview.painLine ? <p className="mt-2 text-sm text-muted-foreground">{preview.painLine}</p> : null}
                      </>
                    ) : (
                      <>
                        {file.upload_status === 'processing' ? (
                          <div className="mt-3 space-y-2">
                            <Progress value={getUploadStageProgress(file)} className="h-2 bg-background/70" />
                            <p className="text-sm text-muted-foreground">{getUploadStage(file)}</p>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-muted-foreground">
                            {preview.excerpt ?? file.summary ?? 'Open the full file below.'}
                          </p>
                        )}
                      </>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatFileDate(file.created_at)}</span>
                      <span>•</span>
                      <span>{formatFileSize(file.file_size_bytes)}</span>
                    </div>
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {editingFileId === selectedFile.id ? (
                    <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                      <Input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        maxLength={120}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={handleRenameSave} disabled={isSavingTitle}>
                          {isSavingTitle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingFileId(null);
                            setDraftTitle('');
                          }}
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-xl">{selectedFile.title}</CardTitle>
                      <Badge variant="outline">{selectedFileType}</Badge>
                      {selectedSummary ? <Badge variant="outline">{selectedSummary.suggestedStage}</Badge> : null}
                      {selectedFile.origin === 'system_generated' ? (
                        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                          System-generated
                        </Badge>
                      ) : null}
                    </>
                  )}
                </div>
                {selectedSummary ? (
                  <CardDescription className="max-w-3xl">
                    {selectedSummary.personaName} · {selectedSummary.industry} · {selectedSummary.corePainPoint}
                  </CardDescription>
                ) : (
                  <CardDescription className="max-w-3xl">
                    {selectedFile.summary ?? selectedPreview.excerpt ?? 'Open the full file below.'}
                  </CardDescription>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>{selectedFileType}</span>
                  <span>•</span>
                  <span>{formatFileSize(selectedFile.file_size_bytes)}</span>
                  <span>•</span>
                  <span>Uploaded {formatFileDate(selectedFile.created_at)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedFile.origin === 'user_upload' ? (
                  <>
                    {editingFileId !== selectedFile.id ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => handleRenameStart(selectedFile)}>
                        <Pencil className="h-4 w-4" />
                        Rename
                      </Button>
                    ) : null}
                    {!selectedFile.is_protected ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setDeleteTarget(selectedFile)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </>
                ) : null}
                {selectedAnalysisId ? (
                  <Button asChild variant="outline" className="shrink-0">
                    <Link to={`/icp/draft/${selectedAnalysisId}`}>
                      Open dedicated draft page
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading the full file...
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
                {loadError}
              </div>
            ) : selectedArtifact ? (
              <div className="overflow-hidden rounded-5xl border border-border/60 bg-background/40">
                <IcpFolioDocument
                  draft={selectedArtifact.draftDocument}
                  tone="platformPreview"
                  layout="embedded"
                  className="px-3 py-3 sm:px-4 sm:py-4"
                />
              </div>
            ) : selectedPdfUrl ? (
              <div className="overflow-hidden rounded-5xl border border-border/60 bg-background/40">
                <iframe
                  src={selectedPdfUrl}
                  title={selectedFile.title}
                  className="h-[70vh] min-h-[480px] w-full bg-transparent"
                />
              </div>
            ) : selectedFile.file_extension === 'md' ? (
              <div className="rounded-5xl border border-border/60 bg-background/50 p-5">
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-3 prose-headings:mt-5 prose-headings:mb-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {selectedFile.extracted_text ?? ''}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="rounded-5xl border border-border/60 bg-background/50 p-5">
                <div className="whitespace-pre-wrap text-sm leading-7 text-foreground/90">
                  {selectedFile.extracted_text ?? 'This file preview is still being prepared.'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteTarget?.title ?? 'this file'} from My Files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
