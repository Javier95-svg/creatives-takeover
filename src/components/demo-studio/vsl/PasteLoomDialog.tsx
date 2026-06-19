import { useState } from 'react';
import { ExternalLink, Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PasteLoomDialogProps {
  open: boolean;
  label: string;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (fields: { url: string; title: string; hook: string }) => Promise<void> | void;
}

export default function PasteLoomDialog({ open, label, saving, onOpenChange, onSave }: PasteLoomDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [hook, setHook] = useState('');

  const handleSave = async () => {
    await onSave({ url, title, hook });
    setUrl('');
    setTitle('');
    setHook('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Loom link for variation {label}</DialogTitle>
          <DialogDescription>
            Paste the Loom share link for this pitch variation. Demo Studio stores the Loom URL and uses it on the launch page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">No Loom account? You can still do this in 2 minutes.</p>
            <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
              <li>
                Go to{' '}
                <a
                  href="https://www.loom.com/looms/videos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
                >
                  loom.com <ExternalLink className="h-3 w-3" />
                </a>{' '}
                and sign up free (no paid plan needed) or add the browser extension.
              </li>
              <li>Record your screen + camera with the teleprompter open, then stop.</li>
              <li>Click “Copy link” on the video and paste it below.</li>
            </ol>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`loom-url-${label}`}>Loom share URL</Label>
            <Input
              id={`loom-url-${label}`}
              value={url}
              placeholder="https://www.loom.com/share/..."
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Format: https://www.loom.com/share/&lt;id&gt;</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`vsl-title-${label}`}>Variation title</Label>
            <Input
              id={`vsl-title-${label}`}
              value={title}
              placeholder="Short founder pitch"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`vsl-hook-${label}`}>Hook or angle</Label>
            <Textarea
              id={`vsl-hook-${label}`}
              value={hook}
              rows={3}
              placeholder="e.g. Opens with the pain, then shows the demo payoff."
              onChange={(e) => setHook(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!url.trim() || saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Save Loom link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
