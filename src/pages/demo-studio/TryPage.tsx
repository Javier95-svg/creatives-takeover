import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DemoPlayer from '@/components/demo-studio/player/DemoPlayer';
import { useAuth } from '@/contexts/AuthContext';
import {
  createDemo,
  createHotspot,
  createProject,
  createStep,
  deleteProject,
  generateDemoStudioDraftStoryboard,
  uploadStepAsset,
} from '@/lib/demoStudio/api';
import { trackDemoEvent } from '@/lib/demoStudio/events';
import {
  clearTryDraft,
  dataUrlToFile,
  fileToDownscaledDataUrl,
  readTryDraft,
  saveTryDraft,
  type TryDraft,
  type TryDraftStep,
} from '@/lib/demoStudio/tryDraft';
import {
  DEMO_STUDIO_TRY_HOTSPOT,
  DEMO_STUDIO_TRY_MAX_SCREENSHOTS,
  DEMO_STUDIO_TRY_MIN_SCREENSHOTS,
  buildTryFallbackStoryboard,
  buildTryPreviewSteps,
  deriveTryProductName,
  getUsableTryStoryboard,
  normalizeTryStepCount,
} from '@/lib/demoStudio/tryPreview';
import type { DemoStepWithHotspots } from '@/lib/demoStudio/types';
import { captureEvent } from '@/lib/analytics';
import { markFirstArtifactCreated, trackRetentionEvent } from '@/lib/retentionSystem';

const MAX_SCREENSHOTS = DEMO_STUDIO_TRY_MAX_SCREENSHOTS;
const MIN_SCREENSHOTS = DEMO_STUDIO_TRY_MIN_SCREENSHOTS;
const RETURN_PATH = '/demo-studio/try?hydrate=1';
const SIGNUP_RETURN_HREF = `/signup?from=demo-try&return=${encodeURIComponent(RETURN_PATH)}`;

interface Shot {
  file: File;
  url: string;
}

interface HydrateStep {
  file?: File;
  dataUrl?: string;
  title: string;
  caption: string;
  speaker_notes: string;
  hotspot_label: string;
}

