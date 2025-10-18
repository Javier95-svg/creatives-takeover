import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeedbackResponse {
  id: string;
  created_at: string;
  user_id: string | null;
  email: string | null;
  user_role: string;
  website_ux_rating: number;
  selected_features: string[];
  pricing_perception: string;
  suggested_price: number | null;
  improvement_suggestion: string | null;
  credit_bonus_earned: number;
}

export const useFeedbackData = () => {
  return useQuery({
    queryKey: ["feedback-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FeedbackResponse[];
    },
  });
};

export const useFeedbackStats = () => {
  return useQuery({
    queryKey: ["feedback-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_feedback")
        .select("*");

      if (error) throw error;

      const responses = data as FeedbackResponse[];
      const totalResponses = responses.length;
      const avgRating = responses.reduce((acc, r) => acc + r.website_ux_rating, 0) / totalResponses;
      
      // Count features
      const featureCounts: Record<string, number> = {};
      responses.forEach(r => {
        r.selected_features?.forEach(feature => {
          featureCounts[feature] = (featureCounts[feature] || 0) + 1;
        });
      });

      // Pricing perception distribution
      const pricingDistribution: Record<string, number> = {};
      responses.forEach(r => {
        pricingDistribution[r.pricing_perception] = (pricingDistribution[r.pricing_perception] || 0) + 1;
      });

      // Average suggested price
      const pricesWithValues = responses.filter(r => r.suggested_price !== null);
      const avgSuggestedPrice = pricesWithValues.length > 0
        ? pricesWithValues.reduce((acc, r) => acc + (r.suggested_price || 0), 0) / pricesWithValues.length
        : 0;

      return {
        totalResponses,
        avgRating: avgRating.toFixed(2),
        featureCounts,
        pricingDistribution,
        avgSuggestedPrice: avgSuggestedPrice.toFixed(2),
      };
    },
  });
};
