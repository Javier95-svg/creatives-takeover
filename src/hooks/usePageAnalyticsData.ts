import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export interface AnalyticsEvent {
  id: string;
  created_at: string;
  user_id: string | null;
  session_id: string;
  page_path: string;
  page_title: string;
  event_type: string;
  event_data: any;
  referrer: string | null;
  user_agent: string;
  time_spent: number;
}

export const useAnalyticsOverview = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ["analytics-overview", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_analytics")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;

      const events = data as AnalyticsEvent[];
      
      // Calculate metrics
      const totalPageViews = events.filter(e => e.event_type === 'page_view').length;
      const uniqueVisitors = new Set(events.map(e => e.session_id)).size;
      const totalClicks = events.filter(e => e.event_type === 'click').length;
      const exitIntents = events.filter(e => e.event_type === 'exit_intent').length;
      
      // Average time on page
      const timeEvents = events.filter(e => e.event_type === 'time_on_page' && e.time_spent > 0);
      const avgTimeOnPage = timeEvents.length > 0
        ? timeEvents.reduce((acc, e) => acc + e.time_spent, 0) / timeEvents.length
        : 0;

      // Top CTA
      const clickEvents = events.filter(e => e.event_type === 'click');
      const ctaCounts: Record<string, number> = {};
      clickEvents.forEach(e => {
        const ctaName = e.event_data?.cta_name || 'Unknown';
        ctaCounts[ctaName] = (ctaCounts[ctaName] || 0) + 1;
      });
      const topCTA = Object.entries(ctaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      // Bounce rate (exit intent / page views)
      const bounceRate = totalPageViews > 0 ? (exitIntents / totalPageViews) * 100 : 0;

      return {
        totalPageViews,
        uniqueVisitors,
        totalClicks,
        avgTimeOnPage: Math.round(avgTimeOnPage),
        topCTA,
        bounceRate: bounceRate.toFixed(1),
      };
    },
  });
};

export const usePageViewsOverTime = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ["page-views-over-time", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_analytics")
        .select("created_at")
        .eq("event_type", "page_view")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at");

      if (error) throw error;

      // Group by day
      const dailyCounts: Record<string, number> = {};
      data.forEach(event => {
        const day = format(new Date(event.created_at), "MMM dd");
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      });

      return Object.entries(dailyCounts).map(([date, views]) => ({
        date,
        views,
      }));
    },
  });
};

export const useTopPages = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ["top-pages", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_analytics")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;

      const events = data as AnalyticsEvent[];
      const pageStats: Record<string, {
        views: number;
        uniqueVisitors: Set<string>;
        totalTime: number;
        timeCount: number;
        scrolls: number;
        exits: number;
      }> = {};

      events.forEach(event => {
        if (!pageStats[event.page_path]) {
          pageStats[event.page_path] = {
            views: 0,
            uniqueVisitors: new Set(),
            totalTime: 0,
            timeCount: 0,
            scrolls: 0,
            exits: 0,
          };
        }

        const stats = pageStats[event.page_path];
        
        if (event.event_type === 'page_view') {
          stats.views++;
          stats.uniqueVisitors.add(event.session_id);
        } else if (event.event_type === 'time_on_page') {
          stats.totalTime += event.time_spent;
          stats.timeCount++;
        } else if (event.event_type === 'scroll') {
          stats.scrolls++;
        } else if (event.event_type === 'exit_intent') {
          stats.exits++;
        }
      });

      return Object.entries(pageStats)
        .map(([path, stats]) => ({
          page: path,
          views: stats.views,
          uniqueVisitors: stats.uniqueVisitors.size,
          avgTime: stats.timeCount > 0 ? Math.round(stats.totalTime / stats.timeCount) : 0,
          exitRate: stats.views > 0 ? ((stats.exits / stats.views) * 100).toFixed(1) : '0',
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
    },
  });
};

export const useCTAPerformance = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ["cta-performance", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_analytics")
        .select("*")
        .eq("event_type", "click")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;

      const ctaStats: Record<string, {
        clicks: number;
        uniqueClickers: Set<string>;
        locations: Set<string>;
      }> = {};

      data.forEach(event => {
        const eventData = event.event_data as any;
        const ctaName = eventData?.cta_name || 'Unknown';
        const location = eventData?.cta_location || 'Unknown';

        if (!ctaStats[ctaName]) {
          ctaStats[ctaName] = {
            clicks: 0,
            uniqueClickers: new Set(),
            locations: new Set(),
          };
        }

        ctaStats[ctaName].clicks++;
        ctaStats[ctaName].uniqueClickers.add(event.session_id);
        ctaStats[ctaName].locations.add(location);
      });

      return Object.entries(ctaStats)
        .map(([name, stats]) => ({
          ctaName: name,
          clicks: stats.clicks,
          uniqueClickers: stats.uniqueClickers.size,
          locations: Array.from(stats.locations).join(', '),
        }))
        .sort((a, b) => b.clicks - a.clicks);
    },
  });
};

export const useScrollDepthStats = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ["scroll-depth", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_analytics")
        .select("event_data")
        .eq("event_type", "scroll")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;

      const depthCounts: Record<number, number> = { 25: 0, 50: 0, 75: 0, 100: 0 };
      
      data.forEach(event => {
        const eventData = event.event_data as any;
        const depth = eventData?.scroll_depth;
        if (depth && depthCounts[depth] !== undefined) {
          depthCounts[depth]++;
        }
      });

      return [
        { depth: '25%', count: depthCounts[25] },
        { depth: '50%', count: depthCounts[50] },
        { depth: '75%', count: depthCounts[75] },
        { depth: '100%', count: depthCounts[100] },
      ];
    },
  });
};

export const useRealTimeActivity = () => {
  return useQuery({
    queryKey: ["real-time-activity"],
    queryFn: async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const { data, error } = await supabase
        .from("page_analytics")
        .select("*")
        .gte("created_at", fiveMinutesAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return data as AnalyticsEvent[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
};

export const useReferrerStats = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ["referrer-stats", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_analytics")
        .select("referrer")
        .eq("event_type", "page_view")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;

      const referrerCounts: Record<string, number> = {};
      
      data.forEach(event => {
        const source = event.referrer 
          ? new URL(event.referrer).hostname 
          : 'Direct';
        referrerCounts[source] = (referrerCounts[source] || 0) + 1;
      });

      return Object.entries(referrerCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    },
  });
};
