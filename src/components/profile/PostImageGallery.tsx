import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export function PostImageGallery({ images, authorName, onOpenChange }: {
  images: string[];
  authorName: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!images.length) return null;
  return <>
    <div className={`grid gap-2 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {images.map((url, index) => url ? (
        <button key={url} type="button" className="overflow-hidden rounded-lg border border-border/50 bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`View image ${index + 1} of ${images.length} shared by ${authorName}`} onClick={() => { setSelected(index); onOpenChange?.(true); }}>
          <img src={url} alt={`Image ${index + 1} shared by ${authorName}`} loading="lazy" className={`${images.length > 1 ? 'h-52 sm:h-64' : 'max-h-96'} w-full object-contain`} />
        </button>
      ) : <p key={index} className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Image temporarily unavailable.</p>)}
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
