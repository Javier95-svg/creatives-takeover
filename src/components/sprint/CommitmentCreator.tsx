import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon, Target, TrendingUp, Users, CheckCircle2, Coins } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useCredits } from '@/hooks/useCredits';
import { cn } from '@/lib/utils';

interface CommitmentCreatorProps {
  sprintId?: string;
  onCommitmentCreated: (commitment: any) => void;
  onCancel: () => void;
}

const CommitmentCreator: React.FC<CommitmentCreatorProps> = ({
  sprintId,
  onCommitmentCreated,
  onCancel
}) => {
  const { balance } = useCredits();
  const [commitmentText, setCommitmentText] = useState('');
  const [creditsStaked, setCreditsStaked] = useState([5]);
  const [targetDate, setTargetDate] = useState<Date>(addDays(new Date(), 7));
  const [verificationMethod, setVerificationMethod] = useState<'self_report' | 'peer_verified' | 'checkin_based'>('self_report');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxStake = Math.min(balance, 100);
  const potentialReturn = Math.floor(creditsStaked[0] * 1.1);
  const potentialLoss = creditsStaked[0];

  const isValidCommitment = () => {
    if (commitmentText.length < 20) return false;
    if (creditsStaked[0] < 3) return false;
    if (balance < creditsStaked[0]) return false;
    if (!targetDate) return false;
    return true;
  };

  const handleCreate = async () => {
    if (!isValidCommitment()) return;

    setIsSubmitting(true);
    try {
      await onCommitmentCreated({
        sprintId: sprintId || null,
        commitmentText,
        creditsStaked: creditsStaked[0],
        targetDate: format(targetDate, 'yyyy-MM-dd'),
        verificationMethod,
        isPublic
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Create Public Commitment
        </CardTitle>
        <CardDescription>
          Make a SMART goal, stake credits, and prove your commitment to the community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Commitment Text */}
        <div className="space-y-2">
          <Label htmlFor="commitment">What's your specific, measurable goal?</Label>
          <Textarea
            id="commitment"
            placeholder="Example: Launch my MVP landing page with 3 user testimonials and 100 email signups by the target date"
            value={commitmentText}
            onChange={(e) => setCommitmentText(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {commitmentText.length}/500 characters (minimum 20)
          </p>
        </div>

        {/* Target Date */}
        <div className="space-y-2">
          <Label>Target Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !targetDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {targetDate ? format(targetDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={targetDate}
                onSelect={(date) => date && setTargetDate(date)}
                disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            Must be between 1-30 days from now
          </p>
        </div>

        {/* Credit Stake */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Credit Stake</Label>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-lg font-bold">{creditsStaked[0]}</span>
              <span className="text-xs text-muted-foreground">/ {balance} available</span>
            </div>
          </div>
          <Slider
            value={creditsStaked}
            onValueChange={setCreditsStaked}
            min={3}
            max={maxStake}
            step={1}
            className="w-full"
          />
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3" />
                Potential Return
              </div>
              <div className="text-lg font-bold text-green-500">+{potentialReturn}</div>
              <div className="text-xs text-muted-foreground">+{Math.floor((potentialReturn - creditsStaked[0]) / creditsStaked[0] * 100)}% bonus</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="w-3 h-3" />
                Risk
              </div>
              <div className="text-lg font-bold text-red-500">-{potentialLoss}</div>
              <div className="text-xs text-muted-foreground">if failed</div>
            </div>
          </div>
        </div>

        {/* Verification Method */}
        <div className="space-y-3">
          <Label>How will you verify achievement?</Label>
          <RadioGroup value={verificationMethod} onValueChange={(value: any) => setVerificationMethod(value)}>
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:border-primary/50 transition-colors">
              <RadioGroupItem value="self_report" id="self_report" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="self_report" className="cursor-pointer flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Self-Report
                </Label>
                <p className="text-xs text-muted-foreground">
                  Submit proof yourself (24hr challenge period)
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:border-primary/50 transition-colors">
              <RadioGroupItem value="peer_verified" id="peer_verified" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="peer_verified" className="cursor-pointer flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Peer-Verified
                </Label>
                <p className="text-xs text-muted-foreground">
                  Requires 3 community verifications (highest credibility)
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:border-primary/50 transition-colors">
              <RadioGroupItem value="checkin_based" id="checkin_based" />
              <div className="flex-1 space-y-1">
                <Label htmlFor="checkin_based" className="cursor-pointer flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Check-in Based
                </Label>
                <p className="text-xs text-muted-foreground">
                  Based on daily check-in progress tracking
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Public Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <div className="space-y-0.5">
            <Label htmlFor="public-toggle">Make Public</Label>
            <p className="text-xs text-muted-foreground">
              Share with community for accountability & support
            </p>
          </div>
          <Switch
            id="public-toggle"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            className="flex-1"
            disabled={!isValidCommitment() || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : `Stake ${creditsStaked[0]} Credits`}
          </Button>
        </div>

        {balance < 3 && (
          <p className="text-sm text-red-500 text-center">
            Insufficient credits. Minimum stake is 3 credits.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CommitmentCreator;