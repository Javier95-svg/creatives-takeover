import { useEffect, useMemo, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validatePostImage } from '@/lib/profilePosts';
import { toast } from 'sonner';

export interface PostImageAttachment { file?: File; path?: string; url?: string }

export function PostImagePicker({ images, onChange, disabled = false }: {
  images: PostImageAttachment[];
  onChange: (images: PostImageAttachment[]) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => images.map((image) => image.file ? URL.createObjectURL(image.file) : image.url), [images]);
  useEffect(() => () => {
    previews.forEach((url, index) => { if (url && images[index].file) URL.revokeObjectURL(url); });
  }, [previews, images]);
  return <div className="space-y-3">
    {!!images.length && <div className="grid grid-cols-2 gap-3">
      {images.map((image, index) => <div key={image.path || `${image.file?.name}-${index}`} className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
        {previews[index] ? <img src={previews[index]} alt={`Attached image ${index + 1}`} className="h-36 w-full object-contain" /> : <p className="p-6 text-sm text-muted-foreground">Image unavailable</p>}
        <Button type="button" size="icon" variant="secondary" disabled={disabled} aria-label={`Remove image ${index + 1}`} className="absolute right-1 top-1 h-7 w-7" onClick={() => onChange(images.filter((_, i) => i !== index))}><X className="h-4 w-4" /></Button>
      </div>)}
    </div>}
    <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      if (images.length + files.length > 4) { toast.error('You can attach up to 4 images per post.'); return; }
      for (const file of files) {
        const error = validatePostImage(file);
        if (error) { toast.error(error); return; }
      }
      onChange([...images, ...files.map((file) => ({ file }))]);
    }} />
    <Button type="button" variant="ghost" size="sm" disabled={disabled || images.length >= 4} onClick={() => input.current?.click()}><ImagePlus className="mr-2 h-4 w-4 text-primary" />Add images ({images.length}/4)</Button>
    <span className="ml-2 text-xs text-muted-foreground">Up to 5 MB each</span>
  </div>;
}
