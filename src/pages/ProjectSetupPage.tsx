import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, FileText, Globe, Loader2, Lock, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { ANGEL_SECTOR_OPTIONS } from "@/data/angelSectors";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { captureEvent } from "@/lib/analytics";
import {
  DASHBOARD_FILE_ALLOWED_EXTENSIONS,
  DASHBOARD_FILE_MAX_UPLOAD_BYTES,
  formatFileSize,
  getDashboardStorageLimit,
  isSupportedDashboardFile,
} from "@/lib/dashboardFiles";
import { prepareDashboardUpload, runDashboardUpload } from "@/lib/dashboardFileUpload";
import {
  IMPORTED_FIELD_LIMITS,
  PROJECT_BUSINESS_MODEL_OPTIONS,
  PROJECT_IMPORT_MAX_FILES,
  PROJECT_STAGE_OPTIONS,
  buildFounderIdUpdate,
  buildProjectRecord,
  emptyImportedProject,
  founderIdChanges,
  normalizeImportedProject,
  normalizeImportedSources,
  safeNextPath,
  type ImportedField,
  type ImportedProject,
  type ImportedSources,
} from "@/lib/projectImport";
import { checkPublicUrl } from "../../supabase/functions/_shared/public-url-guard";
import { updateUserPreferences } from "@/lib/retentionSystem";
import { scrollToTopFrom } from "@/lib/scrollToTop";
import { cn } from "@/lib/utils";

type Phase = "sources" | "reading" | "review" | "done";
type ReadingStatus = "waiting" | "working" | "done" | "failed";

interface PickedFile {
  key: string;
  file: File;
  /** dashboard_files id once uploaded, so a retry doesn't upload it twice. */
  uploadedId?: string;
}

interface ExistingState {
  username: string | null;
  startupLinks: unknown;
  project: { id: string; context: unknown } | null;
  base: ImportedProject;
}

// The legacy "Mobility & Logistics" sector stays readable on old records but isn't offered.
const INDUSTRY_OPTIONS = ANGEL_SECTOR_OPTIONS.filter((option) => option !== "Mobility & Logistics");
const ACCEPT = DASHBOARD_FILE_ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(",");

function SourceChip({ source }: { source?: string }) {
  if (!source) return null;
  return (
    <Badge variant="outline" className="ml-2 border-primary/30 bg-primary/5 font-normal text-primary">
      from {source}
    </Badge>
  );
}

