import { useState } from 'react';
import { CheckCircle2, Clipboard, FileText, Loader2, Mic2, Star, Trash2, Video, Wand2 } from 'lucide-react';
import type { LoomVideo } from '@loomhq/record-sdk';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DemoStudioVsl, DemoStudioVslScript } from '@/lib/demoStudio/types';
import { getVslReadiness } from '@/lib/demoStudio/readiness';
import LoomEmbed from './LoomEmbed';
import LoomRecorderButton from './LoomRecorderButton';
import PasteLoomDialog from './PasteLoomDialog';

interface VslSlotProps {
  label: string;
  vsl?: DemoStudioVsl;
  scriptDraft?: DemoStudioVslScript;
  saving?: boolean;
  onCreateFromLoom: (label: string, video: LoomVideo) => Promise<void> | void;
  onPaste: (label: string, fields: { url: string; title: string; hook: string }) => Promise<void> | void;
  onApplyScript: (label: string) => Promise<void> | void;
  onRewriteScript: (label: string, style: 'shorter' | 'sharper' | 'founder') => Promise<void> | void;
  onSetPrimary: (vsl: DemoStudioVsl) => Promise<void> | void;
  onDelete: (vsl: DemoStudioVsl) => Promise<void> | void;
}

export default function VslSlot({
  label,
  vsl,
  scriptDraft,
  saving,
  onCreateFromLoom,
  onPaste,
  onApplyScript,
  onRewriteScript,
  onSetPrimary,
  onDelete,
}: VslSlotProps) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [teleprompterOpen, setTeleprompterOpen] = useState(false);
  const readiness = getVslReadiness(vsl);
  const script = vsl?.script || scriptDraft?.script || '';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm text-primary">
              {label}
            </span>
            VSL variation
          </CardTitle>
          {vsl?.is_primary && (
            <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10">
              <CheckCircle2 className="h-3.5 w-3.5" /> Primary
            </Badge>
          )}
          {vsl && !readiness.ready && (
            <Badge variant="outline">{readiness.score}% ready</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(scriptDraft || vsl?.script) && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-primary" /> Script
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {vsl?.script ? vsl.title || `Variation ${label}` : scriptDraft?.title || `Variation ${label}`}
                </p>
              </div>
              {scriptDraft && (
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => onApplyScript(label)} disabled={saving}>
                  <Wand2 className="h-3.5 w-3.5" /> Use script
                </Button>
              )}
            </div>
            {(vsl?.hook || scriptDraft?.hook) && (
              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{vsl?.hook || scriptDraft?.hook}</p>
            )}
            {script && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={() => setTeleprompterOpen(true)}>
                  <Mic2 className="h-3.5 w-3.5" /> Teleprompter
                </Button>
                {vsl?.script && (
                  <>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => onRewriteScript(label, 'shorter')} disabled={saving}>Shorter</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => onRewriteScript(label, 'sharper')} disabled={saving}>Sharper</Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => onRewriteScript(label, 'founder')} disabled={saving}>Founder-led</Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {vsl ? (
          <>
            {vsl.loom_embed_url || vsl.loom_shared_url ? (
              <LoomEmbed embedUrl={vsl.loom_embed_url} sharedUrl={vsl.loom_shared_url} title={vsl.title} />
            ) : (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 p-5">
                <p className="text-sm font-medium">Script saved. Add the Loom recording next.</p>
                <p className="mt-1 text-sm text-muted-foreground">Record with the teleprompter open, then paste the Loom link here.</p>
                <Button type="button" variant="outline" className="mt-3 gap-2" onClick={() => setPasteOpen(true)} disabled={saving}>
                  <Clipboard className="h-4 w-4" /> Add Loom link
                </Button>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold">{vsl.title || `Variation ${label}`}</h3>
              {vsl.hook && <p className="mt-1 text-sm text-muted-foreground">{vsl.hook}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onSetPrimary(vsl)} disabled={vsl.is_primary || saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
                Use on launch page
              </Button>
              {(vsl.loom_embed_url || vsl.loom_shared_url) && (
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setPasteOpen(true)} disabled={saving}>
                  <Clipboard className="h-4 w-4" /> Replace Loom link
                </Button>
              )}
              <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => onDelete(vsl)} disabled={saving}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4 rounded-lg border border-dashed border-muted-foreground/30 p-5">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Video className="h-4 w-4 text-primary" /> Record or paste a founder pitch
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Use a different hook, proof point, or CTA so you can compare which angle earns signups.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LoomRecorderButton disabled={saving} onRecorded={(video) => onCreateFromLoom(label, video)} />
              <Button type="button" variant="outline" className="gap-2" onClick={() => setPasteOpen(true)} disabled={saving}>
                <Clipboard className="h-4 w-4" /> Add Loom link
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <PasteLoomDialog
        open={pasteOpen}
        label={label}
        saving={saving}
        onOpenChange={setPasteOpen}
        onSave={async (fields) => {
          await onPaste(label, fields);
          setPasteOpen(false);
        }}
      />
      <Dialog open={teleprompterOpen} onOpenChange={setTeleprompterOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Teleprompter variation {label}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto rounded-xl bg-slate-950 p-6 text-white">
            <p className="text-sm uppercase tracking-wide text-white/50">{vsl?.hook || scriptDraft?.hook}</p>
            <div className="mt-4 whitespace-pre-wrap text-2xl leading-relaxed">{script || 'No script yet.'}</div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
