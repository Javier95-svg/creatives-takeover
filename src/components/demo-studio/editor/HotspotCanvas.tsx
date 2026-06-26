import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import SnapshotFrame from '@/components/demo-studio/SnapshotFrame';
import type { DemoStepWithHotspots } from '@/lib/demoStudio/types';

/** Render a step's background media: an HTML snapshot (sandboxed iframe) or a screenshot. */
function StepMedia({ step }: { step: DemoStepWithHotspots }) {
  if (!step.asset_url) {
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-slate-800 text-sm text-white/50">
        This step has no {step.asset_type === 'html' ? 'captured page' : 'image'}.
      </div>
    );
  }
  if (step.asset_type === 'html') {
    return <SnapshotFrame url={step.asset_url} className="block w-full" />;
  }
  return <img src={step.asset_url} alt="Step" className="block h-auto w-full" draggable={false} />;
}

// Coarse-pointer devices (phones/tablets) can't place/resize hotspots precisely,
// so we render a read-only canvas + notice there instead of a broken drag surface.
function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return isTouch;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface HotspotCanvasProps {
  step: DemoStepWithHotspots | null;
  selectedHotspotId: string | null;
  primaryColor: string;
  onSelectHotspot: (id: string | null) => void;
  onCreateHotspot: (rect: Rect) => void;
  /** Called on the end of a move/resize so the parent can persist the change. */
  onCommitGeometry: (id: string, rect: Rect) => void;
  /** Called continuously during a drag so the parent can reflect it locally. */
  onPreviewGeometry: (id: string, rect: Rect) => void;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const MIN_SIZE = 0.02;

type Mode =
  | { kind: 'idle' }
  | { kind: 'draw'; startX: number; startY: number; rect: Rect }
  | { kind: 'move'; id: string; offsetX: number; offsetY: number; rect: Rect }
  | { kind: 'resize'; id: string; rect: Rect };

export default function HotspotCanvas({
  step,
  selectedHotspotId,
  primaryColor,
  onSelectHotspot,
  onCreateHotspot,
  onCommitGeometry,
  onPreviewGeometry,
}: HotspotCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const isTouch = useIsTouch();

  const toNorm = (e: ReactPointerEvent) => {
    const el = surfaceRef.current;
    if (!el) return { nx: 0, ny: 0 };
    const r = el.getBoundingClientRect();
    return {
      nx: clamp01((e.clientX - r.left) / r.width),
      ny: clamp01((e.clientY - r.top) / r.height),
    };
  };

  const startDraw = (e: ReactPointerEvent) => {
    if (!step?.asset_url) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { nx, ny } = toNorm(e);
    onSelectHotspot(null);
    setMode({ kind: 'draw', startX: nx, startY: ny, rect: { x: nx, y: ny, w: 0, h: 0 } });
  };

  const startMove = (e: ReactPointerEvent, id: string, rect: Rect) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { nx, ny } = toNorm(e);
    onSelectHotspot(id);
    setMode({ kind: 'move', id, offsetX: nx - rect.x, offsetY: ny - rect.y, rect });
  };

  const startResize = (e: ReactPointerEvent, id: string, rect: Rect) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setMode({ kind: 'resize', id, rect });
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (mode.kind === 'idle') return;
    const { nx, ny } = toNorm(e);

    if (mode.kind === 'draw') {
      const rect: Rect = {
        x: Math.min(mode.startX, nx),
        y: Math.min(mode.startY, ny),
        w: Math.abs(nx - mode.startX),
        h: Math.abs(ny - mode.startY),
      };
      setMode({ ...mode, rect });
    } else if (mode.kind === 'move') {
      const rect: Rect = {
        x: clamp01(Math.min(nx - mode.offsetX, 1 - mode.rect.w)),
        y: clamp01(Math.min(ny - mode.offsetY, 1 - mode.rect.h)),
        w: mode.rect.w,
        h: mode.rect.h,
      };
      setMode({ ...mode, rect });
      onPreviewGeometry(mode.id, rect);
    } else if (mode.kind === 'resize') {
      const rect: Rect = {
        x: mode.rect.x,
        y: mode.rect.y,
        w: clamp01(nx - mode.rect.x),
        h: clamp01(ny - mode.rect.y),
      };
      setMode({ ...mode, rect });
      onPreviewGeometry(mode.id, rect);
    }
  };

  const onPointerUp = () => {
    if (mode.kind === 'draw') {
      if (mode.rect.w >= MIN_SIZE && mode.rect.h >= MIN_SIZE) {
        onCreateHotspot(mode.rect);
      }
    } else if (mode.kind === 'move' || mode.kind === 'resize') {
      const rect = mode.rect;
      const safe: Rect = {
        x: rect.x,
        y: rect.y,
        w: Math.max(MIN_SIZE, rect.w),
        h: Math.max(MIN_SIZE, rect.h),
      };
      onCommitGeometry(mode.id, safe);
    }
    setMode({ kind: 'idle' });
  };

  if (!step) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 text-sm text-muted-foreground">
        Select or add a step to start placing hotspots.
      </div>
    );
  }

  // Touch devices: read-only canvas (image + existing hotspots) + a "best on
  // desktop" notice. Precise drawing/dragging/resizing isn't viable on coarse
  // pointers, so we avoid a broken drag surface entirely.
  if (isTouch) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl border border-border bg-black/90">
        <StepMedia step={step} />
        {step.hotspots.map((h) => (
          <div
            key={h.id}
            className="absolute rounded-md ring-2 ring-white/60"
            style={{
              left: `${h.x * 100}%`,
              top: `${h.y * 100}%`,
              width: `${h.w * 100}%`,
              height: `${h.h * 100}%`,
              backgroundColor: `${primaryColor}40`,
            }}
          >
            {h.label && (
              <span className="pointer-events-none absolute left-0 top-0 -translate-y-full rounded bg-slate-900 px-1.5 py-0.5 text-caption text-white">
                {h.label}
              </span>
            )}
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/85 to-transparent p-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/85 px-3 py-2 text-center text-xs font-medium text-white shadow-lg">
            <Monitor className="h-4 w-4 shrink-0" />
            Hotspots are best edited on a larger screen — open this demo on desktop to add or resize them.
          </span>
        </div>
      </div>
    );
  }

  const draftRect = mode.kind === 'draw' ? mode.rect : null;

  return (
    <div
      ref={surfaceRef}
      className="relative w-full touch-none overflow-hidden rounded-xl border border-border bg-black/90"
      onPointerDown={startDraw}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="application"
      aria-label="Hotspot editor canvas"
    >
      <StepMedia step={step} />

      {step.hotspots.map((h) => {
        const selected = h.id === selectedHotspotId;
        return (
          <div
            key={h.id}
            onPointerDown={(e) => startMove(e, h.id, { x: h.x, y: h.y, w: h.w, h: h.h })}
            className={cn(
              'absolute cursor-move rounded-md ring-2 transition',
              selected ? 'ring-white' : 'ring-white/60 hover:ring-white',
            )}
            style={{
              left: `${h.x * 100}%`,
              top: `${h.y * 100}%`,
              width: `${h.w * 100}%`,
              height: `${h.h * 100}%`,
              backgroundColor: `${primaryColor}40`,
            }}
          >
            {h.label && (
              <span className="pointer-events-none absolute left-0 top-0 -translate-y-full rounded bg-slate-900 px-1.5 py-0.5 text-caption text-white">
                {h.label}
              </span>
            )}
            {selected && (
              <span
                onPointerDown={(e) => startResize(e, h.id, { x: h.x, y: h.y, w: h.w, h: h.h })}
                className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-full border border-border bg-white"
              />
            )}
          </div>
        );
      })}

      {draftRect && (
        <div
          className="absolute rounded-md border-2 border-dashed border-white bg-white/20"
          style={{
            left: `${draftRect.x * 100}%`,
            top: `${draftRect.y * 100}%`,
            width: `${draftRect.w * 100}%`,
            height: `${draftRect.h * 100}%`,
          }}
        />
      )}

      {!step.asset_url ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
          <span className="rounded-full bg-black/75 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
            Upload or replace this step screenshot before adding hotspots
          </span>
        </div>
      ) : step.hotspots.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-3">
          <span className="rounded-full bg-black/75 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
            Drag on the screenshot to create a clickable hotspot
          </span>
        </div>
      ) : (
        <p className="pointer-events-none absolute left-2 top-2 rounded bg-black/50 px-2 py-1 text-caption text-white/70">
          Drag to add another hotspot
        </p>
      )}
    </div>
  );
}
