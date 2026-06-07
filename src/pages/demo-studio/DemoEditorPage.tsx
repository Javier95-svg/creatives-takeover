import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  Globe,
  Loader2,
  Rocket,
} from 'lucide-react';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import StepThumbnailList from '@/components/demo-studio/editor/StepThumbnailList';
import HotspotCanvas from '@/components/demo-studio/editor/HotspotCanvas';
import HotspotInspector from '@/components/demo-studio/editor/HotspotInspector';
import DemoPlayer from '@/components/demo-studio/player/DemoPlayer';
import { canRemoveWatermark, shouldShowWatermark } from '@/lib/demoStudio/plan';
import {
  createHotspot,
  createStep,
  deleteHotspot,
  deleteStep,
  getDemo,
  listHotspotsForDemo,
  listSteps,
  persistStepOrder,
  publishDemo,
  updateDemo,
  updateHotspot,
  uploadStepAsset,
} from '@/lib/demoStudio/api';
import type {
  DemoStepWithHotspots,
  DemoStudioDemo,
  DemoStudioHotspot,
  DemoTheme,
} from '@/lib/demoStudio/types';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_COLOR = '#6366f1';

export default function DemoEditorPage() {
  const { projectId, demoId } = useParams<{ projectId: string; demoId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { subscriptionData } = useSubscription();
  const planTier = subscriptionData?.subscription_tier;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hotspotPersistTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [demo, setDemo] = useState<DemoStudioDemo | null>(null);
  const [steps, setSteps] = useState<DemoStepWithHotspots[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const theme: DemoTheme = demo?.theme ?? {};
  const primaryColor = theme.primaryColor || DEFAULT_COLOR;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?return=/demo-studio/projects');
      return;
    }
    if (!demoId) return;

    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [demoRow, stepRows, hotspotRows] = await Promise.all([
          getDemo(demoId),
          listSteps(demoId),
          listHotspotsForDemo(demoId),
        ]);
        if (!active) return;
        if (!demoRow) {
          toast.error('Demo not found.');
          navigate(`/demo-studio/projects/${projectId}`);
          return;
        }
        const byStep = new Map<string, DemoStudioHotspot[]>();
        hotspotRows.forEach((h) => {
          const arr = byStep.get(h.step_id) ?? [];
          arr.push(h);
          byStep.set(h.step_id, arr);
        });
        const merged = stepRows.map((s) => ({ ...s, hotspots: byStep.get(s.id) ?? [] }));
        setDemo(demoRow);
        setSteps(merged);
        setSelectedStepId((prev) => prev ?? merged[0]?.id ?? null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load demo.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [authLoading, user, demoId, projectId, navigate]);

  const selectedStep = useMemo(
    () => steps.find((s) => s.id === selectedStepId) ?? null,
    [steps, selectedStepId],
  );
  const selectedHotspot = useMemo(
    () => selectedStep?.hotspots.find((h) => h.id === selectedHotspotId) ?? null,
    [selectedStep, selectedHotspotId],
  );

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user || !demoId) return;
    setUploading(true);
    try {
      let position = steps.length;
      const created: DemoStepWithHotspots[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const asset = await uploadStepAsset(user.id, file);
        const step = await createStep(demoId, position, asset);
        created.push({ ...step, hotspots: [] });
        position += 1;
      }
      if (created.length > 0) {
        setSteps((prev) => [...prev, ...created]);
        setSelectedStepId((prev) => prev ?? created[0].id);
        toast.success(`Added ${created.length} step${created.length > 1 ? 's' : ''}.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReorder = async (orderedIds: string[]) => {
    setSteps((prev) => orderedIds.map((id, i) => ({ ...prev.find((s) => s.id === id)!, position: i })));
    try {
      await persistStepOrder(orderedIds);
    } catch {
      toast.error('Could not save the new order.');
    }
  };

  const handleDeleteStep = async (id: string) => {
    const prev = steps;
    setSteps((s) => s.filter((step) => step.id !== id));
    if (selectedStepId === id) setSelectedStepId(prev.find((s) => s.id !== id)?.id ?? null);
    try {
      await deleteStep(id);
    } catch {
      setSteps(prev);
      toast.error('Could not delete the step.');
    }
  };

  const patchHotspotLocal = useCallback((id: string, patch: Partial<DemoStudioHotspot>) => {
    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        hotspots: step.hotspots.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      })),
    );
  }, []);

  const persistHotspotDebounced = useCallback((id: string, patch: Partial<DemoStudioHotspot>) => {
    const timers = hotspotPersistTimers.current;
    if (timers[id]) clearTimeout(timers[id]);
    timers[id] = setTimeout(() => {
      void updateHotspot(id, patch).catch(() => toast.error('Could not save hotspot.'));
    }, 400);
  }, []);

  const handleCreateHotspot = async (rect: Rect) => {
    if (!selectedStepId) return;
    try {
      const created = await createHotspot(selectedStepId, rect);
      setSteps((prev) =>
        prev.map((step) =>
          step.id === selectedStepId ? { ...step, hotspots: [...step.hotspots, created] } : step,
        ),
      );
      setSelectedHotspotId(created.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create hotspot.');
    }
  };

  const handleInspectorChange = (patch: Partial<DemoStudioHotspot>) => {
    if (!selectedHotspotId) return;
    patchHotspotLocal(selectedHotspotId, patch);
    persistHotspotDebounced(selectedHotspotId, patch);
  };

  const handleDeleteHotspot = async (id: string) => {
    const prev = steps;
    setSteps((s) =>
      s.map((step) => ({ ...step, hotspots: step.hotspots.filter((h) => h.id !== id) })),
    );
    setSelectedHotspotId(null);
    try {
      await deleteHotspot(id);
    } catch {
      setSteps(prev);
      toast.error('Could not delete the hotspot.');
    }
  };

  const handleGeometryCommit = (id: string, rect: Rect) => {
    patchHotspotLocal(id, rect);
    void updateHotspot(id, rect).catch(() => toast.error('Could not save hotspot position.'));
  };

  const updateTheme = async (patch: Partial<DemoTheme>) => {
    if (!demo) return;
    const nextTheme = { ...theme, ...patch };
    setDemo({ ...demo, theme: nextTheme });
    try {
      await updateDemo(demo.id, { theme: nextTheme });
    } catch {
      toast.error('Could not save theme.');
    }
  };

  const handleTitleBlur = async (value: string) => {
    if (!demo || value.trim() === demo.title) return;
    const title = value.trim() || 'Untitled demo';
    setDemo({ ...demo, title });
    try {
      await updateDemo(demo.id, { title });
    } catch {
      toast.error('Could not rename demo.');
    }
  };

  const handlePublish = async () => {
    if (!demo) return;
    if (steps.length === 0) {
      toast.error('Add at least one step before publishing.');
      return;
    }
    setPublishing(true);
    try {
      const updated = await publishDemo(demo.id);
      setDemo(updated);
      toast.success('Demo published!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publish failed.');
    } finally {
      setPublishing(false);
    }
  };

  const shareUrl = demo?.public_id ? `${window.location.origin}/demo/${demo.public_id}` : '';
  const embedSnippet = demo?.public_id
    ? `<iframe src="${window.location.origin}/embed/demo/${demo.public_id}" width="100%" height="640" style="border:0;border-radius:12px" allowfullscreen loading="lazy"></iframe>`
    : '';

  const copyShare = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('Copied to clipboard.');
    } catch {
      toast.error('Could not copy.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${demo?.title ?? 'Demo'} — Demo Studio`} description="Build your interactive product demo." noindex url="/demo-studio" />

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link to={`/demo-studio/projects/${projectId}`} aria-label="Back to project">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Input
            defaultValue={demo?.title ?? ''}
            onBlur={(e) => handleTitleBlur(e.target.value)}
            className="h-9 w-48 border-transparent bg-transparent text-sm font-semibold hover:border-border focus:border-border md:w-72"
          />
          {demo?.status === 'published' ? (
            <span className="hidden items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 sm:inline-flex">
              <Globe className="h-3 w-3" /> Published
            </span>
          ) : (
            <span className="hidden rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">
              Draft
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" /> Preview
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handlePublish} disabled={publishing}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            {demo?.status === 'published' ? 'Republish' : 'Publish'}
          </Button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* Left: steps */}
        <aside className="lg:sticky lg:top-[68px] lg:h-fit">
          <StepThumbnailList
            steps={steps}
            selectedStepId={selectedStepId}
            uploading={uploading}
            onSelect={(id) => {
              setSelectedStepId(id);
              setSelectedHotspotId(null);
            }}
            onReorder={handleReorder}
            onDelete={handleDeleteStep}
            onAddClick={() => fileInputRef.current?.click()}
          />
        </aside>

        {/* Center: canvas */}
        <main className="min-w-0">
          <HotspotCanvas
            step={selectedStep}
            selectedHotspotId={selectedHotspotId}
            primaryColor={primaryColor}
            onSelectHotspot={setSelectedHotspotId}
            onCreateHotspot={handleCreateHotspot}
            onCommitGeometry={handleGeometryCommit}
            onPreviewGeometry={(id, rect) => patchHotspotLocal(id, rect)}
          />
          {demo?.public_id && (
            <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                <Globe className="h-4 w-4 text-emerald-600" /> Share your demo
              </h4>
              <div className="flex items-center gap-2">
                <Input readOnly value={shareUrl} className="text-xs" />
                <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => copyShare(shareUrl)}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Embed snippet</Label>
                <div className="flex items-start gap-2">
                  <code className="block flex-1 overflow-x-auto rounded-md bg-muted p-2 text-[11px]">{embedSnippet}</code>
                  <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => copyShare(embedSnippet)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right: inspector + theme */}
        <aside className="space-y-4 lg:sticky lg:top-[68px] lg:h-fit">
          <HotspotInspector
            hotspot={selectedHotspot}
            stepCount={steps.length}
            onChange={handleInspectorChange}
            onDelete={handleDeleteHotspot}
          />

          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-semibold">Theme</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="primary-color">Primary color</Label>
              <input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label htmlFor="watermark">Show watermark</Label>
                {!canRemoveWatermark(planTier) && (
                  <p className="text-[11px] text-muted-foreground">Upgrade to remove on free plan.</p>
                )}
              </div>
              <Switch
                id="watermark"
                checked={shouldShowWatermark(theme.watermark, planTier)}
                disabled={!canRemoveWatermark(planTier)}
                onCheckedChange={(checked) => updateTheme({ watermark: checked })}
              />
            </div>
          </div>
        </aside>
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview — {demo?.title}</DialogTitle>
          </DialogHeader>
          <DemoPlayer
            steps={steps}
            theme={theme}
            mode="preview"
            showWatermark={shouldShowWatermark(theme.watermark, planTier)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
