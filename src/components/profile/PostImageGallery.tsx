import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export function PostImageGallery({ images, authorName, onOpenChange }: {
  images: string[];
  authorName: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [position, setPosition] = useState(0);
  const active = Math.min(position, Math.max(0, images.length - 1));
  if (!images.length) return null;
  return <>
    <div role="group" aria-label="Post images" className="space-y-3">
      <div className="relative">
      {images[active] ? (
        <button type="button" className="block w-full overflow-hidden rounded-lg border border-border/50 bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`View image ${active + 1} of ${images.length} shared by ${authorName}`} onClick={() => { setSelected(active); onOpenChange?.(true); }}>
          <img src={images[active]} alt={`Image ${active + 1} shared by ${authorName}`} loading="lazy" className="max-h-96 w-full object-contain" />
        </button>
      ) : <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Image temporarily unavailable.</p>}
      {images.length > 1 && <>
        <span className="absolute right-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium">{active + 1}/{images.length}</span>
        <Button type="button" size="icon" variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full" aria-label="Previous image" onClick={() => setPosition((active + images.length - 1) % images.length)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full" aria-label="Next image" onClick={() => setPosition((active + 1) % images.length)}><ChevronRight className="h-4 w-4" /></Button>
      </>}
      </div>
      {images.length > 1 && <div className="flex justify-center gap-1" aria-label="Choose a post image">
        {images.map((_, index) => <button key={index} type="button" className="flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Show post image ${index + 1} of ${images.length}`} aria-pressed={active === index} onClick={() => setPosition(index)}>
          <span className={`h-2.5 w-2.5 rounded-full ${active === index ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
        </button>)}
      </div>}
    </div>
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); onOpenChange?.(open); }}>
      <DialogContent className="max-h-[95vh] max-w-5xl overflow-y-auto">
        <DialogTitle>Images from {authorName}</DialogTitle>
        {selected !== null && <img src={images[selected]} alt={`Image ${selected + 1} shared by ${authorName}`} className="max-h-[70vh] w-full object-contain" />}
        {images.length > 1 && <div className="flex justify-center gap-2">{images.map((url, index) => url && <button key={url} type="button" aria-label={`Show image ${index + 1}`} aria-pressed={selected === index} className={`overflow-hidden rounded border-2 ${selected === index ? 'border-primary' : 'border-transparent'}`} onClick={() => setSelected(index)}><img src={url} alt="" className="h-14 w-20 object-cover" /></button>)}</div>}
      </DialogContent>
    </Dialog>
  </>;
}
