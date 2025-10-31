import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Plus,
  BarChart3,
  Target
} from 'lucide-react';
import { useBusinessMetrics } from '@/hooks/useBusinessMetrics';
import { MetricsEntryModal } from './MetricsEntryModal';
import { cn } from '@/lib/utils';

export const BusinessMetrics = () => {
  const { summary, loading, refreshMetrics } = useBusinessMetrics(30);
  const [showEntryModal, setShowEntryModal] = useState(false);

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Business Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <>
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-primary" />
                Business Metrics
              </CardTitle>
              <CardDescription className="mt-1">
                Track your business performance over the last 30 days
              </CardDescription>
            </div>
            <Button 
              size="sm" 
              onClick={() => setShowEntryModal(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Log Metrics
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <Card className="border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <DollarSign className="h-4 w-4 text-green-500" />
                  </div>
                  {summary && summary.revenueGrowth !== 0 && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "gap-1 text-xs",
                        summary.revenueGrowth > 0 
                          ? "border-green-500/50 text-green-500" 
                          : "border-red-500/50 text-red-500"
                      )}
                    >
                      {summary.revenueGrowth > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatPercentage(summary.revenueGrowth)}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(summary?.totalRevenue || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Total Expenses */}
            <Card className="border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <DollarSign className="h-4 w-4 text-red-500" />
                  </div>
                  {summary && summary.expenseGrowth !== 0 && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "gap-1 text-xs",
                        summary.expenseGrowth < 0 
                          ? "border-green-500/50 text-green-500" 
                          : "border-red-500/50 text-red-500"
                      )}
                    >
                      {summary.expenseGrowth < 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      {formatPercentage(summary.expenseGrowth)}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary?.totalExpenses || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Net Profit */}
            <Card className={cn(
              "border-2",
              (summary?.profit || 0) >= 0 ? "border-primary/20" : "border-orange-500/20"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(
                    "p-2 rounded-lg",
                    (summary?.profit || 0) >= 0 ? "bg-primary/10" : "bg-orange-500/10"
                  )}>
                    <Target className={cn(
                      "h-4 w-4",
                      (summary?.profit || 0) >= 0 ? "text-primary" : "text-orange-500"
                    )} />
                  </div>
                  {summary && summary.profitMargin !== 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {formatPercentage(summary.profitMargin)} margin
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    (summary?.profit || 0) >= 0 ? "text-primary" : "text-orange-500"
                  )}>
                    {formatCurrency(summary?.profit || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Additional Metrics */}
            <Card className="border-blue-500/20">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-blue-500" />
                      <p className="text-xs font-medium text-muted-foreground">Customers</p>
                    </div>
                    <p className="text-xl font-bold">{summary?.totalCustomers || 0}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <p className="text-xs font-medium text-muted-foreground">Avg Hours/Day</p>
                    </div>
                    <p className="text-xl font-bold">
                      {(summary?.averageHoursWorked || 0).toFixed(1)}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Empty State */}
          {summary?.totalRevenue === 0 && summary?.totalExpenses === 0 && (
            <div className="mt-6 text-center py-8 border-2 border-dashed rounded-lg">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No metrics logged yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking your business performance by logging your daily metrics
              </p>
              <Button onClick={() => setShowEntryModal(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Log Your First Metrics
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MetricsEntryModal
        open={showEntryModal}
        onOpenChange={setShowEntryModal}
        onSuccess={refreshMetrics}
      />
    </>
  );
};
