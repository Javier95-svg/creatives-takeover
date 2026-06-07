import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '@/lib/utils';
import type { DemoStepWithHotspots } from '@/lib/demoStudio/types';

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
      {step.asset_url ? (
        <img src={step.asset_url} alt="Step" className="block h-auto w-full" draggable={false} />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-slate-800 text-sm text-white/50">
          This step has no image.
        </div>
      )}

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
              <span className="pointer-events-none absolute left-0 top-0 -translate-y-full rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">
                {h.label}
              </span>
            )}
            {selected && (
              <span
                onPointerDown={(e) => startResize(e, h.id, { x: h.x, y: h.y, w: h.w, h: h.h })}
                className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-full border border-slate-900 bg-white"
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

      <p className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[11px] text-white/80">
        Drag on the image to create a hotspot
      </p>
    </div>
  );
}
