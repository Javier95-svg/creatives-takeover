import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface QuickWinButtonProps {
  onWinAdded?: () => void;
}

export const QuickWinButton = ({ onWinAdded }: QuickWinButtonProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [winText, setWinText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const triggerConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  const handleSubmit = async () => {
    if (!winText.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('daily_wins')
        .insert({
          user_id: user.id,
          win_text: winText.trim(),
        });

      if (error) throw error;

      triggerConfetti();
      toast.success('🎉 Win captured! You\'re crushing it!');
      setOpen(false);
      setWinText('');
      onWinAdded?.();
    } catch (error: unknown) {
      console.error('Error saving win:', error);
      toast.error('Failed to save win. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-16 px-6 shadow-2xl hover:shadow-xl hover:scale-105 transition-all z-50 rounded-full bg-gradient-to-r from-primary to-primary/80"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        <span className="font-semibold">Add a Win</span>
      </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                What's Your Win?
              </DialogTitle>
              <DialogDescription>
                Log a small or large win so it shows up in your momentum tracking on the dashboard.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Celebrate your progress! No win is too small. 🎉
            </p>

            <Textarea
              placeholder="Example: Finished my logo design! / Got my first customer email / Shipped my landing page"
              value={winText}
              onChange={(e) => setWinText(e.target.value)}
              className="min-h-[100px]"
              autoFocus
            />

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setWinText('');
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!winText.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Celebrate!
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
