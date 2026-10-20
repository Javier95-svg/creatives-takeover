import { useRef, useState, type PointerEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export function PostImageGallery({ images, authorName, onOpenChange, onInteraction }: {
  images: string[];
  authorName: string;
  onOpenChange?: (open: boolean) => void;
  onInteraction?: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [position, setPosition] = useState(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lastSwipe = useRef(0);
  const active = Math.min(position, Math.max(0, images.length - 1));
  const modalImage = selected === null ? null : Math.min(selected, images.length - 1);
  if (!images.length) return null;

  function goTo(index: number) {
    onInteraction?.();
    setPosition((index + images.length) % images.length);
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || images.length < 2) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    lastSwipe.current = Date.now();
    goTo(active + (dx < 0 ? 1 : -1));
  }

  return <>
    <div role="group" aria-label="Post images" className="space-y-2">
      <div className="relative">
        {images[active] ? <button type="button"
          className="block w-full touch-pan-y overflow-hidden rounded-lg border border-border/50 bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View image ${active + 1} of ${images.length} shared by ${authorName}`}
          onPointerDown={(event) => { pointerStart.current = { x: event.clientX, y: event.clientY }; }}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { pointerStart.current = null; }}
          onKeyDown={(event) => {
            if (images.length < 2 || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
            event.preventDefault();
            goTo(active + (event.key === 'ArrowRight' ? 1 : -1));
          }}
          onClick={() => {
            if (Date.now() - lastSwipe.current < 450) return;
            onInteraction?.();
            setSelected(active);
            onOpenChange?.(true);
          }}>
          <img src={images[active]} alt={`Image ${active + 1} shared by ${authorName}`} loading="lazy" draggable={false} className="max-h-96 w-full select-none object-contain" />
        </button> : <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Image temporarily unavailable.</p>}
        {images.length > 1 && <>
          <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-background/95 px-3 py-1 text-xs font-semibold shadow-sm">{active + 1}/{images.length}</span>
          <Button type="button" size="icon" variant="secondary" className="absolute left-2 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-background/95 text-foreground shadow-md hover:bg-background" aria-label="Previous image" onClick={() => goTo(active - 1)}><ChevronLeft className="h-5 w-5" /></Button>
          <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-background/95 text-foreground shadow-md hover:bg-background" aria-label="Next image" onClick={() => goTo(active + 1)}><ChevronRight className="h-5 w-5" /></Button>
        </>}
      </div>
      {images.length > 1 && <div className="flex justify-center gap-1" role="group" aria-label="Choose a post image">
        {images.map((_, index) => <button key={index} type="button" className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Show post image ${index + 1} of ${images.length}`} aria-pressed={active === index} onClick={() => goTo(index)}>
          <span className={`h-3 w-3 rounded-full transition-colors ${active === index ? 'bg-primary' : 'bg-muted-foreground/40 hover:bg-muted-foreground/65'}`} />
        </button>)}
      </div>}
    </div>
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); onOpenChange?.(open); }}>
      <DialogContent className="max-h-[95vh] max-w-5xl overflow-y-auto" onKeyDown={(event) => {
        if (modalImage === null || images.length < 2 || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
        event.preventDefault();
        setSelected((modalImage + (event.key === 'ArrowRight' ? 1 : -1) + images.length) % images.length);
      }}>
        <DialogTitle>Images from {authorName}</DialogTitle>
        {modalImage !== null && <div className="relative flex items-center justify-center">
          <img src={images[modalImage]} alt={`Image ${modalImage + 1} shared by ${authorName}`} className="max-h-[70vh] w-full object-contain" />
          {images.length > 1 && <>
            <Button type="button" size="icon" variant="secondary" className="absolute left-2 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-background/95 shadow-md" aria-label="Previous full-screen image" onClick={() => setSelected((modalImage - 1 + images.length) % images.length)}><ChevronLeft className="h-5 w-5" /></Button>
            <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-background/95 shadow-md" aria-label="Next full-screen image" onClick={() => setSelected((modalImage + 1) % images.length)}><ChevronRight className="h-5 w-5" /></Button>
          </>}
        </div>}
        {images.length > 1 && <div className="flex justify-center gap-2">{images.map((url, index) => url && <button key={`${index}-${url}`} type="button" aria-label={`Show full-screen image ${index + 1}`} aria-pressed={modalImage === index} className={`overflow-hidden rounded border-2 ${modalImage === index ? 'border-primary' : 'border-transparent'}`} onClick={() => setSelected(index)}><img src={url} alt="" className="h-14 w-20 object-cover" /></button>)}</div>}
      </DialogContent>
    </Dialog>
  </>;
}
