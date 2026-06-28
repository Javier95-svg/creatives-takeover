import { useEffect, useState, type IframeHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Captured HTML is untrusted. It is rendered in a fully sandboxed iframe (empty sandbox
// = no scripts, no same-origin, no forms/popups), so no JS can execute regardless of the
// content — this is the primary security control; DOMPurify sanitization at import time
// (see uploadStepHtmlSnapshot) is defense-in-depth. The HTML is fetched and served from a
// same-origin blob: URL, which is allowed by the app CSP (frame-src 'self' blob:) without
// any vercel.json change. credentialless keeps it compatible with the site's COEP policy.
const credentiallessIframeProp = {
  credentialless: '',
} as unknown as IframeHTMLAttributes<HTMLIFrameElement>;

interface SnapshotFrameProps {
  /** Public URL of the stored self-contained .html snapshot. */
  url: string | null;
  title?: string;
  className?: string;
  /** When false (default) the frame ignores pointer events so an overlaid hotspot layer
   *  receives clicks. The editor canvas and player both rely on this. */
  interactive?: boolean;
}

export default function SnapshotFrame({ url, title = 'Captured page', className, interactive = false }: SnapshotFrameProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!url) {
      setState('error');
      return;
    }
    let active = true;
    let created: string | null = null;
    setState('loading');
    void (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Snapshot fetch failed');
        const text = await res.text();
        const DOMPurify = (await import('dompurify')).default;
        const clean = DOMPurify.sanitize(text, {
          WHOLE_DOCUMENT: true,
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'base', 'link'],
          FORBID_ATTR: ['ping'],
        });
        if (!active) return;
        created = URL.createObjectURL(new Blob([clean], { type: 'text/html' }));
        setBlobUrl(created);
        setState('ready');
      } catch {
        if (active) setState('error');
      }
    })();
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [url]);

  return (
    <div className={cn('relative w-full overflow-hidden bg-white', className)} style={{ aspectRatio: '16 / 10' }}>
      {state === 'ready' && blobUrl ? (
        <iframe
          src={blobUrl}
          title={title}
          sandbox=""
          {...credentiallessIframeProp}
          loading="lazy"
          className="absolute inset-0 h-full w-full border-0"
          style={interactive ? undefined : { pointerEvents: 'none' }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {state === 'loading' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Couldn't load the captured page."
          )}
        </div>
      )}
    </div>
  );
}
