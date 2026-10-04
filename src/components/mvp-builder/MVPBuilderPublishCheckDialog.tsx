import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { runPublishCheck, type PublishCheckInput } from '@/lib/mvp-builder/publishCheck';
import { cn } from '@/lib/utils';

// Shown when the founder presses Publish: what a visitor will be able to do,
// checked in the browser. A runtime error blocks unless the founder chooses to
// publish anyway, which is recorded.

interface MVPBuilderPublishCheckDialogProps extends PublishCheckInput {
  open: boolean;
  projectId: string;
  onOpenChange: (open: boolean) => void;
  onPublish: () => void;
  onAutoFix?: (error: string) => void;
}

export default function MVPBuilderPublishCheckDialog({
  open, projectId, onOpenChange, onPublish, onAutoFix, files, runtimeError, previewErrors, framework,
}: MVPBuilderPublishCheckDialogProps) {
  const { items, blocked } = useMemo(
    () => runPublishCheck({ files, runtimeError, previewErrors, framework }),
    [files, framework, previewErrors, runtimeError],
  );
  const hasForm = items.find((item) => item.id === 'form')?.ok === true;
  const [formService, setFormService] = useState<'idle' | 'checking' | 'ok' | 'unavailable'>('idle');
  const [override, setOverride] = useState(false);

  // Dry run: the lead service accepts this app's form fields without saving.
  useEffect(() => {
    if (!open || !hasForm) { setFormService('idle'); return; }
    let active = true;
    setFormService('checking');
    void supabase.functions.invoke('mvp-app-lead', { body: { check: true, projectId, fields: { email: 'check@example.com' } } })
      .then(({ data }) => { if (active) setFormService(data?.ok ? 'ok' : 'unavailable'); })
      .catch(() => { if (active) setFormService('unavailable'); });
    return () => { active = false; };
  }, [hasForm, open, projectId]);

  useEffect(() => { if (!open) setOverride(false); }, [open]);

  const publish = () => {
    captureEvent('mvp_publish_check', {
      project_id: projectId,
      blocked,
      overridden: blocked && override,
      checks: Object.fromEntries(items.map((item) => [item.id, item.ok])),
      form_service: formService,
    });
    onOpenChange(false);
    onPublish();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark mvp-surface tool-theme-mvp border-white/10 bg-background text-muted-foreground">
        <DialogHeader>
          <DialogTitle className="text-white">Before you publish</DialogTitle>
          <DialogDescription>What a visitor will be able to do on your app.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', item.ok ? 'bg-primary text-primary-foreground' : item.blocking ? 'bg-destructive text-destructive-foreground' : 'bg-white/10 text-muted-foreground')}>
                {item.ok ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-white">{item.label}</span>
                {!item.ok && item.hint ? <span className="mt-0.5 block break-words text-xs text-muted-foreground">{item.hint}</span> : null}
                {item.id === 'form' && item.ok ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formService === 'checking' ? 'Checking the form service.' : formService === 'ok' ? 'Form service is ready.' : formService === 'unavailable' ? 'The form service did not answer; entries may not save until it does.' : null}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {blocked ? (
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" className="mt-0.5" checked={override} onChange={(event) => setOverride(event.target.checked)} />
            Publish anyway. Visitors may see the error.
          </label>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          {blocked && runtimeError && onAutoFix ? (
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); onAutoFix(runtimeError); }}>Fix with AI</Button>
          ) : null}
          <Button type="button" onClick={publish} disabled={blocked && !override}>
            {formService === 'checking' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
