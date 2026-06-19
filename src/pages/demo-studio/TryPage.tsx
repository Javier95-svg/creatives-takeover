import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DemoPlayer from '@/components/demo-studio/player/DemoPlayer';
import { generateDemoStudioDraftStoryboard } from '@/lib/demoStudio/api';
import type { DemoStepWithHotspots, HotspotAction, HotspotType } from '@/lib/demoStudio/types';

const MAX_SCREENSHOTS = 3;
const MIN_SCREENSHOTS = 2;
const SIGNUP_HREF = '/signup?from=demo-try';

interface Shot {
  file: File;
  url: string;
}

export default function TryPage() {
  const [shots, setShots] = useState<Shot[]>([]);
  const [contextUrl, setContextUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<DemoStepWithHotspots[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shotsRef = useRef<Shot[]>([]);

  // Anonymous flow: screenshots live only as in-memory object URLs. Removed
  // shots are revoked individually in removeShot; revoke whatever remains on
  // unmount so we never leak blobs (nothing is ever uploaded or persisted).
  useEffect(() => {
    shotsRef.current = shots;
  }, [shots]);
  useEffect(() => {
    return () => {
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

  const handleGenerate = async () => {
    if (shots.length < MIN_SCREENSHOTS) {
      toast.error(`Add at least ${MIN_SCREENSHOTS} screenshots first.`);
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const storyboard = await generateDemoStudioDraftStoryboard({ contextUrl });
      const now = new Date().toISOString();
      const count = Math.min(shots.length, storyboard.length);
      const built: DemoStepWithHotspots[] = [];
      for (let i = 0; i < count; i += 1) {
        const step = storyboard[i];
        built.push({
          id: `try-${i}`,
          demo_id: 'try',
          position: i,
          asset_url: shots[i].url,
          asset_width: null,
          asset_height: null,
          title: step.title,
          caption: step.caption,
          speaker_notes: step.speaker_notes,
          created_at: now,
          // The generator returns a hotspot label but no coordinates, so we drop
          // a single default marker that advances the demo when clicked.
          hotspots: step.hotspot_label
            ? [
                {
                  id: `try-hs-${i}`,
                  step_id: `try-${i}`,
                  x: 0.35,
                  y: 0.78,
                  w: 0.3,
                  h: 0.12,
                  type: 'tooltip' as HotspotType,
                  label: step.hotspot_label,
                  action: 'next' as HotspotAction,
                  action_target: null,
                  created_at: now,
                },
              ]
            : [],
        });
      }
      if (built.length === 0) {
        throw new Error("We couldn't turn those screenshots into a demo. Try again in a moment.");
      }
      setSteps(built);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not generate your demo preview.';
      setError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const startOver = () => {
    setSteps(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-10 text-white">
      <SEO
        title="Try Demo Studio — build an interactive demo in seconds"
        description="Upload a few screenshots and instantly turn them into an interactive product demo with AI-written captions. No signup required."
        type="product"
      />
      <div className="mx-auto w-full max-w-3xl px-4">
        <div className="mb-8 text-center">
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-caption font-medium text-white/80">
            <Sparkles className="h-3.5 w-3.5" /> Demo Studio
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Turn screenshots into a live demo</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/70">
            Upload {MIN_SCREENSHOTS}–{MAX_SCREENSHOTS} screenshots of your product. We'll write the
            captions and hand you an interactive walkthrough — no signup needed.
          </p>
        </div>

        {steps ? (
          <div className="space-y-5">
            <DemoPlayer
              steps={steps}
              mode="preview"
              showWatermark
              ctaHref={SIGNUP_HREF}
              ctaLabel="Sign up to build your own"
            />
            <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-5 text-center">
              <p className="text-sm text-white/80">
                Like it? Sign up to add hotspots, record a VSL, and publish a launch page.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild>
                  <a href={SIGNUP_HREF}>Sign up to build your own</a>
                </Button>
                <Button variant="outline" onClick={startOver} className="bg-white/10 text-white hover:bg-white/20">
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
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white/80 transition hover:text-white"
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
                Helps the AI write sharper captions. We don't capture the page — your screenshots are the visuals.
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Building your demo…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate the demo
                </>
              )}
            </Button>
            <p className="text-center text-xs text-white/40">Free preview · no signup · nothing saved</p>
          </div>
        )}
      </div>
    </div>
  );
}
