import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, X, Trophy, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDailyChallenges } from "@/hooks/useDailyChallenges";

interface StreakNotificationBannerProps {
  onDismiss?: () => void;
}

const StreakNotificationBanner = ({ onDismiss }: StreakNotificationBannerProps) => {
  const { user } = useAuth();
  const { todaysChallenge, isCompleted } = useDailyChallenges(user?.id);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const checkStreak = async () => {
      if (!user) return;

      try {
        // Get current streak from daily check-ins
        const { data: checkIns } = await supabase
          .from('daily_check_ins')
          .select('streak_count, check_in_date')
          .eq('user_id', user.id)
          .order('check_in_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (checkIns) {
          setCurrentStreak(checkIns.streak_count || 0);
          
          const today = new Date().toISOString().split('T')[0];
          const checkInDate = new Date(checkIns.check_in_date).toISOString().split('T')[0];
          setHasCheckedIn(checkInDate === today);
        }
      } catch (error) {
        console.error('Error checking streak:', error);
      }
    };

    void checkStreak();
  }, [user]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  // Don't show if user has checked in and completed challenge
  if (!visible || (hasCheckedIn && isCompleted)) {
    return null;
  }

  // Show motivation based on status
  const getMotivation = () => {
    if (!hasCheckedIn && currentStreak > 0) {
      return {
        icon: <Flame className="w-5 h-5 text-warning" />,
        title: "Don't break your streak!",
        message: `You're on a ${currentStreak} day streak. Check in today to keep it going!`,
        color: "border-warning/50 bg-warning/5"
      };
    }
    
    if (!isCompleted && todaysChallenge) {
      return {
        icon: <Trophy className="w-5 h-5 text-warning" />,
        title: "Today's challenge awaits!",
        message: `Complete today's challenge to earn ${todaysChallenge.reward_points} bonus points.`,
        color: "border-warning/50 bg-warning/5"
      };
    }

    if (currentStreak === 0) {
      return {
        icon: <Sparkles className="w-5 h-5 text-info" />,
        title: "Start your journey!",
        message: "Post or engage today to start building your community streak.",
        color: "border-info/50 bg-info/5"
      };
    }

    return null;
  };

  const motivation = getMotivation();
  
  if (!motivation) return null;

  return (
    <Card className={`relative border-2 ${motivation.color} mb-6 animate-fade-in`}>
      <div className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {motivation.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-1">{motivation.title}</h3>
          <p className="text-sm text-muted-foreground">{motivation.message}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {currentStreak > 0 && (
        <div className="px-4 pb-3 flex items-center gap-2 text-xs">
          <Flame className="w-4 h-4 text-warning" />
          <span className="font-semibold">{currentStreak} day streak</span>
          {currentStreak >= 7 && (
            <span className="text-muted-foreground">• You're on fire! 🔥</span>
          )}
        </div>
      )}
    </Card>
  );
};

export default StreakNotificationBanner;
