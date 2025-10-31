import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react';
import { useRevenueMetrics } from '@/hooks/useRevenueMetrics';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

export const RevenueHub = () => {
  const { latestMetrics, metrics, isLoading, isStripeConnected, getTrend } = useRevenueMetrics(30);

  if (isLoading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle>Revenue Hub</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = metrics.slice(-30).map(m => ({
    date: format(new Date(m.metric_date), 'MMM dd'),
    revenue: Number(m.total_revenue),
    mrr: Number(m.mrr),
  }));

  const mrrTrend = getTrend('mrr');
  const churnTrend = getTrend('churn_rate');
  const conversionTrend = getTrend('conversion_rate');

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Revenue Hub
        </CardTitle>
        {!isStripeConnected && (
          <Button variant="outline" size="sm" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Connect Stripe
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>MRR</span>
            </div>
            <p className="text-2xl font-bold">
              ${latestMetrics.mrr.toLocaleString()}
            </p>
            {mrrTrend !== 0 && (
              <p className={`text-sm flex items-center gap-1 ${
                mrrTrend > 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                <TrendingUp className={`h-3 w-3 ${mrrTrend < 0 ? 'rotate-180' : ''}`} />
                {Math.abs(mrrTrend).toFixed(1)}%
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Churn Rate</span>
            </div>
            <p className="text-2xl font-bold">
              {latestMetrics.churn_rate.toFixed(1)}%
            </p>
            {churnTrend !== 0 && (
              <p className={`text-sm flex items-center gap-1 ${
                churnTrend < 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                <TrendingUp className={`h-3 w-3 ${churnTrend > 0 ? 'rotate-180' : ''}`} />
                {Math.abs(churnTrend).toFixed(1)}%
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Conversion Rate</span>
            </div>
            <p className="text-2xl font-bold">
              {latestMetrics.conversion_rate.toFixed(1)}%
            </p>
            {conversionTrend !== 0 && (
              <p className={`text-sm flex items-center gap-1 ${
                conversionTrend > 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                <TrendingUp className={`h-3 w-3 ${conversionTrend < 0 ? 'rotate-180' : ''}`} />
                {Math.abs(conversionTrend).toFixed(1)}%
              </p>
            )}
          </div>
        </div>

        {/* Trend Chart */}
        {chartData.length > 0 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mrr" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
