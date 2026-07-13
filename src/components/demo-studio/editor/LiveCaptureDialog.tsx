import { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, Loader2, MousePointerClick, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { createHotspot, createStep, updateStep, uploadStepHtmlSnapshot } from '@/lib/demoStudio/api';
import type { DemoStepWithHotspots } from '@/lib/demoStudio/types';

// Live click-through capture: the founder opens their published MVP with a
// one-time capture hash; every click over there becomes a step (page HTML +
// click position). This dialog creates the session, polls for the captured
// steps, and imports them — sanitized via uploadStepHtmlSnapshot (DOMPurify)
// and rendered only in sandboxed iframes — with a hotspot already placed
// where the founder actually clicked.

const BASE_DOMAIN = 'creatives-takeover.com';
const POLL_INTERVAL_MS = 3000;

interface PublishedMvp {
  id: string;
  title: string | null;
  subdomain_slug: string;
}

interface CapturedStep {
  html: string;
  clickX: number;
  clickY: number;
  label: string;
}

interface LiveCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  demoId: string;
  existingStepCount: number;
  onImported: (steps: DemoStepWithHotspots[]) => void;
}

type Phase = 'pick' | 'waiting' | 'importing';

export default function LiveCaptureDialog({
  open,
  onOpenChange,
  userId,
  demoId,
  existingStepCount,
  onImported,
}: LiveCaptureDialogProps) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [mvps, setMvps] = useState<PublishedMvp[]>([]);
  const [loadingMvps, setLoadingMvps] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const importingRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setPhase('pick');
      setSessionId(null);
      setCaptureUrl(null);
      importingRef.current = false;
      return;
    }
    let active = true;
    setLoadingMvps(true);
    void supabase
      .from('mvp_projects' as never)
      .select('id, title, subdomain_slug')
      .eq('user_id', userId)
      .not('subdomain_slug', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (!active) return;
        setMvps(((data ?? []) as PublishedMvp[]).filter((row) => row.subdomain_slug));
        setLoadingMvps(false);
      });
    return () => {
      active = false;
    };
  }, [open, userId]);

  const startSession = async (mvp: PublishedMvp) => {
    try {
      const { data, error } = await supabase
        .from('demo_capture_sessions' as never)
        .insert({ user_id: userId, demo_id: demoId } as never)
        .select('id')
        .single();
      if (error || !data) throw error ?? new Error('Could not start a capture session.');
      const id = (data as { id: string }).id;
      const url = `https://${mvp.subdomain_slug}.${BASE_DOMAIN}/#ct-capture=${id}`;
      setSessionId(id);
      setCaptureUrl(url);
      setPhase('waiting');
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start a capture session.');
    }
  };

  const importSteps = useCallback(
    async (captured: CapturedStep[]) => {
      if (importingRef.current) return;
      importingRef.current = true;
      setPhase('importing');
      try {
        const imported: DemoStepWithHotspots[] = [];
        for (let i = 0; i < captured.length; i += 1) {
          const cap = captured[i];
          const file = new File([cap.html], `live-capture-${i + 1}.html`, { type: 'text/html' });
          const { url } = await uploadStepHtmlSnapshot(userId, file);
          const step = await createStep(demoId, existingStepCount + i, { url, type: 'html' });
          const w = 0.1;
          const h = 0.1;
          const x = Math.min(0.9, Math.max(0, cap.clickX - w / 2));
          const y = Math.min(0.9, Math.max(0, cap.clickY - h / 2));
          const hotspot = await createHotspot(step.id, {
            x,
            y,
            w,
            h,
            action: 'next',
            label: cap.label || undefined,
          });
          if (cap.label) {
            await updateStep(step.id, { title: cap.label.slice(0, 80) });
          }
          imported.push({ ...step, title: cap.label || step.title, hotspots: [hotspot] });
        }
        onImported(imported);
        toast.success(`${imported.length} step${imported.length === 1 ? '' : 's'} captured from your live product.`, {
          description: 'Hotspots are already placed where you clicked — adjust anything in the canvas.',
        });
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Import failed. Your capture is saved — try again.');
        setPhase('waiting');
        importingRef.current = false;
      }
    },
    [demoId, existingStepCount, onImported, onOpenChange, userId],
  );

  // Poll the session until the capture script marks it complete.
  useEffect(() => {
    if (!open || phase !== 'waiting' || !sessionId) return;
    const timer = window.setInterval(async () => {
      const { data } = await supabase
        .from('demo_capture_sessions' as never)
        .select('status, steps')
        .eq('id', sessionId)
        .maybeSingle();
      const row = data as { status: string; steps: CapturedStep[] | null } | null;
      if (row?.status === 'complete' && Array.isArray(row.steps) && row.steps.length > 0) {
        window.clearInterval(timer);
        void importSteps(row.steps);
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [open, phase, sessionId, importSteps]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (phase !== 'importing') onOpenChange(next); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MousePointerClick className="h-4 w-4 text-primary" />
            Capture your live product
          </DialogTitle>
          <DialogDescription>
            Open your published site in capture mode, click through the flow you want to show, and every click
            comes back here as a demo step with the hotspot already placed.
          </DialogDescription>
        </DialogHeader>

        {phase === 'pick' && (
          <div className="space-y-3">
            {loadingMvps ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your published sites…
              </div>
            ) : mvps.length === 0 ? (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                No published MVP Builder sites yet. Publish your MVP first (MVP Builder → Publish) — live capture
                works on your <span className="font-medium">*.{BASE_DOMAIN}</span> sites.
              </div>
            ) : (
              <div className="space-y-2">
                {mvps.map((mvp) => (
                  <button
                    key={mvp.id}
                    type="button"
                    onClick={() => void startSession(mvp)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 px-3 py-2.5 text-left transition-colors hover:border-primary/50"
                  >
                    <span>
                      <span className="block text-sm font-medium">{mvp.title || mvp.subdomain_slug}</span>
                      <span className="block text-xs text-muted-foreground">
                        {mvp.subdomain_slug}.{BASE_DOMAIN}
                      </span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === 'waiting' && captureUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-info/25 bg-info/5 px-3 py-2.5 text-sm">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-info" />
              <span>
                Waiting for your capture — click through your product in the new tab, then press{' '}
                <span className="font-semibold">Finish &amp; send</span>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={captureUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Reopen capture tab
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  void navigator.clipboard.writeText(captureUrl).then(() => toast.success('Capture link copied.'));
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy link
              </Button>
            </div>
          </div>
        )}

        {phase === 'importing' && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" /> Importing your captured steps…
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
