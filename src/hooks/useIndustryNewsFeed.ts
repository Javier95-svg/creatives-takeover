import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type IndustryNewsContentType = "all" | "funding" | "market_trend" | "regulation" | "competitor" | "general";

export interface IndustryNewsCard {
  id: string;
  headline: string;
  sourceName: string;
  publishedAt: string;
  summary: string;
  url: string;
  contentType: Exclude<IndustryNewsContentType, "all">;
}

interface IndustryNewsResponse {
  success: boolean;
  industry: string;
  contentType: IndustryNewsContentType;
  cached: boolean;
  articles: IndustryNewsCard[];
  error?: string;
}

export function useIndustryNewsFeed(industry: string, contentType: IndustryNewsContentType) {
  const normalizedIndustry = industry.trim();

  return useQuery({
    queryKey: ["industry-news-feed", normalizedIndustry.toLowerCase(), contentType],
    enabled: normalizedIndustry.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<IndustryNewsResponse>("industry-news-feed", {
        body: {
          industry: normalizedIndustry,
          contentType,
          pageSize: 12,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Industry news feed failed.");
      return data;
    },
  });
}
