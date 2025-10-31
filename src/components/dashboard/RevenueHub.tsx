import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Users, CreditCard, AlertCircle } from 'lucide-react';
import { useRevenueMetrics } from '@/hooks/useRevenueMetrics';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const RevenueHub = () => {
  const { latestMetrics, isLoading, isStripeConnected, isStripeConfigured, hasStripeAccount, getTrend } = useRevenueMetrics();

  const handleConnectStripe = () => {
    toast.info('To connect Stripe, please add your STRIPE_SECRET_KEY in the Supabase secrets configuration.');
  };

  if (isLoading) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle>Revenue Hub</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const mrrTrend = getTrend('mrr');

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-primary" />
          Revenue Hub
        </CardTitle>
        {!isStripeConnected && (
          <Button variant="outline" size="sm" className="gap-2 h-8" onClick={handleConnectStripe}>
            <CreditCard className="h-4 w-4" />
            Connect Stripe
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!isStripeConfigured && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Connect your Stripe account to see real revenue metrics. Add STRIPE_SECRET_KEY to Supabase secrets.
            </AlertDescription>
          </Alert>
        )}

        {isStripeConfigured && !hasStripeAccount && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              No Stripe customer found for your email. Make sure you have a Stripe account.
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>MRR</span>
            </div>
            <p className="text-2xl font-bold">
              ${latestMetrics.mrr.toLocaleString()}
            </p>
            {mrrTrend !== 0 && (
              <p className={`text-xs flex items-center gap-1 ${
                mrrTrend > 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                <TrendingUp className={`h-3 w-3 ${mrrTrend < 0 ? 'rotate-180' : ''}`} />
                {Math.abs(mrrTrend).toFixed(1)}%
              </p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Churn Rate</span>
            </div>
            <p className="text-2xl font-bold">
              {latestMetrics.churn_rate.toFixed(1)}%
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Conversion</span>
            </div>
            <p className="text-2xl font-bold">
              {latestMetrics.conversion_rate.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
