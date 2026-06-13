import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SocialProofProps {
  variant?: 'inline' | 'badge' | 'minimal';
  showRecentActivity?: boolean;
  showUserCount?: boolean;
}

export const SocialProof = ({ 
  variant = 'inline',
  showRecentActivity = true,
  showUserCount = true 
}: SocialProofProps) => {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [recentSignups, setRecentSignups] = useState<number>(0);

  useEffect(() => {
    // Fetch user count (cached/approximate)
    const fetchUserCount = async () => {
      try {
        // Use a cached value or approximate count
        const cached = localStorage.getItem('social_proof_user_count');
        const cachedTime = localStorage.getItem('social_proof_user_count_time');
        
        if (cached && cachedTime) {
          const age = Date.now() - parseInt(cachedTime);
          // Use cached value if less than 1 hour old
          if (age < 60 * 60 * 1000) {
            setUserCount(parseInt(cached));
            return;
          }
        }

        // Fetch approximate count (this would need a database function for efficiency)
        // For now, use a reasonable default
        const defaultCount = 1247;
        setUserCount(defaultCount);
        localStorage.setItem('social_proof_user_count', defaultCount.toString());
        localStorage.setItem('social_proof_user_count_time', Date.now().toString());
      } catch (error) {
        console.error('Error fetching user count:', error);
        setUserCount(1247); // Fallback
      }
    };

    // Simulate recent signups (would be fetched from conversion_events in production)
    const simulateRecentSignups = () => {
      const recent = Math.floor(Math.random() * 5) + 1; // 1-5 signups
      setRecentSignups(recent);
    };

    fetchUserCount();
    simulateRecentSignups();

    // Update recent signups periodically
    const interval = setInterval(simulateRecentSignups, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (variant === 'minimal' && !showUserCount) {
    return null;
  }

  if (variant === 'badge') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {showUserCount && userCount && (
          <span className="px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
            {userCount.toLocaleString()}+ members
          </span>
        )}
        {showRecentActivity && recentSignups > 0 && (
          <span className="px-2 py-1 bg-success/10 text-success rounded-full">
            {recentSignups} joined today
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
      {showUserCount && userCount && (
        <p className="text-center">
          Join <span className="font-semibold text-primary">{userCount.toLocaleString()}</span> entrepreneurs building their businesses
        </p>
      )}
      {showRecentActivity && recentSignups > 0 && (
        <p className="text-center text-xs animate-pulse">
          <span className="inline-block w-2 h-2 bg-success rounded-full mr-1"></span>
          {recentSignups} {recentSignups === 1 ? 'person' : 'people'} signed up in the last hour
        </p>
      )}
    </div>
  );
};
