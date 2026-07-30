import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { captureEvent } from '@/lib/analytics';

interface OnboardingChecklistProps {
  userId: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    github?: string;
    website?: string;
  };
}

export const OnboardingChecklist = ({
  userId,
  fullName,
  bio,
  avatarUrl,
  socialLinks,
}: OnboardingChecklistProps) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [hasVisitedDashboard, setHasVisitedDashboard] = useState(false);

  // Check if user has visited dashboard (based on first_login_at in profiles)
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('first_login_at')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data?.first_login_at) setHasVisitedDashboard(true);
      });
  }, [userId]);

  // Calculate completion status
  const checklistItems = [
    {
      id: 'profile-picture',
      label: 'Upload Profile Picture',
      description: 'Add a professional photo',
      completed: avatarUrl && avatarUrl.trim().length > 0,
    },
    {
      id: 'full-name',
      label: 'Add Your Full Name',
      description: 'Let people know who you are',
      completed: fullName && fullName.trim().length > 0,
    },
    {
      id: 'bio',
      label: 'Write Your Bio',
      description: 'Tell your story',
      completed: bio && bio.trim().length > 0,
    },
    {
      id: 'social-link',
      label: 'Connect Social Profile',
      description: 'Link at least one social account',
      completed: Object.values(socialLinks).some((link) => link && link.trim().length > 0),
    },
    {
      id: 'visit-dashboard',
      label: 'Explore Your Dashboard',
      description: 'See what Creatives Takeover offers',
      completed: hasVisitedDashboard,
    },
  ];

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const totalCount = checklistItems.length;
  const allCompleted = completedCount === totalCount;

  // Auto-complete onboarding when all items are done
  useEffect(() => {
    const completeProfileChecklist = async () => {
      if (allCompleted) {
        try {
          await supabase
            .from('profiles')
            .update({ profile_checklist_completed_at: new Date().toISOString() } as never)
            .eq('id', userId);

          captureEvent('profile_checklist_completed', {
            completed_count: completedCount,
            total_count: totalCount,
          });

          // Show celebration
          void confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });

          toast.success('Profile checklist complete.');

          // Hide checklist after a short delay
          setTimeout(() => {
            setIsVisible(false);
          }, 3000);
        } catch (error) {
          console.error('Error completing profile checklist:', error);
        }
      }
    };

    void completeProfileChecklist();
  }, [allCompleted, completedCount, totalCount, userId]);

  const handleDismiss = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ profile_checklist_dismissed_at: new Date().toISOString() } as never)
        .eq('id', userId);

      captureEvent('profile_checklist_dismissed', {
        completed_count: completedCount,
        total_count: totalCount,
      });
      setIsVisible(false);
      toast.info('You can always complete your profile later from Account settings');
    } catch (error) {
      console.error('Error dismissing profile checklist:', error);
    }
  };

  const handleVisitDashboard = () => {
    setHasVisitedDashboard(true);
    navigate('/dashboard');
  };

  // Don't show if dismissed or completed
  if (!isVisible) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-sm relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-info rounded-full blur-3xl" />
      </div>

      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="relative z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          <CardTitle className="text-xl">Welcome to Creatives Takeover! 🎉</CardTitle>
        </div>
        <CardDescription className="text-base">
          Complete these steps to get the most out of your experience
        </CardDescription>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-background/50">
          <span className="text-sm font-medium">Your Progress</span>
          <span className="text-lg font-bold text-primary">
            {completedCount}/{totalCount}
          </span>
        </div>

        {/* Checklist items */}
        <div className="space-y-3">
          {checklistItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                item.completed
                  ? 'bg-success/10 border border-success/20'
                  : 'bg-background/30 border border-border/50 hover:border-primary/30'
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`font-medium ${
                    item.completed ? 'text-foreground' : 'text-foreground/80'
                  }`}
                >
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action */}
        {!hasVisitedDashboard && (
          <div className="pt-4">
            <Button
              onClick={handleVisitDashboard}
              className="w-full bg-gradient-to-r from-info to-purple-600 hover:from-info hover:to-purple-700"
            >
              Explore Your Dashboard →
            </Button>
          </div>
        )}

        {allCompleted && (
          <div className="pt-4 text-center">
            <p className="text-sm text-success font-medium animate-pulse">
              ✨ Congratulations! You're all set up! ✨
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
