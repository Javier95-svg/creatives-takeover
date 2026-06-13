import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MarketValidationScore, DemandTrendData, SearchVolumeData } from '@/types/founderOS';
import { TrendingUp, TrendingDown, Minus, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DemandTrendsProps {
  validation: MarketValidationScore | null;
}

export const DemandTrends = ({ validation }: DemandTrendsProps) => {
  const demandTrends = validation?.demand_trends as DemandTrendData | undefined;
  const searchVolume = validation?.search_volume_data as SearchVolumeData | undefined;

  if (!validation || (!demandTrends && !searchVolume)) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="text-base">Demand Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No demand trend data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'decreasing':
      case 'falling':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'increasing':
      case 'rising':
        return 'text-success bg-success-subtle';
      case 'decreasing':
      case 'falling':
        return 'text-destructive bg-destructive-subtle';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  // Prepare chart data
  const chartData = demandTrends?.data_points?.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: point.value,
  })) || [];

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <CardTitle className="text-base">Demand Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Demand Trend Overview */}
          {demandTrends && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Trend Direction</p>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(demandTrends.trend_direction)}
                    <span className="text-sm font-medium capitalize">
                      {demandTrends.trend_direction}
                    </span>
                  </div>
                </div>

                {demandTrends.growth_rate_percent !== undefined && (
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Growth Rate</p>
                    <p className="text-sm font-medium">
                      {demandTrends.growth_rate_percent > 0 ? '+' : ''}
                      {demandTrends.growth_rate_percent}%
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Market Maturity</p>
                  <Badge variant="outline" className="capitalize">
                    {demandTrends.market_maturity}
                  </Badge>
                </div>

                {demandTrends.seasonality && (
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Seasonality</p>
                    <Badge variant="outline" className="capitalize">
                      {demandTrends.seasonality}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Trend Chart */}
              {chartData.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Trend Over Time</p>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Search Volume Data */}
          {searchVolume && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">Search Volume</h3>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{searchVolume.primary_keyword}</p>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(searchVolume.search_trend)}
                    <Badge variant="outline" className={getTrendColor(searchVolume.search_trend)}>
                      {searchVolume.search_trend}
                    </Badge>
                  </div>
                </div>

                {searchVolume.monthly_searches && (
                  <p className="text-xs text-muted-foreground">
                    ~{searchVolume.monthly_searches.toLocaleString()} monthly searches
                  </p>
                )}

                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Competition Level</p>
                  <Badge
                    variant={
                      searchVolume.competition_level === 'low' ? 'default' :
                      searchVolume.competition_level === 'medium' ? 'secondary' :
                      'destructive'
                    }
                  >
                    {searchVolume.competition_level} competition
                  </Badge>
                </div>
              </div>

              {searchVolume.related_keywords && searchVolume.related_keywords.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Related Keywords</p>
                  <div className="flex flex-wrap gap-2">
                    {searchVolume.related_keywords.slice(0, 5).map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword.keyword} ({keyword.volume.toLocaleString()})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

