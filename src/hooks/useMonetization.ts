import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type MonetizationSummary = {
  totalEarningsThisMonth: number;
  tipsReceived: number;
  paidContentEarnings: number;
  availableBalance: number;
};

export type MonetizationItem = {
  id: string;
  type: 'tip' | 'event' | 'content' | 'payout';
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'completed' | 'processing' | 'cancelled' | 'refunded';
  created_at: string;
  note?: string | null;
};

export type MonetizationFilters = {
  period: '30d' | '90d' | 'all';
  contentType?: 'event' | 'content' | 'tip' | 'all';
};

export function useMonetization(filters: MonetizationFilters = { period: '30d', contentType: 'all' }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<MonetizationSummary>({
    totalEarningsThisMonth: 0,
    tipsReceived: 0,
    paidContentEarnings: 0,
    availableBalance: 0,
  });
  const [items, setItems] = useState<MonetizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateFrom = useMemo(() => {
    if (filters.period === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    if (filters.period === '90d') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      return d.toISOString();
    }
    return undefined;
  }, [filters.period]);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simplified - return empty data for now as these tables don't exist yet
      const tipsData: any[] = [];
      const eventsData: any[] = [];
      const contentData: any[] = [];
      const payoutsData: any[] = [];

      // Calculate amounts (only completed items for earnings)
      const tipAmount = tipsData.filter((t: any) => t.status === 'completed').reduce((acc, t: any) => acc + (t.amount_cents || 0), 0) / 100;
      const eventAmount = eventsData.filter((e: any) => e.status === 'completed').reduce((acc, e: any) => acc + (e.revenue_cents || 0), 0) / 100;
      const contentAmount = contentData.filter((c: any) => c.status === 'completed').reduce((acc, c: any) => acc + (c.amount_cents || 0), 0) / 100;
      const payoutAmount = payoutsData.filter((p: any) => ['pending', 'processing', 'completed'].includes(p.status)).reduce((acc, p: any) => acc + (p.amount_cents || 0), 0) / 100;

      const available = Math.max(0, tipAmount + eventAmount + contentAmount - payoutAmount);

      // Calculate this month's earnings
      const month = new Date().toISOString().slice(0, 7);
      const monthFilter = (d: string) => d.startsWith(month);
      const monthTips = tipsData.filter((t: any) => monthFilter((t.created_at || '').slice(0, 7)) && t.status === 'completed').reduce((a: number, t: any) => a + (t.amount_cents || 0), 0) / 100;
      const monthEvents = eventsData.filter((e: any) => monthFilter((e.created_at || '').slice(0, 7)) && e.status === 'completed').reduce((a: number, e: any) => a + (e.revenue_cents || 0), 0) / 100;
      const monthContent = contentData.filter((c: any) => monthFilter((c.created_at || '').slice(0, 7)) && c.status === 'completed').reduce((a: number, c: any) => a + (c.amount_cents || 0), 0) / 100;

      // Combine and sort items
      const combined: MonetizationItem[] = [
        ...(tipsData.map((t: any) => ({ 
          id: t.id, 
          type: 'tip' as const, 
          amount: (t.amount_cents || 0) / 100, 
          status: (t.status || 'pending') as MonetizationItem['status'], 
          created_at: t.created_at, 
          note: t.note 
        }))),
        ...(eventsData.map((e: any) => ({ 
          id: e.id, 
          type: 'event' as const, 
          amount: (e.revenue_cents || 0) / 100, 
          status: (e.status || 'draft') as MonetizationItem['status'], 
          created_at: e.created_at, 
          note: e.title 
        }))),
        ...(contentData.map((c: any) => ({ 
          id: c.id, 
          type: 'content' as const, 
          amount: (c.amount_cents || 0) / 100, 
          status: (c.status || 'pending') as MonetizationItem['status'], 
          created_at: c.created_at, 
          note: c.content_title 
        }))),
        ...(payoutsData.map((p: any) => ({ 
          id: p.id, 
          type: 'payout' as const, 
          amount: (p.amount_cents || 0) / 100, 
          status: (p.status || 'pending') as MonetizationItem['status'], 
          created_at: p.created_at 
        }))),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setSummary({
        totalEarningsThisMonth: monthTips + monthEvents + monthContent,
        tipsReceived: tipAmount,
        paidContentEarnings: eventAmount + contentAmount,
        availableBalance: available,
      });
      setItems(combined);
    } catch (e: any) {
      console.error('Monetization data fetch error:', e);
      setError(e?.message || 'Failed to load monetization data');
      setSummary({ totalEarningsThisMonth: 0, tipsReceived: 0, paidContentEarnings: 0, availableBalance: 0 });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user, dateFrom]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channels: RealtimeChannel[] = [];

    // Tips subscription
    const tipsChannel = supabase
      .channel(`tips-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tips',
        filter: `to_user_id=eq.${user.id}`,
      }, () => {
        loadData();
      })
      .subscribe();

    channels.push(tipsChannel);

    // Events subscription
    const eventsChannel = supabase
      .channel(`events-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'paid_events',
        filter: `host_user_id=eq.${user.id}`,
      }, () => {
        loadData();
      })
      .subscribe();

    channels.push(eventsChannel);

    // Content subscription
    const contentChannel = supabase
      .channel(`content-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'premium_content_sales',
        filter: `creator_user_id=eq.${user.id}`,
      }, () => {
        loadData();
      })
      .subscribe();

    channels.push(contentChannel);

    // Payouts subscription
    const payoutsChannel = supabase
      .channel(`payouts-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payouts',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        loadData();
      })
      .subscribe();

    channels.push(payoutsChannel);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, loadData]);

  return { summary, items, loading, error, refresh: loadData };
}


