import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOutreachCampaigns, CampaignMetrics } from '@/hooks/useOutreachCampaigns';
import { TrendingUp, Mail, MessageSquare, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface OutreachMetricsProps {
  campaignId: string;
}

export const OutreachMetrics = ({ campaignId }: OutreachMetricsProps) => {
  const { getCampaignMetrics } = useOutreachCampaigns();
  const { data: metrics, isLoading } = getCampaignMetrics(campaignId);

  if (isLoading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Campaign Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Campaign Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No metrics available yet</p>
            <p className="text-sm mt-2">Start tracking activities to see metrics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [
    { name: 'Sent', value: metrics.total_sent, color: '#3b82f6' },
    { name: 'Opened', value: metrics.total_opened, color: '#10b981' },
    { name: 'Replied', value: metrics.total_replied, color: '#f59e0b' },
    { name: 'Converted', value: metrics.total_converted, color: '#8b5cf6' },
  ].filter(item => item.value > 0);

  const kpiCards = [
    {
      label: 'Open Rate',
      value: `${metrics.open_rate.toFixed(1)}%`,
      icon: Mail,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Reply Rate',
      value: `${metrics.reply_rate.toFixed(1)}%`,
      icon: MessageSquare,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Conversion Rate',
      value: `${metrics.conversion_rate.toFixed(1)}%`,
      icon: CheckCircle2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Campaign Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            {kpiCards.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div key={kpi.label} className={`p-4 border rounded-lg ${kpi.bgColor}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
              );
            })}
          </div>

          {/* Activity Counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total Sent</p>
              <p className="text-2xl font-bold">{metrics.total_sent}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total Converted</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.total_converted}</p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3">Activity Breakdown</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Performance Summary */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Performance Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open Rate</span>
                <span className="font-medium">
                  {metrics.open_rate >= 20 ? '✅ Good' : metrics.open_rate >= 10 ? '⚠️ Average' : '❌ Low'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reply Rate</span>
                <span className="font-medium">
                  {metrics.reply_rate >= 5 ? '✅ Good' : metrics.reply_rate >= 2 ? '⚠️ Average' : '❌ Low'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conversion Rate</span>
                <span className="font-medium">
                  {metrics.conversion_rate >= 2 ? '✅ Good' : metrics.conversion_rate >= 1 ? '⚠️ Average' : '❌ Low'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

