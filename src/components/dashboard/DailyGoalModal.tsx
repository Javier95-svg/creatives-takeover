import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Flame, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ModalMode = 'morning' | 'evening';

interface DailyGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStreak: number;
  onCheckInComplete?: () => void;
  mode?: ModalMode;
  todaysCheckInId?: string;
}

export const DailyGoalModal = ({ 
  open, 
  onOpenChange, 
  currentStreak, 
  onCheckInComplete,
  mode = 'morning',
  todaysCheckInId 
}: DailyGoalModalProps) => {
  const { user } = useAuth();
  const [goal, setGoal] = useState('');
  const [goalAchieved, setGoalAchieved] = useState<boolean | null>(null);
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatBlockedYou, setWhatBlockedYou] = useState('');
  const [energyLevelEnd, setEnergyLevelEnd] = useState<number>(3);
  const [tomorrowFocus, setTomorrowFocus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (mode === 'morning' && !goal.trim()) return;
    if (mode === 'evening' && goalAchieved === null) return;
    if (!user) return;

    setIsSubmitting(true);
    try {
      if (mode === 'morning') {
        // Morning: Create new check-in
        const newStreak = currentStreak + 1;

        const { error } = await supabase
          .from('daily_check_ins')
          .insert({
            user_id: user.id,
            sprint_id: '00000000-0000-0000-0000-000000000000',
            check_in_date: new Date().toISOString().split('T')[0],
            progress_summary: goal.trim(),
            streak_count: newStreak,
            completed_tasks: [],
            mood_rating: 5,
            energy_level: 5
          });

        if (error) throw error;
        toast.success(`✨ Goal set! Streak: ${newStreak} day${newStreak > 1 ? 's' : ''}! 🔥`);
      } else {
        // Evening: Update existing check-in with reflection
        if (!todaysCheckInId) {
          toast.error('No check-in found for today');
          return;
        }

        const { error } = await supabase
          .from('daily_check_ins')
          .update({
            goal_achieved: goalAchieved,
            what_went_well: whatWentWell.trim() || null,
            what_blocked_you: whatBlockedYou.trim() || null,
            energy_level_end: energyLevelEnd,
            tomorrow_focus: tomorrowFocus.trim() || null,
          })
          .eq('id', todaysCheckInId);

        if (error) throw error;

        const message = goalAchieved 
          ? '🎉 Awesome! Goal achieved!' 
          : '💪 That\'s okay! Progress over perfection!';
        toast.success(message);
      }

      onOpenChange(false);
      setGoal('');
      setGoalAchieved(null);
      setWhatWentWell('');
      setWhatBlockedYou('');
      setEnergyLevelEnd(3);
      setTomorrowFocus('');
      onCheckInComplete?.();
    } catch (error: any) {
      console.error('Error saving check-in:', error);
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMorning = mode === 'morning';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <span>
              {isMorning ? "What's one thing you'll do today?" : 'How did today go?'}
            </span>
            {isMorning && currentStreak > 0 && (
              <div className="flex items-center gap-1 text-orange-500">
                <Flame className="w-5 h-5" />
                <span className="text-lg font-bold">{currentStreak}</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isMorning ? (
            <>
              <p className="text-sm text-muted-foreground">
                Set a clear, achievable goal for today. Keep your momentum going! 🚀
              </p>

              <Textarea
                placeholder="Example: Finalize my pricing strategy and create a comparison chart"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="min-h-[100px]"
                autoFocus
              />
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Take a moment to reflect on your day. Honest reflection helps you grow! 💭
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Did you achieve your goal today?</Label>
                  <RadioGroup
                    value={goalAchieved === null ? '' : goalAchieved.toString()}
                    onValueChange={(value) => setGoalAchieved(value === 'true')}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="yes" />
                      <Label htmlFor="yes" className="cursor-pointer flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Yes, I did it!
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="no" />
                      <Label htmlFor="no" className="cursor-pointer flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-orange-500" />
                        Not quite, but I tried
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="went-well">What went well? (Optional)</Label>
                  <Textarea
                    id="went-well"
                    placeholder="Small wins count! What are you proud of today?"
                    value={whatWentWell}
                    onChange={(e) => setWhatWentWell(e.target.value)}
                    className="min-h-[70px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blocked">What blocked you? (Optional)</Label>
                  <Textarea
                    id="blocked"
                    placeholder="Technical issues, distractions, unclear requirements..."
                    value={whatBlockedYou}
                    onChange={(e) => setWhatBlockedYou(e.target.value)}
                    className="min-h-[70px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Energy level at end of day</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setEnergyLevelEnd(level)}
                        className={`flex-1 py-2 px-3 rounded-lg border-2 transition-colors ${
                          energyLevelEnd === level
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-muted hover:border-muted-foreground/30'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    1 = Exhausted • 5 = Energized
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tomorrow">Tomorrow's focus (Optional)</Label>
                  <Textarea
                    id="tomorrow"
                    placeholder="What's the one thing you want to accomplish tomorrow?"
                    value={tomorrowFocus}
                    onChange={(e) => setTomorrowFocus(e.target.value)}
                    className="min-h-[70px]"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {isMorning ? 'Skip Today' : 'Skip Reflection'}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                (isMorning && !goal.trim()) ||
                (!isMorning && goalAchieved === null) ||
                isSubmitting
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isMorning ? (
                'Set My Goal'
              ) : (
                'Save Reflection'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
