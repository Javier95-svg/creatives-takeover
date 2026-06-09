import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { trackDemoEvent } from '@/lib/demoStudio/events';
import type { DemoStepWithHotspots, DemoStudioHotspot, DemoTheme } from '@/lib/demoStudio/types';

interface DemoPlayerProps {
  steps: DemoStepWithHotspots[];
  theme?: DemoTheme;
  showWatermark?: boolean;
  /** 'live' emits view/step analytics; 'preview' (editor) does not. */
  mode?: 'preview' | 'live';
  projectId?: string | null;
  demoId?: string | null;
  ctaHref?: string | null;
  ctaLabel?: string;
  className?: string;
}

export default function DemoPlayer({
  steps,
  theme,
  showWatermark = true,
  mode = 'preview',
  projectId = null,
  demoId = null,
  ctaHref = null,
  ctaLabel,
  className,
}: DemoPlayerProps) {
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const primaryColor = theme?.primaryColor || '#6366f1';
  const total = steps.length;
  const current = steps[index];
  const resolvedCtaLabel = ctaLabel || theme?.endCtaLabel || 'Get started';
  const resolvedCtaHref = ctaHref || theme?.endCtaHref || null;

  // Emit a single demo_view per session when the player goes live.
  useEffect(() => {
    if (mode !== 'live' || !demoId) return;
    void trackDemoEvent('demo_view', {
      projectId,
      demoId,
      dedupeKey: `view_${demoId}`,
      meta: { total_steps: total },
    });
    void trackDemoEvent('demo_start', {
      projectId,
      demoId,
      dedupeKey: `start_${demoId}`,
      meta: { total_steps: total },
    });
  }, [mode, demoId, projectId, total]);

  // Emit a step event whenever the active step changes while live.
  useEffect(() => {
    if (mode !== 'live' || !demoId || !current) return;
    void trackDemoEvent('demo_step', {
      projectId,
      demoId,
      meta: { step_index: index, step_id: current.id },
    });
  }, [mode, demoId, projectId, index, current]);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0) return;
      if (next >= total) {
        setFinished(true);
        return;
      }
      setFinished(false);
      setIndex(next);
    },
    [total],
  );

  const handleHotspot = useCallback(
    (hotspot: DemoStudioHotspot) => {
      if (hotspot.action === 'url' && hotspot.action_target) {
        window.open(hotspot.action_target, '_blank', 'noopener,noreferrer');
        return;
      }
      if (hotspot.action === 'goto' && hotspot.action_target) {
        const target = Number.parseInt(hotspot.action_target, 10);
        if (!Number.isNaN(target)) {
          goTo(target);
          return;
        }
      }
      goTo(index + 1);
    },
    [goTo, index],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(index + 1);
      if (e.key === 'ArrowLeft') goTo(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, index]);

  const restart = () => {
    setIndex(0);
    setFinished(false);
  };

  useEffect(() => {
    if (mode !== 'live' || !demoId || !finished) return;
    void trackDemoEvent('demo_complete', {
      projectId,
      demoId,
      dedupeKey: `complete_${demoId}`,
      meta: { total_steps: total },
    });
  }, [mode, demoId, projectId, finished, total]);

  const progress = useMemo(() => (total === 0 ? 0 : ((index + 1) / total) * 100), [index, total]);

  if (total === 0) {
    return (
      <div className={cn('flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 text-sm text-muted-foreground', className)}>
        Add a step to preview your demo.
      </div>
    );
  }

  return (
    <div className={cn('relative w-full select-none', className)}>
      {/* Progress bar */}
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%`, backgroundColor: primaryColor }}
        />
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border bg-black/90 shadow-lg">
        {finished ? (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center text-white">
            <h3 className="text-2xl font-semibold">That's the demo 🎬</h3>
            <p className="max-w-sm text-sm text-white/70">Thanks for watching. Want to see more?</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {resolvedCtaHref && (
                <Button asChild style={{ backgroundColor: primaryColor }}>
                  <a
                    href={resolvedCtaHref}
                    onClick={() => {
                      if (mode === 'live') {
                        void trackDemoEvent('cta_click', {
                          projectId,
                          demoId,
                          meta: { placement: 'demo_complete' },
                        });
                      }
                    }}
                  >
                    {resolvedCtaLabel}
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={restart} className="gap-2 bg-white/10 text-white hover:bg-white/20">
                <RotateCcw className="h-4 w-4" /> Replay
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            {current?.asset_url ? (
              <img
                src={current.asset_url}
                alt={`Step ${index + 1}`}
                className="block h-auto w-full"
                draggable={false}
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center bg-slate-800 text-sm text-white/50">
                No image for this step
              </div>
            )}

            {/* Hotspot overlay (normalized 0..1 coords -> %) */}
            <div className="absolute inset-0">
              {(current?.hotspots ?? []).map((hotspot) => (
                <button
                  key={hotspot.id}
                  type="button"
                  onClick={() => handleHotspot(hotspot)}
                  className="group absolute flex items-center justify-center rounded-md ring-2 ring-white/70 transition hover:ring-4"
                  style={{
                    left: `${hotspot.x * 100}%`,
                    top: `${hotspot.y * 100}%`,
                    width: `${hotspot.w * 100}%`,
                    height: `${hotspot.h * 100}%`,
                    backgroundColor: `${primaryColor}33`,
                    boxShadow: `0 0 0 9999px rgba(0,0,0,0.01)`,
                  }}
                  aria-label={hotspot.label || `Hotspot ${hotspot.action}`}
                >
                  <span
                    className="absolute h-3 w-3 animate-ping rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: primaryColor }} />
                  {hotspot.label && (
                    <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                      {hotspot.label}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {showWatermark && (
              <a
                href="https://creatives-takeover.com/demo-studio"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur hover:text-white"
              >
                Made with Creatives Takeover
              </a>
            )}
            {(current?.title || current?.caption) && (
              <div className="absolute inset-x-3 bottom-3 max-w-xl rounded-lg bg-slate-950/85 p-3 text-white shadow-lg backdrop-blur">
                {current.title && <h3 className="text-sm font-semibold">{current.title}</h3>}
                {current.caption && <p className="mt-1 text-xs text-white/75">{current.caption}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goTo(index - 1)}
          disabled={index === 0 && !finished}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <span className="text-xs text-muted-foreground">
          {finished ? `${total} of ${total}` : `${index + 1} of ${total}`}
        </span>
        <Button
          size="sm"
          onClick={() => goTo(index + 1)}
          disabled={finished}
          className="gap-1"
          style={{ backgroundColor: primaryColor }}
        >
          Next <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
