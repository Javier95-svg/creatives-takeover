import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useOutreachCampaigns, CampaignMetrics } from '@/hooks/useOutreachCampaigns';
import { TrendingDown } from 'lucide-react';

interface CustomerFunnelProps {
  campaignId: string;
}

const funnelStages = [
  { key: 'sent', label: 'Sent', color: 'bg-blue-500' },
  { key: 'opened', label: 'Opened', color: 'bg-green-500' },
  { key: 'replied', label: 'Replied', color: 'bg-yellow-500' },
  { key: 'converted', label: 'Converted', color: 'bg-purple-500' },
];

export const CustomerFunnel = ({ campaignId }: CustomerFunnelProps) => {
  const { getCampaignMetrics } = useOutreachCampaigns();
  const { data: metrics, isLoading } = getCampaignMetrics(campaignId);

  if (isLoading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Acquisition Funnel</CardTitle>
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
          <CardTitle className="text-base">Acquisition Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No metrics available yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxValue = metrics.total_sent || 1;
  const stages = [
    { label: 'Sent', value: metrics.total_sent, percentage: 100, rate: null },
    { label: 'Opened', value: metrics.total_opened, percentage: (metrics.total_opened / maxValue) * 100, rate: metrics.open_rate },
    { label: 'Replied', value: metrics.total_replied, percentage: (metrics.total_replied / maxValue) * 100, rate: metrics.reply_rate },
    { label: 'Converted', value: metrics.total_converted, percentage: (metrics.total_converted / maxValue) * 100, rate: metrics.conversion_rate },
  ];

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-4 w-4" />
          Acquisition Funnel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {stages.map((stage, index) => (
            <div key={stage.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${funnelStages[index]?.color || 'bg-gray-500'}`} />
                  <span className="text-sm font-medium">{stage.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold">{stage.value}</span>
                  {stage.rate !== null && (
                    <span className="text-xs text-muted-foreground">
                      {stage.rate.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <Progress value={stage.percentage} className="h-2" />
            </div>
          ))}

          {/* Overall Conversion Rate */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Conversion Rate</span>
              <span className="text-lg font-bold text-primary">
                {metrics.conversion_rate.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.total_converted} conversions from {metrics.total_sent} sent
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

