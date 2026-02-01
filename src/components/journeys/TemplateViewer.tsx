import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import type { TaskTemplate } from '@/types/journey';

interface TemplateViewerProps {
  template: TaskTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TemplateViewer({ template, open, onOpenChange }: TemplateViewerProps) {
  const [copied, setCopied] = useState(false);

  if (!template) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = template.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.title}</DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="absolute top-2 right-2 gap-1.5"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>

          <div className="bg-muted/50 rounded-lg p-4 pt-12 text-sm whitespace-pre-wrap font-mono leading-relaxed border">
            {template.content}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
