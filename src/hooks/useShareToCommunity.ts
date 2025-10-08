import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ShareToCommunityData {
  conversationId?: string;
  reportType: 'conversation' | 'business_plan' | 'market_analysis' | 'financial_plan' | 'full_report';
  reportData: any;
  title: string;
  content: string;
  feedbackCategories: string[];
  isAnonymous: boolean;
  tags?: string[];
  location?: string;
}

export const useShareToCommunity = () => {
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const shareToCommunity = async (data: ShareToCommunityData) => {
    setIsSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to share to community",
          variant: "destructive",
        });
        return null;
      }

      // Call edge function to create the shared report and community post
      const { data: result, error } = await supabase.functions.invoke('share-chatbot-report', {
        body: {
          conversationId: data.conversationId,
          reportType: data.reportType,
          reportData: data.reportData,
          title: data.title,
          content: data.content,
          feedbackCategories: data.feedbackCategories,
          isAnonymous: data.isAnonymous,
          tags: data.tags || [],
          location: data.location,
        },
      });

      if (error) throw error;

      toast({
        title: "Shared successfully! 🎉",
        description: "Your report has been shared to the community",
      });

      return result;
    } catch (error: any) {
      console.error('Error sharing to community:', error);
      toast({
        title: "Failed to share",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSharing(false);
    }
  };

  const getSharedReports = async () => {
    try {
      const { data, error } = await supabase
        .from('chatbot_shared_reports')
        .select('*, community_posts(*)')
        .order('shared_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching shared reports:', error);
      return [];
    }
  };

  return {
    shareToCommunity,
    getSharedReports,
    isSharing,
  };
};
