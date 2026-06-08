import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoomEmbedProps {
  embedUrl?: string | null;
  sharedUrl?: string | null;
  title?: string | null;
}

export default function LoomEmbed({ embedUrl, sharedUrl, title }: LoomEmbedProps) {
  if (!embedUrl && !sharedUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 text-sm text-muted-foreground">
        No Loom video saved.
      </div>
    );
  }

  if (embedUrl) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-black">
        <iframe
          src={embedUrl}
          title={title || 'VSL recording'}
          allowFullScreen
          className="aspect-video w-full"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/30 p-6 text-center">
      <p className="text-sm text-muted-foreground">This Loom link cannot be embedded, but it is saved.</p>
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <a href={sharedUrl ?? '#'} target="_blank" rel="noopener noreferrer">
          Open Loom <ExternalLink className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}
