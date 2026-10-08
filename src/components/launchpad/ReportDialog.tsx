import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { launchpadErrorMessage, REPORT_CATEGORIES, reportContent, type ReportCategory } from '@/lib/launchpad';

export type ReportTarget = { postId?: string; commentId?: string } | null;

/** Three reports from different people hide the item until an admin reviews it. */
export function ReportDialog({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const { user } = useAuth();
  const [category, setCategory] = useState<ReportCategory>('spam');
  const [explanation, setExplanation] = useState('');
  const [sending, setSending] = useState(false);
  const noun = target?.commentId ? 'reply' : 'post';

  const submit = async () => {
    if (!user || !target) return;
    setSending(true);
    try {
      await reportContent(user.id, target, category, explanation);
      toast.success('Thanks. The team will review it.');
      setExplanation('');
      onClose();
    } catch (error) {
      toast.error(launchpadErrorMessage(error, 'Could not send the report.'));
    } finally {
      setSending(false);
    }
  };

  return <Dialog open={Boolean(target)} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Report this {noun}</DialogTitle>
        <DialogDescription>Reports are private. The author is not told who sent it.</DialogDescription>
      </DialogHeader>
      <RadioGroup value={category} onValueChange={(value) => setCategory(value as ReportCategory)} className="space-y-1">
        {REPORT_CATEGORIES.map((option) => <div key={option.value} className="flex items-center gap-2">
          <RadioGroupItem id={`report-${option.value}`} value={option.value} />
          <Label htmlFor={`report-${option.value}`} className="font-normal">{option.label}</Label>
        </div>)}
      </RadioGroup>
      <div>
        <Label htmlFor="report-explanation">Anything we should know? <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea id="report-explanation" className="mt-2" maxLength={1000} rows={3} value={explanation} onChange={(event) => setExplanation(event.target.value)} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => void submit()} disabled={sending}>{sending ? 'Sending…' : 'Send report'}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
