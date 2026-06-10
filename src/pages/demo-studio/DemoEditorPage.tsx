import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  Copy,
  CopyPlus,
  Eye,
  Globe,
  ImagePlus,
  Loader2,
  Rocket,
} from 'lucide-react';
import SEO from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import StepThumbnailList from '@/components/demo-studio/editor/StepThumbnailList';
import StoryboardRail from '@/components/demo-studio/editor/StoryboardRail';
import HotspotCanvas from '@/components/demo-studio/editor/HotspotCanvas';
import HotspotInspector from '@/components/demo-studio/editor/HotspotInspector';
import DemoPlayer from '@/components/demo-studio/player/DemoPlayer';
import WhatIsADemoPopover from '@/components/demo-studio/WhatIsADemoPopover';
import { canRemoveWatermark, shouldShowWatermark } from '@/lib/demoStudio/plan';
import {
  applyStoryboardToDemo,
  createHotspot,
  createStep,
  deleteHotspot,
  deleteStep,
  duplicateStep,
  getDemo,
  getBrief,
  listHotspotsForDemo,
  listSteps,
  persistStepOrder,
  publishDemo,
  updateDemo,
  updateHotspot,
  updateStep,
  uploadStepAsset,
} from '@/lib/demoStudio/api';
import { getDemoReadiness } from '@/lib/demoStudio/readiness';
import type {
  DemoStudioBrief,
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
  const [brief, setBrief] = useState<DemoStudioBrief | null>(null);
  const [steps, setSteps] = useState<DemoStepWithHotspots[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const theme = useMemo<DemoTheme>(() => demo?.theme ?? {}, [demo?.theme]);
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
        const briefRow = projectId ? await getBrief(projectId) : null;
        setDemo(demoRow);
        setBrief(briefRow);
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
  const demoReadiness = useMemo(() => getDemoReadiness(steps, theme), [steps, theme]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user || !demoId) return;
    setUploading(true);
    try {
      let position = steps.length;
      const created: DemoStepWithHotspots[] = [];
      const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
      const selectedEmptyStep = selectedStep && !selectedStep.asset_url ? selectedStep : null;
      for (const [index, file] of imageFiles.entries()) {
        if (!file.type.startsWith('image/')) continue;
        const asset = await uploadStepAsset(user.id, file);
        if (index === 0 && selectedEmptyStep) {
          await updateStep(selectedEmptyStep.id, {
            asset_url: asset.url,
            asset_width: asset.width,
            asset_height: asset.height,
          });
          patchStepLocal(selectedEmptyStep.id, {
            asset_url: asset.url,
            asset_width: asset.width,
            asset_height: asset.height,
          });
          continue;
        }
        const step = await createStep(demoId, position, asset);
        created.push({ ...step, hotspots: [] });
        position += 1;
      }
      if (created.length > 0) {
        setSteps((prev) => [...prev, ...created]);
        setSelectedStepId((prev) => prev ?? created[0].id);
        toast.success(`Added ${created.length} step${created.length > 1 ? 's' : ''}.`);
      } else if (selectedEmptyStep && imageFiles.length > 0) {
        toast.success('Screenshot attached to storyboard step.');
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

  const handleDuplicateStep = async (id: string) => {
    const step = steps.find((item) => item.id === id);
    if (!step) return;
    try {
      const created = await duplicateStep(step, steps.length);
      setSteps((prev) => [...prev, created]);
      setSelectedStepId(created.id);
      setSelectedHotspotId(null);
      toast.success('Step duplicated.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not duplicate the step.');
    }
  };

  const handleApplyStoryboard = async () => {
    if (!demo || !brief?.ai_storyboard?.length) return;
    try {
      const created = await applyStoryboardToDemo(demo.id, brief.ai_storyboard, steps.length);
      setSteps((prev) => [...prev, ...created]);
      setSelectedStepId(created[0]?.id ?? selectedStepId);
      toast.success('Storyboard steps added.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not apply the storyboard.');
    }
  };

  const patchStepLocal = useCallback((id: string, patch: Partial<DemoStepWithHotspots>) => {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, ...patch } : step)));
  }, []);

  const handleStepFieldCommit = async (
    id: string,
    patch: Partial<Pick<DemoStepWithHotspots, 'title' | 'caption' | 'speaker_notes'>>,
  ) => {
    patchStepLocal(id, patch);
    try {
      await updateStep(id, patch);
    } catch {
      toast.error('Could not save step details.');
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
    if (!demoReadiness.ready) {
      toast.warning(`Demo readiness is ${demoReadiness.score}%. Publishing anyway so you can keep moving.`);
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
  const hasStoryboard = Boolean(brief?.ai_storyboard?.length);
  const setupChecklist = [
    { label: 'Screenshots', done: steps.length > 0 && steps.every((step) => Boolean(step.asset_url)) },
    { label: 'Captions', done: steps.length > 0 && steps.every((step) => Boolean(step.caption?.trim())) },
    {
      label: 'Hotspots',
      done: steps.length > 0 && steps.every((step, index) => index === steps.length - 1 || step.hotspots.length > 0),
    },
    { label: 'CTA', done: Boolean(theme.endCtaLabel?.trim()) },
    { label: 'Publish', done: demo?.status === 'published' },
  ];

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
          <WhatIsADemoPopover className="hidden md:inline-flex" />
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
        <aside className="space-y-4 lg:sticky lg:top-[68px] lg:h-fit">
          <StoryboardRail
            storyboard={brief?.ai_storyboard ?? []}
            disabled={!demo || !brief?.ai_storyboard?.length}
            onApply={handleApplyStoryboard}
          />
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold">Readiness</h4>
              <Badge variant={demoReadiness.ready ? 'default' : 'outline'}>{demoReadiness.score}%</Badge>
            </div>
            {demoReadiness.missing.length ? (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {demoReadiness.missing.slice(0, 5).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">Demo has the essentials for a strong walkthrough.</p>
            )}
          </div>
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
            onDuplicate={handleDuplicateStep}
            onAddClick={() => fileInputRef.current?.click()}
          />
        </aside>

        {/* Center: canvas */}
        <main className="min-w-0">
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-primary">Build the interactive demo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your launch page needs one published demo and one recorded VSL. You can create them in either order.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-5">
              {setupChecklist.map((item, index) => (
                <div key={item.label} className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                  <span className={item.done ? 'text-emerald-600' : 'text-muted-foreground'}>
                    {item.done ? <Check className="h-4 w-4" /> : <span className="flex h-4 w-4 items-center justify-center rounded-full border text-[10px]">{index + 1}</span>}
                  </span>
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 px-6 py-20 text-center">
              <ImagePlus className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                {hasStoryboard ? 'Attach screenshots to your storyboard steps' : 'Upload screenshots to start a blank walkthrough'}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {hasStoryboard
                  ? 'Use the Storyboard panel to apply guided steps, then upload product screenshots for each step.'
                  : "Upload images of your product — each one becomes a step. Next you'll drag clickable hotspots on top to make it interactive."}
              </p>
              <Button
                className="mt-5 gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Upload screenshots
              </Button>
              <p className="mt-3 text-xs text-muted-foreground">PNG or JPG, up to 5MB each. Add as many as you like.</p>
            </div>
          ) : (
            <HotspotCanvas
              step={selectedStep}
              selectedHotspotId={selectedHotspotId}
              primaryColor={primaryColor}
              onSelectHotspot={setSelectedHotspotId}
              onCreateHotspot={handleCreateHotspot}
              onCommitGeometry={handleGeometryCommit}
              onPreviewGeometry={(id, rect) => patchHotspotLocal(id, rect)}
            />
          )}
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
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-semibold">Demo brief</h4>
            <div className="space-y-1.5">
              <Label htmlFor="brief-audience">Audience</Label>
              <Input
                id="brief-audience"
                defaultValue={theme.brief?.audience ?? ''}
                placeholder="Who needs to see this?"
                onBlur={(e) => updateTheme({ brief: { ...theme.brief, audience: e.target.value || undefined } })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brief-promise">Product promise</Label>
              <Textarea
                id="brief-promise"
                rows={2}
                defaultValue={theme.brief?.promise ?? ''}
                placeholder="The clear outcome your product creates."
                onBlur={(e) => updateTheme({ brief: { ...theme.brief, promise: e.target.value || undefined } })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brief-aha">Aha moment</Label>
              <Textarea
                id="brief-aha"
                rows={2}
                defaultValue={theme.brief?.ahaMoment ?? ''}
                placeholder="The moment the viewer should understand the value."
                onBlur={(e) => updateTheme({ brief: { ...theme.brief, ahaMoment: e.target.value || undefined } })}
              />
            </div>
          </div>

          <HotspotInspector
            hotspot={selectedHotspot}
            stepCount={steps.length}
            onChange={handleInspectorChange}
            onDelete={handleDeleteHotspot}
          />

          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Step script</h4>
              {selectedStep && (
                <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => handleDuplicateStep(selectedStep.id)}>
                  <CopyPlus className="h-4 w-4" /> Duplicate
                </Button>
              )}
            </div>
            {selectedStep ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="step-title">Step title</Label>
                  <Input
                    id="step-title"
                    value={selectedStep.title ?? ''}
                    placeholder="e.g. Create your first project"
                    onChange={(e) => patchStepLocal(selectedStep.id, { title: e.target.value })}
                    onBlur={(e) => handleStepFieldCommit(selectedStep.id, { title: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="step-caption">Viewer caption</Label>
                  <Textarea
                    id="step-caption"
                    rows={3}
                    value={selectedStep.caption ?? ''}
                    placeholder="Tell viewers what they are seeing and why it matters."
                    onChange={(e) => patchStepLocal(selectedStep.id, { caption: e.target.value })}
                    onBlur={(e) => handleStepFieldCommit(selectedStep.id, { caption: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="speaker-notes">VSL speaker notes</Label>
                  <Textarea
                    id="speaker-notes"
                    rows={3}
                    value={selectedStep.speaker_notes ?? ''}
                    placeholder="Notes for what to say when recording your VSL."
                    onChange={(e) => patchStepLocal(selectedStep.id, { speaker_notes: e.target.value })}
                    onBlur={(e) => handleStepFieldCommit(selectedStep.id, { speaker_notes: e.target.value || null })}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a step to write its guide copy.</p>
            )}
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <h4 className="text-sm font-semibold">Theme</h4>
            <div className="space-y-1.5">
              <Label htmlFor="demo-cta-label">End CTA label</Label>
              <Input
                id="demo-cta-label"
                defaultValue={theme.endCtaLabel ?? ''}
                placeholder="Join the waitlist"
                onBlur={(e) => updateTheme({ endCtaLabel: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="demo-cta-url">End CTA URL</Label>
              <Input
                id="demo-cta-url"
                defaultValue={theme.endCtaHref ?? ''}
                placeholder="/p/your-launch-page"
                onBlur={(e) => updateTheme({ endCtaHref: e.target.value || undefined })}
              />
            </div>
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
