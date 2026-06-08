import { useState } from 'react';
import { Loader2, Link2 } from 'lucide-react';
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
          <DialogTitle>Save VSL variation {label}</DialogTitle>
          <DialogDescription>
            Paste the Loom share link for this pitch variation. Demo Studio stores the Loom URL and uses it on the launch page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor={`loom-url-${label}`}>Loom share URL</Label>
            <Input
              id={`loom-url-${label}`}
              value={url}
              placeholder="https://www.loom.com/share/..."
              onChange={(e) => setUrl(e.target.value)}
            />
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
            Save variation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