function Field({
  label,
  source,
  hint,
  children,
}: {
  label: string;
  source?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="flex flex-wrap items-center text-sm font-medium">
        {label}
        <SourceChip source={source} />
      </span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function StatusIcon({ status }: { status: ReadingStatus }) {
  if (status === "working") return <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />;
  if (status === "done") return <Check className="h-4 w-4 text-success" aria-hidden />;
  if (status === "failed") return <X className="h-4 w-4 text-destructive" aria-hidden />;
  return <span className="h-2 w-2 rounded-full bg-border" aria-hidden />;
}

export default function ProjectSetupPage() {
  const { user, loading: authLoading } = useAuth();
  const { subscriptionData } = useSubscription();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"), "/dashboard");
  const fromSignup = searchParams.has("next");
  const userId = user?.id ?? null;

  const [phase, setPhase] = useState<Phase>("sources");
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [website, setWebsite] = useState("");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [reading, setReading] = useState<Array<{ label: string; status: ReadingStatus }>>([]);
  const [project, setProject] = useState<ImportedProject>(emptyImportedProject);
  const [sources, setSources] = useState<ImportedSources>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showOnFounderId, setShowOnFounderId] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existing, setExisting] = useState<ExistingState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const load = async () => {
      const [{ data: profile }, { data: projects }] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, startup_name, startup_tagline, startup_description, startup_stage, startup_industry, startup_links")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("projects")
          .select("id, title, idea_summary, context, last_run_at, created_at")
          .eq("user_id", userId)
          .is("archived_at", null)
          .order("last_run_at", { ascending: false, nullsFirst: false })
          .limit(1),
      ]);
      if (cancelled) return;
      const row = (projects?.[0] ?? null) as { id: string; title: string | null; idea_summary: string | null; context: unknown } | null;
      const links = (profile?.startup_links ?? {}) as Record<string, unknown>;
      const previous = (row?.context as { import?: unknown } | null)?.import;
      // Start from what the founder already has, so saving never blanks it.
      const base = normalizeImportedProject(
        {
          name: profile?.startup_name || row?.title,
          pitch: profile?.startup_tagline || row?.idea_summary,
          description: profile?.startup_description,
          stage: profile?.startup_stage,
          industry: profile?.startup_industry,
          website: links.website,
          demo: links.demo,
          pitchDeck: links.pitchDeck,
          ...(previous && typeof previous === "object" ? previous : {}),
        },
        INDUSTRY_OPTIONS,
      );
      setExisting({ username: profile?.username ?? null, startupLinks: profile?.startup_links ?? null, project: row ? { id: row.id, context: row.context } : null, base });
      setProject(base);
      if (base.website) setWebsite((current) => current || base.website);
    };
    void load();
    return () => { cancelled = true; };
  }, [userId]);

  const changes = useMemo(() => founderIdChanges(project), [project]);

  if (!authLoading && !user) {
    return <Navigate to={`/login?return=${encodeURIComponent("/project-setup")}`} replace />;
  }

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setSourceError(null);
    const incoming = Array.from(list);
    const accepted: PickedFile[] = [];
    for (const file of incoming) {
      if (!isSupportedDashboardFile(file)) {
        setSourceError(`${file.name} isn't a PDF, Word, TXT or Markdown file.`);
        continue;
      }
      if (file.size > DASHBOARD_FILE_MAX_UPLOAD_BYTES) {
        setSourceError(`${file.name} is larger than the ${formatFileSize(DASHBOARD_FILE_MAX_UPLOAD_BYTES)} limit.`);
        continue;
      }
      accepted.push({ key: `${file.name}-${file.size}-${file.lastModified}`, file });
    }
    setFiles((current) => {
      const merged = [...current];
      for (const entry of accepted) {
        if (!merged.some((existingFile) => existingFile.key === entry.key)) merged.push(entry);
      }
      if (merged.length > PROJECT_IMPORT_MAX_FILES) {
        setSourceError(`You can add up to ${PROJECT_IMPORT_MAX_FILES} files.`);
        return merged.slice(0, PROJECT_IMPORT_MAX_FILES);
      }
      return merged;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (key: string) => setFiles((current) => current.filter((entry) => entry.key !== key));

  const setStatus = (index: number, status: ReadingStatus) =>
    setReading((current) => current.map((entry, i) => (i === index ? { ...entry, status } : entry)));

  const handleRead = async () => {
    if (!userId) return;
    setSourceError(null);
    const trimmedWebsite = website.trim();
    if (trimmedWebsite) {
      const check = checkPublicUrl(trimmedWebsite);
      if (!check.ok) {
        setSourceError(check.reason);
        return;
      }
    }
    if (files.length === 0 && !trimmedWebsite) {
      setSourceError("Add a file or your website link.");
      return;
    }

    const pending = files.filter((entry) => !entry.uploadedId);
    if (pending.length > 0) {
      const { data: rows } = await supabase
        .from("dashboard_files")
        .select("file_size_bytes, origin")
        .eq("user_id", userId);
      const used = (rows ?? []).reduce((total, row) => total + (row.origin === "user_upload" ? row.file_size_bytes ?? 0 : 0), 0);
      const adding = pending.reduce((total, entry) => total + entry.file.size, 0);
      if (used + adding > getDashboardStorageLimit(subscriptionData.subscription_tier)) {
        setSourceError("These files would go over your Files storage limit. Remove a file or free up space in Files.");
        return;
      }
    }

    const steps = [
      ...files.map((entry) => ({ label: entry.file.name, status: (entry.uploadedId ? "done" : "waiting") as ReadingStatus })),
      ...(trimmedWebsite ? [{ label: "Your website", status: "waiting" as ReadingStatus }] : []),
      { label: "Drafting your project", status: "waiting" as ReadingStatus },
    ];
    setReading(steps);
    setPhase("reading");
    captureEvent("project_setup_read_started", { files: files.length, website: Boolean(trimmedWebsite) });

    const fileIds: string[] = [];
    const nextFiles = [...files];
    for (let index = 0; index < nextFiles.length; index += 1) {
      const entry = nextFiles[index];
      if (entry.uploadedId) {
        fileIds.push(entry.uploadedId);
        continue;
      }
      setStatus(index, "working");
      const prepared = prepareDashboardUpload(userId, entry.file);
      const result = await runDashboardUpload(userId, entry.file, prepared);
      if (result.status === "insert_failed" || result.status === "upload_failed") {
        setStatus(index, "failed");
        continue;
      }
      nextFiles[index] = { ...entry, uploadedId: prepared.fileId };
      fileIds.push(prepared.fileId);
      setStatus(index, result.status === "ready" ? "done" : "failed");
    }
    setFiles(nextFiles);

    const websiteIndex = trimmedWebsite ? nextFiles.length : -1;
    const draftIndex = steps.length - 1;
    if (websiteIndex >= 0) setStatus(websiteIndex, "working");
    setStatus(draftIndex, "working");

    const { data, error } = await supabase.functions.invoke("project-import-extract", {
      body: { file_ids: fileIds, website_url: trimmedWebsite || undefined },
    });

    // invoke() reports non-2xx answers as an error; the body still says why.
    let payload = data as { success?: boolean; error?: string; fields?: unknown; sources?: unknown; read?: string[]; warnings?: string[] } | null;
    if (error && !payload) {
      const context = (error as { context?: Response }).context;
      payload = context ? await context.json().catch(() => null) : null;
    }

    if (!payload?.success) {
      if (websiteIndex >= 0) setStatus(websiteIndex, "failed");
      setStatus(draftIndex, "failed");
      setSourceError(payload?.error ?? "We couldn't read your project right now. Please try again.");
      captureEvent("project_setup_read_failed", { files: files.length, website: Boolean(trimmedWebsite) });
      setPhase("sources");
      return;
    }

    if (websiteIndex >= 0) setStatus(websiteIndex, payload.read?.includes("website") ? "done" : "failed");
    setStatus(draftIndex, "done");

    const drafted = normalizeImportedProject(payload.fields, INDUSTRY_OPTIONS);
    const base = existing?.base ?? emptyImportedProject();
    // Drafted values fill the form; anything the sources didn't cover keeps what the founder already had.
    const merged = Object.fromEntries(
      (Object.keys(base) as ImportedField[]).map((field) => {
        const value = drafted[field];
        const filled = Array.isArray(value) ? value.length > 0 : Boolean(value);
        return [field, filled ? value : base[field]];
      }),
    ) as unknown as ImportedProject;

    setProject(merged);
    setSources(normalizeImportedSources(payload.sources, drafted));
    setWarnings(payload.warnings ?? []);
    captureEvent("project_setup_read_completed", { files: files.length, website: Boolean(trimmedWebsite), fields: Object.keys(payload.sources ?? {}).length });
    setPhase("review");
    scrollToTopFrom(topRef.current);
  };

  const update = <K extends ImportedField>(field: K, value: ImportedProject[K]) => {
    setProject((current) => ({ ...current, [field]: value }));
  };

  const toggleIndustry = (industry: string) => {
    setProject((current) => {
      const has = current.industry.includes(industry);
      if (!has && current.industry.length >= 3) return current;
      return { ...current, industry: has ? current.industry.filter((entry) => entry !== industry) : [...current.industry, industry] };
    });
  };

  const handleLater = async () => {
    captureEvent("project_setup_skipped", { phase, from_signup: fromSignup });
    if (userId) {
      void updateUserPreferences(userId, { project_import_dismissed_at: new Date().toISOString() }).catch(() => undefined);
    }
    navigate(nextPath);
  };

  const handleSave = async () => {
    if (!userId) return;
    const cleaned = normalizeImportedProject(project, INDUSTRY_OPTIONS);
    if (!cleaned.name) {
      toast.error("Add your project name to save.");
      return;
    }
    setIsSaving(true);
    try {
      const importedAt = new Date().toISOString();
      const record = buildProjectRecord(cleaned, sources, existing?.project?.context, importedAt);
      if (existing?.project) {
        const { error } = await supabase.from("projects").update(record as never).eq("id", existing.project.id).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projects").insert({ ...record, user_id: userId, status: "active" } as never);
        if (error) throw error;
      }

      const founderIdUpdate = buildFounderIdUpdate(cleaned, showOnFounderId, existing?.startupLinks);
      if (founderIdUpdate) {
        const { error } = await supabase.from("profiles").update(founderIdUpdate as never).eq("id", userId);
        if (error) throw error;
      }

      await updateUserPreferences(userId, { project_import_completed_at: importedAt });
      void queryClient.invalidateQueries({ queryKey: ["projects", userId] });
      captureEvent("project_setup_saved", {
        show_on_founder_id: showOnFounderId,
        fields: Object.values(cleaned).filter((value) => (Array.isArray(value) ? value.length > 0 : Boolean(value))).length,
        drafted_fields: Object.keys(sources).length,
        from_signup: fromSignup,
      });
      setPhase("done");
      scrollToTopFrom(topRef.current);
    } catch (error) {
      console.error("Project setup save failed", error);
      toast.error("We couldn't save your project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const canRead = files.length > 0 || website.trim().length > 0;

  return (
    <DashboardLayout title="Project setup" subtitle="Bring your project in once. You check what we draft.">
      <div ref={topRef} className="mx-auto w-full max-w-3xl space-y-6">
        {phase === "sources" ? (
          <section className="space-y-5" aria-labelledby="project-sources-title">
            <div>
              <h2 id="project-sources-title" className="text-xl font-semibold">What do you have about your project?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A pitch deck, a one-pager, notes or your website. Add any of them; more sources make a better draft.
              </p>
            </div>

            <Card className="border-border/70">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-primary" aria-hidden />
                  Files
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    addFiles(event.dataTransfer.files);
                  }}
                  disabled={files.length >= PROJECT_IMPORT_MAX_FILES}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-medium">Drop files here or choose them</span>
                  <span className="text-xs text-muted-foreground">
                    PDF, Word, TXT or Markdown · up to {PROJECT_IMPORT_MAX_FILES} files · {formatFileSize(DASHBOARD_FILE_MAX_UPLOAD_BYTES)} each
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(event) => addFiles(event.target.files)}
                />
                {files.length > 0 ? (
                  <ul className="space-y-2">
                    {files.map((entry) => (
                      <li key={entry.key} className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2 text-sm">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{entry.file.name}</span>
                        <span className="text-xs text-muted-foreground">{formatFileSize(entry.file.size)}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeFile(entry.key)} aria-label={`Remove ${entry.file.name}`}>
                          <X className="h-4 w-4" aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="text-xs text-muted-foreground">Files you add here are also kept in your Files.</p>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardContent className="space-y-3 p-5">
                <label className="block space-y-1.5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Globe className="h-4 w-4 text-primary" aria-hidden />
                    Website
                  </span>
                  <Input
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    placeholder="yourproject.com"
                    inputMode="url"
                    autoComplete="url"
                  />
                </label>
                <p className="text-xs text-muted-foreground">We read the page's public text once. Nothing is posted anywhere.</p>
              </CardContent>
            </Card>

            {sourceError ? (
              <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {sourceError}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
              <Button variant="ghost" onClick={handleLater}>I'll do this later</Button>
              <Button variant="outline" className="sm:ml-auto" onClick={() => setPhase("review")}>
                Fill it in myself
              </Button>
              <Button onClick={handleRead} disabled={!canRead}>
                Read my project
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </section>
        ) : null}

        {phase === "reading" ? (
          <section className="space-y-4" aria-live="polite" aria-labelledby="project-reading-title">
            <h2 id="project-reading-title" className="text-xl font-semibold">Reading your project…</h2>
            <p className="text-sm text-muted-foreground">Keep this page open while we read your sources.</p>
            <Card className="border-border/70">
              <CardContent className="space-y-3 p-5">
                {reading.map((entry) => (
                  <div key={entry.label} className="flex items-center gap-3 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center">
                      <StatusIcon status={entry.status} />
                    </span>
                    <span className={cn("min-w-0 truncate", entry.status === "waiting" && "text-muted-foreground")}>{entry.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {phase === "review" ? (
          <section className="space-y-5" aria-labelledby="project-review-title">
            <div>
              <h2 id="project-review-title" className="text-xl font-semibold">Check your project</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {Object.keys(sources).length > 0
                  ? "We drafted what your sources cover. Edit anything that's off, and fill in the gaps you want."
                  : "Fill in what you'd like. Only the project name is required."}
              </p>
            </div>

            {warnings.length > 0 ? (
              <div className="rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-sm text-foreground">
                {warnings.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            ) : null}

            <Card className="border-border/70">
              <CardContent className="space-y-4 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">The basics</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Project name" source={sources.name}>
                    <Input value={project.name} maxLength={IMPORTED_FIELD_LIMITS.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Ledgerly" />
                  </Field>
                  <Field label="Stage" source={sources.stage}>
                    <Select value={project.stage || undefined} onValueChange={(value) => update("stage", value as ImportedProject["stage"])}>
                      <SelectTrigger><SelectValue placeholder="Choose a stage" /></SelectTrigger>
                      <SelectContent>
                        {PROJECT_STAGE_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="One-line pitch" source={sources.pitch} hint={`${project.pitch.length}/${IMPORTED_FIELD_LIMITS.pitch}`}>
                  <Input value={project.pitch} maxLength={IMPORTED_FIELD_LIMITS.pitch} onChange={(event) => update("pitch", event.target.value)} placeholder="What it is and who it's for, in one sentence" />
                </Field>
                <Field label="What it does" source={sources.description}>
                  <Textarea value={project.description} maxLength={IMPORTED_FIELD_LIMITS.description} rows={3} onChange={(event) => update("description", event.target.value)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="The problem" source={sources.problem}>
                    <Textarea value={project.problem} maxLength={IMPORTED_FIELD_LIMITS.problem} rows={3} onChange={(event) => update("problem", event.target.value)} />
                  </Field>
                  <Field label="Target customer" source={sources.customer}>
                    <Textarea value={project.customer} maxLength={IMPORTED_FIELD_LIMITS.customer} rows={3} onChange={(event) => update("customer", event.target.value)} />
                  </Field>
                </div>
                <Field label="Business model" source={sources.businessModel}>
                  <Select value={project.businessModel || undefined} onValueChange={(value) => update("businessModel", value as ImportedProject["businessModel"])}>
                    <SelectTrigger><SelectValue placeholder="Choose a model" /></SelectTrigger>
                    <SelectContent>
                      {PROJECT_BUSINESS_MODEL_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="space-y-2">
                  <span className="flex flex-wrap items-center text-sm font-medium">
                    Industry <span className="ml-1 font-normal text-muted-foreground">(up to 3)</span>
                    <SourceChip source={sources.industry} />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {project.industry.map((industry) => (
                      <span key={industry} className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-3 py-1 text-xs text-primary-foreground">
                        {industry}
                        <button type="button" onClick={() => toggleIndustry(industry)} aria-label={`Remove ${industry}`} className="min-h-0 min-w-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      </span>
                    ))}
                    {project.industry.length < 3 ? (
                      <Select key={project.industry.join("|")} onValueChange={toggleIndustry}>
                        <SelectTrigger className="h-8 w-auto min-w-44 rounded-full text-xs"><SelectValue placeholder="Add an industry" /></SelectTrigger>
                        <SelectContent>
                          {INDUSTRY_OPTIONS.filter((option) => !project.industry.includes(option)).map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardContent className="space-y-4 p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Links</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Website" source={sources.website}>
                    <Input value={project.website} inputMode="url" onChange={(event) => update("website", event.target.value)} placeholder="https://" />
                  </Field>
                  <Field label="Demo" source={sources.demo}>
                    <Input value={project.demo} inputMode="url" onChange={(event) => update("demo", event.target.value)} placeholder="https://" />
                  </Field>
                  <Field label="Pitch deck" source={sources.pitchDeck}>
                    <Input value={project.pitchDeck} inputMode="url" onChange={(event) => update("pitchDeck", event.target.value)} placeholder="https://" />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardContent className="space-y-4 p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  Progress, private to you
                </h3>
                <Field label="Customers" source={sources.customers}>
                  <Textarea value={project.customers} maxLength={IMPORTED_FIELD_LIMITS.customers} rows={2} onChange={(event) => update("customers", event.target.value)} placeholder="Who uses or pays for it today" />
                </Field>
                <Field label="Traction" source={sources.traction}>
                  <Textarea value={project.traction} maxLength={IMPORTED_FIELD_LIMITS.traction} rows={2} onChange={(event) => update("traction", event.target.value)} placeholder="Users, revenue, pilots, waitlist" />
                </Field>
                <Field label="Team" source={sources.team}>
                  <Textarea value={project.team} maxLength={IMPORTED_FIELD_LIMITS.team} rows={2} onChange={(event) => update("team", event.target.value)} placeholder="Who's building it" />
                </Field>
              </CardContent>
            </Card>

            <label className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <Checkbox checked={showOnFounderId} onCheckedChange={(value) => setShowOnFounderId(value === true)} className="mt-0.5" />
              <span className="space-y-1 text-sm">
                <span className="block font-medium">Also show this on my Founder ID</span>
                <span className="block text-muted-foreground">
                  {changes.length > 0 ? `Updates your public ${changes.join(", ")}.` : "Nothing public to update yet."}{" "}
                  Customers, traction and team stay private.
                </span>
              </span>
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
              <Button variant="ghost" onClick={() => setPhase("sources")}>Back to sources</Button>
              <Button className="sm:ml-auto" onClick={handleSave} disabled={isSaving || !existing || !project.name.trim()}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                Save project
              </Button>
            </div>
            {!project.name.trim() ? <p className="text-right text-xs text-muted-foreground">Add your project name to save.</p> : null}
          </section>
        ) : null}

        {phase === "done" ? (
          <section className="space-y-5 py-6 text-center" aria-labelledby="project-done-title">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-6 w-6" aria-hidden />
            </span>
            <div className="space-y-1">
              <h2 id="project-done-title" className="text-xl font-semibold">{project.name} is set up</h2>
              <p className="text-sm text-muted-foreground">
                {showOnFounderId ? "Your Founder ID shows the public details now." : "Everything stays private until you choose to share it."}{" "}
                You can update it here any time.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              {showOnFounderId && existing?.username ? (
                <Button variant="outline" asChild>
                  <Link to={`/profile/${existing.username}`}>See my Founder ID</Link>
                </Button>
              ) : null}
              <Button onClick={() => navigate(nextPath)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
