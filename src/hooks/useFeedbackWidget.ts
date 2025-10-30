import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safe } from '@/integrations/supabase/safe';
import { useToast } from '@/hooks/use-toast';

export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other';

interface FeedbackData {
  feedbackType: FeedbackType;
  rating?: number;
  message: string;
  screenshot?: string;
}

export const useFeedbackWidget = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitFeedback = async (data: FeedbackData) => {
    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id || null;

      // Get browser info
      const browserInfo = {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        language: navigator.language,
        referrer: document.referrer,
      };

      const { error } = await safe.insert(() =>
        supabase.from('page_feedback').insert({
          user_id: userId,
          page_path: window.location.pathname,
          page_title: document.title,
          feedback_type: data.feedbackType,
          rating: data.rating,
          message: data.message,
          browser_info: browserInfo,
          screenshot_url: data.screenshot,
        })
      );

      if (error) throw error;

      toast({
        title: 'Feedback submitted!',
        description: 'Thank you for helping us improve.',
      });

      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: 'Failed to submit feedback',
        description: 'Please try again later.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitFeedback,
    isSubmitting,
  };
};
