import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  status: 'pending' | 'paid' | 'failed' | 'completed';
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
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        // Tips
        const tipsQuery = supabase
          .from('tips')
          .select('id, amount_cents, status, created_at, note')
          .eq('to_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (dateFrom) tipsQuery.gte('created_at', dateFrom);

        const { data: tipsData } = await tipsQuery;

        // Paid events/content (assuming a generic table name; handle absence gracefully)
        const eventsQuery = supabase
          .from('paid_events')
          .select('id, revenue_cents, status, created_at, title')
          .eq('host_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (dateFrom) eventsQuery.gte('created_at', dateFrom);
        const { data: eventsData } = await eventsQuery;

        const contentQuery = supabase
          .from('premium_content_sales')
          .select('id, amount_cents, status, created_at, content_title')
          .eq('creator_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (dateFrom) contentQuery.gte('created_at', dateFrom);
        const { data: contentData } = await contentQuery;

        const payoutsQuery = supabase
          .from('payouts')
          .select('id, amount_cents, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);
        if (dateFrom) payoutsQuery.gte('created_at', dateFrom);
        const { data: payoutsData } = await payoutsQuery;

        const tipAmount = (tipsData || []).reduce((acc, t: any) => acc + (t.amount_cents || 0), 0) / 100;
        const eventAmount = (eventsData || []).reduce((acc, e: any) => acc + (e.revenue_cents || 0), 0) / 100;
        const contentAmount = (contentData || []).reduce((acc, c: any) => acc + (c.amount_cents || 0), 0) / 100;

        const available = Math.max(0, tipAmount + eventAmount + contentAmount - ((payoutsData || []).reduce((acc, p: any) => acc + (p.amount_cents || 0), 0) / 100));

        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthFilter = (d: string) => d.startsWith(month);
        const monthTips = (tipsData || []).filter((t: any) => monthFilter((t.created_at || '').slice(0, 7))).reduce((a: number, t: any) => a + (t.amount_cents || 0), 0) / 100;
        const monthEvents = (eventsData || []).filter((e: any) => monthFilter((e.created_at || '').slice(0, 7))).reduce((a: number, e: any) => a + (e.revenue_cents || 0), 0) / 100;
        const monthContent = (contentData || []).filter((c: any) => monthFilter((c.created_at || '').slice(0, 7))).reduce((a: number, c: any) => a + (c.amount_cents || 0), 0) / 100;

        const combined: MonetizationItem[] = [
          ...((tipsData || []).map((t: any) => ({ id: t.id, type: 'tip' as const, amount: (t.amount_cents || 0) / 100, status: (t.status || 'completed'), created_at: t.created_at, note: t.note })) ),
          ...((eventsData || []).map((e: any) => ({ id: e.id, type: 'event' as const, amount: (e.revenue_cents || 0) / 100, status: (e.status || 'completed'), created_at: e.created_at, note: e.title })) ),
          ...((contentData || []).map((c: any) => ({ id: c.id, type: 'content' as const, amount: (c.amount_cents || 0) / 100, status: (c.status || 'completed'), created_at: c.created_at, note: c.content_title })) ),
          ...((payoutsData || []).map((p: any) => ({ id: p.id, type: 'payout' as const, amount: (p.amount_cents || 0) / 100, status: (p.status || 'completed'), created_at: p.created_at })) ),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (!isMounted) return;
        setSummary({
          totalEarningsThisMonth: monthTips + monthEvents + monthContent,
          tipsReceived: tipAmount,
          paidContentEarnings: eventAmount + contentAmount,
          availableBalance: available,
        });
        setItems(combined);
      } catch (e: any) {
        console.debug('Monetization data fetch error (non-fatal):', e?.message || e);
        if (!isMounted) return;
        setSummary({ totalEarningsThisMonth: 0, tipsReceived: 0, paidContentEarnings: 0, availableBalance: 0 });
        setItems([]);
        setError('Monetization tables not found or empty');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [user, dateFrom, filters.period, filters.contentType]);

  return { summary, items, loading, error };
}


