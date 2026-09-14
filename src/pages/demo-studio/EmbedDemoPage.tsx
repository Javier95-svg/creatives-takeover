import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import SEO from '@/components/SEO';
import DemoPlayer from '@/components/demo-studio/player/DemoPlayer';
import { getPublicDemo } from '@/lib/demoStudio/api';
import { shouldShowWatermark } from '@/lib/demoStudio/plan';
import type { PublicDemo } from '@/lib/demoStudio/types';

// Iframe-optimized demo view: no site chrome, fills the embed, tracks events.
export default function EmbedDemoPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const [data, setData] = useState<PublicDemo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    if (!publicId) return;
    let active = true;
    void (async () => {
      try {
        const result = await getPublicDemo(publicId);
        if (!active) return;
        if (!result) {
          setState('missing');
          return;
        }
        setData(result);
        setState('ready');
      } catch {
        if (active) setState('missing');
      }
    })();
    return () => {
      active = false;
    };
  }, [publicId]);

  if (state === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (state === 'missing' || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 px-6 text-center text-sm text-white/60">
        This demo is unavailable.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-3">
      {/* Duplicate of /demo/:publicId by design, so it must never be indexed. The
          X-Robots-Tag on /embed/ in vercel.json covers crawlers; this covers the
          rendered page. */}
      <SEO title={`${data.demo.title} demo`} description="Interactive product demo." noindex />
      <DemoPlayer
        steps={data.steps}
        theme={data.demo.theme}
        mode="live"
        embedded
        projectId={data.demo.project_id}
        demoId={data.demo.id}
        showWatermark={shouldShowWatermark(data.demo.theme?.watermark, data.demo.theme?.ownerPlan)}
      />
    </div>
  );
}
