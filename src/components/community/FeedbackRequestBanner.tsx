import { useEffect, useState } from 'react';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackRequestBannerProps {
  onFilterFeedback: () => void;
}

const FeedbackRequestBanner = ({ onFilterFeedback }: FeedbackRequestBannerProps) => {
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('community_posts')
        .select('*', { count: 'exact', head: true })
        .eq('feedback_requested', true)
        .eq('feedback_status', 'pending');
      
      setFeedbackCount(count || 0);
    };

    fetchCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('feedback-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_posts',
          filter: 'feedback_requested=eq.true'
        },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (feedbackCount === 0) return null;

  return (
    <Card className="p-4 mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {feedbackCount} {feedbackCount === 1 ? 'entrepreneur needs' : 'entrepreneurs need'} your feedback
            </h3>
            <p className="text-sm text-muted-foreground">
              Help fellow founders improve their business plans
            </p>
          </div>
        </div>
        <Button onClick={onFilterFeedback} variant="default" className="gap-2">
          Provide Feedback
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

export default FeedbackRequestBanner;
