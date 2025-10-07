import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Flame, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DailyGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStreak: number;
  onCheckInComplete?: () => void;
}

export const DailyGoalModal = ({ open, onOpenChange, currentStreak, onCheckInComplete }: DailyGoalModalProps) => {
  const { user } = useAuth();
  const [goal, setGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!goal.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // Calculate new streak
      const newStreak = currentStreak + 1;

      // Insert check-in without sprint_id (general daily goal)
      const { error } = await supabase
        .from('daily_check_ins')
        .insert({
          user_id: user.id,
          sprint_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID for general check-ins
          check_in_date: new Date().toISOString().split('T')[0],
          progress_summary: goal.trim(),
          streak_count: newStreak,
          completed_tasks: [],
          mood_rating: 5,
          energy_level: 5
        });

      if (error) throw error;

      toast.success(`✨ Goal set! Streak: ${newStreak} day${newStreak > 1 ? 's' : ''}! 🔥`);
      onOpenChange(false);
      onCheckInComplete?.();
    } catch (error: any) {
      console.error('Error saving daily goal:', error);
      toast.error('Failed to save goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <span>What's one thing you'll do today?</span>
            {currentStreak > 0 && (
              <div className="flex items-center gap-1 text-orange-500">
                <Flame className="w-5 h-5" />
                <span className="text-lg font-bold">{currentStreak}</span>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Skip Today
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!goal.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Set My Goal"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
