import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import SEO from '@/components/SEO';
import DemoPlayer from '@/components/demo-studio/player/DemoPlayer';
import { getPublicDemo } from '@/lib/demoStudio/api';
import type { PublicDemo } from '@/lib/demoStudio/types';

export default function PublicDemoPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const [data, setData] = useState<PublicDemo | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    if (!publicId) return;
    let active = true;
    (async () => {
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  if (state === 'missing' || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center text-white">
        <SEO title="Demo not found — Demo Studio" description="This demo is unavailable." noindex />
        <h1 className="text-2xl font-semibold">Demo not found</h1>
        <p className="text-white/60">This demo may have been unpublished or the link is incorrect.</p>
        <a href="/demo-studio" className="mt-2 text-sm text-primary underline-offset-4 hover:underline">
          Build your own with Demo Studio
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-8">
      <SEO
        title={`${data.demo.title} — Interactive demo`}
        description={`Take an interactive walkthrough of ${data.demo.title}.`}
        type="product"
      />
      <div className="mx-auto w-full max-w-4xl px-4">
        <DemoPlayer
          steps={data.steps}
          theme={data.demo.theme}
          mode="live"
          projectId={data.demo.project_id}
          demoId={data.demo.id}
          showWatermark={data.demo.theme?.watermark !== false}
        />
      </div>
    </div>
  );
}