export default function TryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReturning = searchParams.get('hydrate') === '1';

  const [shots, setShots] = useState<Shot[]>([]);
  const [contextUrl, setContextUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<DemoStepWithHotspots[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shotsRef = useRef<Shot[]>([]);
  const hydratedRef = useRef(false);
  // Guards a single in-flight save so concurrent invocations (StrictMode double
  // effect, double-click, retry overlap) can't create duplicate projects.
  const hydratingRef = useRef(false);
  // Monotonic token for the current generation/persistence run. Bumped on
  // start-over and unmount so late async work from a previous run is ignored.
  const runIdRef = useRef(0);
  // Best-effort eager serialization for anonymous visitors so the draft is in
  // sessionStorage by the time any CTA navigates to signup.
  const persistPromiseRef = useRef<Promise<boolean> | null>(null);

  // Anonymous flow: screenshots live only as in-memory object URLs. Removed
  // shots are revoked individually in removeShot; revoke whatever remains on
  // unmount so we never leak blobs.
  useEffect(() => {
    shotsRef.current = shots;
  }, [shots]);
  useEffect(() => {
    return () => {
      // Invalidate any in-flight generation/persistence so late async work is ignored.
      runIdRef.current += 1;
      shotsRef.current.forEach((shot) => URL.revokeObjectURL(shot.url));
    };
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const images = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (images.length === 0) {
      toast.error('Please choose image files (PNG or JPG).');
      return;
    }
    setShots((prev) => {
      const room = MAX_SCREENSHOTS - prev.length;
      if (room <= 0) {
        toast.error(`You can add up to ${MAX_SCREENSHOTS} screenshots.`);
        return prev;
      }
      const added = images.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }));
      return [...prev, ...added];
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeShot = (url: string) => {
    setShots((prev) => {
      const next = prev.filter((shot) => shot.url !== url);
      URL.revokeObjectURL(url);
      return next;
    });
  };

  // Downscale the screenshots backing `built` into a sessionStorage-safe draft.
  const buildDraftSteps = useCallback(
    async (built: DemoStepWithHotspots[], maxEdge: number, quality: number): Promise<TryDraftStep[]> => {
      const currentShots = shotsRef.current;
      const out: TryDraftStep[] = [];
      for (let i = 0; i < built.length; i += 1) {
        const file = currentShots[i]?.file;
        if (!file) continue;
        const dataUrl = await fileToDownscaledDataUrl(file, maxEdge, quality);
        out.push({
          dataUrl,
          title: built[i].title ?? '',
          caption: built[i].caption ?? '',
          speaker_notes: built[i].speaker_notes ?? '',
          hotspot_label: built[i].hotspots[0]?.label ?? '',
        });
      }
      return out;
    },
    [],
  );

  const persistDraft = useCallback(
    async (built: DemoStepWithHotspots[], runId?: number): Promise<boolean> => {
      // When a runId is supplied (background persist), bail if the run was
      // superseded (start-over/unmount) so we don't re-write a cleared draft.
      const isStale = () => runId !== undefined && runId !== runIdRef.current;
      const productName = deriveTryProductName(contextUrl, built[0]?.title ?? undefined);
      let draftSteps = await buildDraftSteps(built, 1600, 0.85);
      if (isStale()) return false;
      const draft: TryDraft = { v: 1, productName, contextUrl, steps: draftSteps };
      if (saveTryDraft(draft)) return true;
      // Retry once smaller if the first attempt overflowed the quota.
      draftSteps = await buildDraftSteps(built, 1024, 0.7);
      if (isStale()) return false;
      return saveTryDraft({ ...draft, steps: draftSteps });
    },
    [buildDraftSteps, contextUrl],
  );

  const handleGenerate = async () => {
    if (shots.length < MIN_SCREENSHOTS) {
      toast.error(`Add at least ${MIN_SCREENSHOTS} screenshots first.`);
      return;
    }
    const runId = ++runIdRef.current;
    setGenerating(true);
    setError(null);
    captureEvent('activation_first_input_submitted', {
      tool: 'demo_studio_try',
      source: 'demo_try',
      screenshot_count: shots.length,
      is_authenticated: Boolean(user),
    });
    if (user) {
      void trackRetentionEvent('activation_first_input_submitted', {
        user_id: user.id,
        tool: 'demo_studio_try',
        source: 'demo_try',
        screenshot_count: shots.length,
      });
    }
    try {
      const stepCount = normalizeTryStepCount(shots.length);
      const storyboard = await generateDemoStudioDraftStoryboard({ contextUrl, stepCount });
      // Ignore the response if the user started over or left during generation.
      if (runId !== runIdRef.current) return;
      const usableStoryboard = getUsableTryStoryboard(storyboard, { contextUrl, stepCount });
      const built = buildTryPreviewSteps({ shots, storyboard: usableStoryboard });
      if (built.length === 0) {
        throw new Error("We couldn't turn those screenshots into a demo. Try again in a moment.");
      }
      setSteps(built);
      const usedClientFallback = storyboard.length < stepCount;
      captureEvent('activation_first_output_generated', {
        tool: 'demo_studio_try',
        source: 'demo_try',
        step_count: built.length,
        fallback: usedClientFallback,
        is_authenticated: Boolean(user),
      });
      if (user) {
        void trackRetentionEvent('activation_first_output_generated', {
          user_id: user.id,
          tool: 'demo_studio_try',
          source: 'demo_try',
          step_count: built.length,
          fallback: usedClientFallback,
        });
      }
      void trackDemoEvent('demo_view', { meta: { source: 'demo_try', step_count: built.length, fallback: usedClientFallback } });
      void trackDemoEvent('demo_start', { meta: { source: 'demo_try', step_count: built.length, fallback: usedClientFallback } });
      // Anonymous visitors: stash the draft now so it survives the auth redirect.
      if (!user) {
        persistPromiseRef.current = persistDraft(built, runId).catch(() => false);
      }
    } catch (e) {
      if (runId !== runIdRef.current) return; // stale failure from a superseded run
      const message = e instanceof Error ? e.message : 'Could not generate your demo preview.';
      if (/free preview limit|rate limit/i.test(message)) {
        setError(message);
        toast.error(message);
        return;
      }

      const fallbackStoryboard = buildTryFallbackStoryboard({ contextUrl, stepCount: shots.length });
      const built = buildTryPreviewSteps({ shots, storyboard: fallbackStoryboard });
      if (built.length >= MIN_SCREENSHOTS) {
        setSteps(built);
        setError(null);
        captureEvent('activation_first_output_generated', {
          tool: 'demo_studio_try',
          source: 'demo_try',
          step_count: built.length,
          fallback: true,
          is_authenticated: Boolean(user),
        });
        if (user) {
          void trackRetentionEvent('activation_first_output_generated', {
            user_id: user.id,
            tool: 'demo_studio_try',
            source: 'demo_try',
            step_count: built.length,
            fallback: true,
          });
        }
        void trackDemoEvent('demo_view', { meta: { source: 'demo_try', step_count: built.length, fallback: true } });
        void trackDemoEvent('demo_start', { meta: { source: 'demo_try', step_count: built.length, fallback: true } });
        if (!user) {
          persistPromiseRef.current = persistDraft(built, runId).catch(() => false);
        }
        return;
      }

      setError(message);
      toast.error(message);
    } finally {
      if (runId === runIdRef.current) setGenerating(false);
    }
  };

  const startOver = () => {
    // Supersede any in-flight generation/persistence before clearing the draft.
    runIdRef.current += 1;
    setSteps(null);
    setError(null);
    persistPromiseRef.current = null;
    clearTryDraft();
  };

  // Shared hydration: in-memory draft -> real project + demo + steps, then route
  // into the builder. Throws on failure so callers can surface a retry.
  const hydrate = useCallback(
    async (productName: string, hydrateSteps: HydrateStep[]) => {
      if (!user) throw new Error('You need to be signed in to save this demo.');
      // Re-entrancy guard: a concurrent save (StrictMode double-effect, double
      // click, retry overlapping an in-flight attempt) must not create a 2nd project.
      if (hydratingRef.current) return;
      hydratingRef.current = true;
      const name = productName || 'My product';
      const project = await createProject(user.id, { name });
      try {
        const demo = await createDemo(project.id, user.id, `${name} demo`);
        let position = 0;
        for (const step of hydrateSteps) {
          const file =
            step.file ??
            (step.dataUrl ? await dataUrlToFile(step.dataUrl, `screenshot-${position + 1}.jpg`) : null);
          if (!file) continue;
          const asset = await uploadStepAsset(user.id, file);
          const created = await createStep(demo.id, position, {
            url: asset.url,
            width: asset.width,
            height: asset.height,
            title: step.title || `Step ${position + 1}`,
            caption: step.caption || null,
            speaker_notes: step.speaker_notes || null,
          });
          if (step.hotspot_label) {
            try {
              await createHotspot(created.id, {
                ...DEMO_STUDIO_TRY_HOTSPOT,
                type: 'tooltip',
                action: 'next',
                label: step.hotspot_label,
              });
            } catch {
              /* hotspot is a nicety; never block the save */
            }
          }
          position += 1;
        }
        trackDemoEvent('signup', {
          projectId: project.id,
          demoId: demo.id,
          meta: { source: 'demo_try', step_count: position },
        });
        await markFirstArtifactCreated({
          userId: user.id,
          artifactType: 'demo_studio_draft',
          artifactId: demo.id,
          label: `${name} demo`,
          resumeUrl: `/demo-studio/projects/${project.id}/brief`,
          source: 'demo_try',
        });
        clearTryDraft();
        navigate(`/demo-studio/projects/${project.id}/brief`, { replace: true });
      } catch (err) {
        // Roll back the partial project so a failed save never leaves an orphaned
        // (or, on retry, duplicated) project. FK cascade removes demo/steps/hotspots.
        await deleteProject(project.id).catch(() => {});
        throw err;
      } finally {
        hydratingRef.current = false;
      }
    },
    [navigate, user],
  );

  // Primary CTA on the result view.
  const handleSave = async () => {
    if (!steps) return;
    void trackDemoEvent('cta_click', { meta: { source: 'demo_try', placement: 'try_save' } });
    if (user) {
      setSaving(true);
      try {
        const productName = deriveTryProductName(contextUrl, steps[0]?.title ?? undefined);
        const hydrateSteps: HydrateStep[] = steps.map((step, i) => ({
          file: shots[i]?.file,
          title: step.title ?? '',
          caption: step.caption ?? '',
          speaker_notes: step.speaker_notes ?? '',
          hotspot_label: step.hotspots[0]?.label ?? '',
        }));
        await hydrate(productName, hydrateSteps);
      } catch (e) {
        setSaving(false);
        toast.error(e instanceof Error ? e.message : 'Could not save your demo. Try again.');
      }
      return;
    }
    // Anonymous: make sure the draft is stored, then send them through signup.
    setSaving(true);
    void trackDemoEvent('signup_attempt', { meta: { source: 'demo_try' } });
    const stored = await (persistPromiseRef.current ?? persistDraft(steps));
    if (!stored) {
      toast.error('Your screenshots are large. You may need to re-upload after signing up.');
    }
    navigate(SIGNUP_RETURN_HREF);
  };

  // Hydrate-on-return: the user came back from signup with ?hydrate=1.
  const runReturnHydration = useCallback(async () => {
    const draft = readTryDraft();
    if (!user || !draft) {
      navigate('/demo-studio/try', { replace: true });
      return;
    }
    hydratedRef.current = true;
    setSaving(true);
    setHydrateError(null);
    try {
      await hydrate(
        draft.productName,
        draft.steps.map((s) => ({
          dataUrl: s.dataUrl,
          title: s.title,
          caption: s.caption,
          speaker_notes: s.speaker_notes,
          hotspot_label: s.hotspot_label,
        })),
      );
    } catch (e) {
      hydratedRef.current = false;
      setSaving(false);
      const message = e instanceof Error ? e.message : 'Could not save your demo. Try again.';
      setHydrateError(message);
      toast.error(message);
    }
  }, [hydrate, navigate, user]);

  useEffect(() => {
    if (!isReturning || authLoading || hydratedRef.current || hydrateError) return;
    void runReturnHydration();
  }, [isReturning, authLoading, hydrateError, runReturnHydration]);

  const showSaving = saving || (isReturning && !hydrateError && !steps);

  if (showSaving) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-white">
        <SEO title="Saving your demo - Demo Studio" description="Saving your demo." noindex />
        <Loader2 className="h-7 w-7 animate-spin text-white/70" />
        <p className="text-sm text-white/70">Saving your demo...</p>
      </div>
    );
  }

  if (isReturning && hydrateError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-white">
        <SEO title="Couldn't save your demo - Demo Studio" description="We couldn't save your demo." noindex />
        <AlertTriangle className="h-7 w-7 text-amber-400" />
        <div>
          <h1 className="text-xl font-semibold">We couldn't save your demo</h1>
          <p className="mt-1 max-w-sm text-sm text-white/60">{hydrateError}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => void runReturnHydration()}>Try again</Button>
          <Button
            variant="outline"
            onClick={() => navigate('/demo-studio/projects')}
            className="bg-white/10 text-white hover:bg-white/20"
          >
            Go to Demo Studio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-10 text-white">
      <SEO
        title="Try Demo Studio - build an interactive demo in seconds"
        description="Upload a few screenshots and instantly turn them into an interactive product demo with AI-written captions. No signup required."
        type="product"
      />
      <div className="mx-auto w-full max-w-3xl px-4">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white"
        >
          Back to platform
        </Link>
        <div className="mb-8 text-center">
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-caption font-medium text-white/80">
            <Sparkles className="h-3.5 w-3.5" /> Demo Studio
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl [text-shadow:0_0_18px_rgba(99,102,241,0.55)]">
            Turn screenshots into a live demo
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/70">
            Upload {MIN_SCREENSHOTS} to {MAX_SCREENSHOTS} screenshots of your product. We'll write the
            captions and hand you an interactive walkthrough. No signup needed.
          </p>
        </div>

        {steps ? (
          <div className="space-y-5">
            <DemoPlayer
              steps={steps}
              mode="preview"
              showWatermark
              ctaHref={user ? null : SIGNUP_RETURN_HREF}
              ctaLabel="Save and publish this demo"
              onComplete={() =>
                void trackDemoEvent('demo_complete', {
                  meta: { source: 'demo_try' },
                  dedupeKey: 'demo_complete_try',
                })
              }
            />
            <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-5 text-center">
              <p className="text-sm text-white/80">
                Keep this demo. Save it to your account to add hotspots, record a VSL, and publish a launch page.
              </p>
              <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                <Button onClick={() => void handleSave()} disabled={saving} className="w-full gap-2 sm:w-auto">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save and publish this demo
                </Button>
                <Button
                  variant="outline"
                  onClick={startOver}
                  disabled={saving}
                  className="w-full bg-white/10 text-white hover:bg-white/20 sm:w-auto"
                >
                  Try different screenshots
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 rounded-xl border border-white/10 bg-white/5 p-6">
            <div>
              <Label className="text-sm font-medium text-white">Screenshots</Label>
              <p className="mt-1 text-xs text-white/60">PNG or JPG, up to {MAX_SCREENSHOTS} images.</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {shots.map((shot) => (
                  <div key={shot.url} className="group relative overflow-hidden rounded-lg border border-white/10">
                    <img src={shot.url} alt="Screenshot preview" className="aspect-video w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeShot(shot.url)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1.5 text-white/80 transition hover:text-white touch:p-2.5"
                      aria-label="Remove screenshot"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {shots.length < MAX_SCREENSHOTS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-video w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/25 text-white/60 transition hover:border-white/50 hover:text-white"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-xs">Add screenshot</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            <div>
              <Label htmlFor="context-url" className="text-sm font-medium text-white">
                Product URL <span className="font-normal text-white/50">(optional)</span>
              </Label>
              <p className="mt-1 text-xs text-white/60">
                Helps the AI write sharper captions. We don't capture the page; your screenshots are the visuals.
              </p>
              <Input
                id="context-url"
                type="url"
                inputMode="url"
                placeholder="https://yourproduct.com"
                value={contextUrl}
                onChange={(e) => setContextUrl(e.target.value)}
                className="mt-2 border-white/15 bg-white/5 text-white placeholder:text-white/40"
              />
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}

            <Button onClick={handleGenerate} disabled={generating || shots.length < MIN_SCREENSHOTS} className="w-full gap-2">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Building your demo...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate the demo
                </>
              )}
            </Button>
          </div>
        )}

        {!user && (
          <p className="mt-6 text-center text-xs text-white/50">
            Already have an account?{' '}
            <Link
              to="/login?return=/demo-studio"
              className="font-medium text-white/80 underline underline-offset-2 hover:text-white"
            >
              Log in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
