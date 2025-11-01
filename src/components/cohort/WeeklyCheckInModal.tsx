import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Target, HelpCircle, X } from 'lucide-react';
import { toast } from 'sonner';

interface WeeklyCheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekNumber: number;
  onSubmit: (data: {
    wins: string[];
    blockers: string[];
    nextWeekGoals: string[];
    helpNeeded?: string;
    sharePublicly: boolean;
  }) => Promise<boolean>;
}

export const WeeklyCheckInModal = ({ open, onOpenChange, weekNumber, onSubmit }: WeeklyCheckInModalProps) => {
  const [wins, setWins] = useState<string[]>(['']);
  const [blockers, setBlockers] = useState<string[]>(['']);
  const [nextWeekGoals, setNextWeekGoals] = useState<string[]>(['']);
  const [helpNeeded, setHelpNeeded] = useState('');
  const [sharePublicly, setSharePublicly] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleAddField = (type: 'wins' | 'blockers' | 'goals') => {
    if (type === 'wins') setWins([...wins, '']);
    if (type === 'blockers') setBlockers([...blockers, '']);
    if (type === 'goals') setNextWeekGoals([...nextWeekGoals, '']);
  };

  const handleRemoveField = (type: 'wins' | 'blockers' | 'goals', index: number) => {
    if (type === 'wins') setWins(wins.filter((_, i) => i !== index));
    if (type === 'blockers') setBlockers(blockers.filter((_, i) => i !== index));
    if (type === 'goals') setNextWeekGoals(nextWeekGoals.filter((_, i) => i !== index));
  };

  const handleUpdateField = (type: 'wins' | 'blockers' | 'goals', index: number, value: string) => {
    if (type === 'wins') {
      const updated = [...wins];
      updated[index] = value;
      setWins(updated);
    }
    if (type === 'blockers') {
      const updated = [...blockers];
      updated[index] = value;
      setBlockers(updated);
    }
    if (type === 'goals') {
      const updated = [...nextWeekGoals];
      updated[index] = value;
      setNextWeekGoals(updated);
    }
  };

  const handleSubmit = async () => {
    const filteredWins = wins.filter(w => w.trim());
    const filteredBlockers = blockers.filter(b => b.trim());
    const filteredGoals = nextWeekGoals.filter(g => g.trim());

    if (filteredWins.length === 0) {
      toast.error('Please add at least one win from this week');
      return;
    }

    setSubmitting(true);
    const success = await onSubmit({
      wins: filteredWins,
      blockers: filteredBlockers,
      nextWeekGoals: filteredGoals,
      helpNeeded: helpNeeded.trim() || undefined,
      sharePublicly,
    });

    setSubmitting(false);

    if (success) {
      onOpenChange(false);
      // Reset form
      setWins(['']);
      setBlockers(['']);
      setNextWeekGoals(['']);
      setHelpNeeded('');
      setSharePublicly(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Week {weekNumber} Check-In
            <Badge variant="secondary">Weekly Review</Badge>
          </DialogTitle>
          <DialogDescription>
            Share your progress, challenges, and goals with your cohort
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Wins */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                This Week's Wins 🎉
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddField('wins')}
              >
                Add Win
              </Button>
            </div>
            {wins.map((win, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={win}
                  onChange={(e) => handleUpdateField('wins', index, e.target.value)}
                  placeholder="E.g., Got my first customer interview!"
                />
                {wins.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveField('wins', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Blockers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Blockers & Challenges
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddField('blockers')}
              >
                Add Blocker
              </Button>
            </div>
            {blockers.map((blocker, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={blocker}
                  onChange={(e) => handleUpdateField('blockers', index, e.target.value)}
                  placeholder="E.g., Struggling with pricing strategy"
                />
                {blockers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveField('blockers', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Next Week Goals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-blue-500" />
                Next Week's Goals
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddField('goals')}
              >
                Add Goal
              </Button>
            </div>
            {nextWeekGoals.map((goal, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={goal}
                  onChange={(e) => handleUpdateField('goals', index, e.target.value)}
                  placeholder="E.g., Complete MVP feature set"
                />
                {nextWeekGoals.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveField('goals', index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Help Needed */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base">
              <HelpCircle className="h-4 w-4 text-purple-500" />
              How Can The Community Help? (Optional)
            </Label>
            <Textarea
              value={helpNeeded}
              onChange={(e) => setHelpNeeded(e.target.value)}
              placeholder="E.g., Looking for intros to SaaS founders, feedback on landing page, advice on go-to-market strategy..."
              rows={3}
            />
          </div>

          {/* Share Publicly */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="share-public">Share with Community</Label>
              <p className="text-xs text-muted-foreground">
                Let other founders see your progress and offer support
              </p>
            </div>
            <Switch
              id="share-public"
              checked={sharePublicly}
              onCheckedChange={setSharePublicly}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Check-In'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
