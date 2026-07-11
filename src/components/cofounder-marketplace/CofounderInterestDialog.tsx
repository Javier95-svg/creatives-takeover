import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CofounderInterestReason, CofounderListing } from '@/types/cofounderMarketplace';

interface Props {
  listing: CofounderListing | null;
  open: boolean;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: CofounderInterestReason, introduction: string, availability: string) => void;
}

export function CofounderInterestDialog({ listing, open, pending, onOpenChange, onSubmit }: Props) {
  const [reason, setReason] = useState<CofounderInterestReason>('complementary_skills');
  const [introduction, setIntroduction] = useState('');
  const [availability, setAvailability] = useState('');
  useEffect(() => { if (!open) { setIntroduction(''); setAvailability(''); } }, [open]);
  const valid = introduction.trim().length >= 50 && introduction.trim().length <= 500 && availability.trim().length >= 2;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Express interest</DialogTitle>
          <DialogDescription>Send a thoughtful request about “{listing?.headline}”. Chat opens only if the founder accepts.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="interest-reason">Why could this be a fit?</Label>
            <select id="interest-reason" value={reason} onChange={(event) => setReason(event.target.value as CofounderInterestReason)} className="h-11 w-full rounded-md border border-input bg-background px-3">
              <option value="complementary_skills">Complementary skills</option>
              <option value="shared_industry">Shared industry</option>
              <option value="shared_stage">Shared startup stage</option>
              <option value="custom_fit">Another specific fit</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interest-intro">Personal introduction</Label>
            <Textarea id="interest-intro" value={introduction} onChange={(event) => setIntroduction(event.target.value)} maxLength={500} className="min-h-32" placeholder="Explain what you bring, what caught your attention, and why exploring this together makes sense." />
            <p className="text-xs text-muted-foreground">{introduction.length}/500 · minimum 50 characters</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="interest-availability">Availability</Label>
            <Textarea id="interest-availability" value={availability} onChange={(event) => setAvailability(event.target.value)} maxLength={180} placeholder="For example: 15 hours/week, UTC-5, available for a call next week." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid || pending} onClick={() => onSubmit(reason, introduction.trim(), availability.trim())}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
