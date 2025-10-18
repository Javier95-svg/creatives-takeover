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
  const [reflectionNote, setReflectionNote] = useState('');
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
            reflection_note: reflectionNote.trim() || null,
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
      setReflectionNote('');
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
                    className="min-h-[80px]"
                  />
                </div>

                {goalAchieved === false && (
                  <div className="space-y-2">
                    <Label htmlFor="reflection">What got in the way? (Optional)</Label>
                    <Textarea
                      id="reflection"
                      placeholder="Understanding obstacles helps you plan better tomorrow"
                      value={reflectionNote}
                      onChange={(e) => setReflectionNote(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                )}
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
