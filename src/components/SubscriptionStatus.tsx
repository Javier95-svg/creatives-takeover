import { Crown, Calendar, CreditCard, RefreshCw, Settings } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface SubscriptionStatusProps {
  variant?: "card" | "inline" | "detailed";
}

export function SubscriptionStatus({ variant = "card" }: SubscriptionStatusProps) {
  const { user } = useAuth();
  const { 
    subscriptionData, 
    loading, 
    openCustomerPortal, 
    refreshSubscription,
    getTierInfo,
    getDaysUntilEnd
  } = useSubscription();

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">Sign in to view subscription status</p>
            <Button asChild size="sm">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading subscription...</span>
      </div>
    );
  }

  const tierInfo = getTierInfo(subscriptionData?.subscription_tier || 'free');
  const daysUntilEnd = getDaysUntilEnd();

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'secondary';
      case 'creator': return 'default';
      case 'professional': return 'default';
      default: return 'secondary';
    }
  };

  const getTierIcon = (tier: string) => {
    if (tier === 'free') return null;
    return <Crown className="h-3 w-3" />;
  };

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={getTierColor(subscriptionData?.subscription_tier || 'free')} className="gap-1">
          {getTierIcon(subscriptionData?.subscription_tier || 'free')}
          {(subscriptionData?.subscription_tier || 'free').charAt(0).toUpperCase() + (subscriptionData?.subscription_tier || 'free').slice(1)}
        </Badge>
        {subscriptionData?.subscribed && (
          <Button size="sm" variant="ghost" onClick={openCustomerPortal}>
            <Settings className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Plan:</span>
              <Badge variant={getTierColor(subscriptionData?.subscription_tier || 'free')} className="gap-1">
                {getTierIcon(subscriptionData?.subscription_tier || 'free')}
                {(subscriptionData?.subscription_tier || 'free').charAt(0).toUpperCase() + (subscriptionData?.subscription_tier || 'free').slice(1)}
              </Badge>
            </div>

            {tierInfo && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Monthly Credits:</span>
                  <span className="font-medium">{tierInfo.monthly_credits}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Monthly Cost:</span>
                  <span className="font-medium">
                    {tierInfo.price_cents === 0 ? 'Free' : `$${(tierInfo.price_cents / 100).toFixed(2)}`}
                  </span>
                </div>
              </div>
            )}

            {subscriptionData?.subscribed && subscriptionData?.subscription_end && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {daysUntilEnd && daysUntilEnd > 0 
                      ? `Renews in ${daysUntilEnd} days`
                      : 'Subscription expired'
                    }
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={refreshSubscription}
                className="gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
              
              {subscriptionData?.subscribed ? (
                <Button 
                  size="sm" 
                  onClick={openCustomerPortal}
                  className="gap-2"
                >
                  <Settings className="h-3 w-3" />
                  Manage
                </Button>
              ) : (
                <Button size="sm" asChild>
                  <Link to="/pricing">
                    <CreditCard className="h-3 w-3 mr-1" />
                    Upgrade
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {tierInfo && tierInfo.features && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Plan Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {(() => {
                  // Handle features as array or string
                  const featureList = (() => {
                    if (Array.isArray(tierInfo.features)) {
                      return tierInfo.features;
                    }
                    if (typeof tierInfo.features === 'string') {
                      try {
                        const parsed = JSON.parse(tierInfo.features);
                        return Array.isArray(parsed) ? parsed : [];
                      } catch (error) {
                        return tierInfo.features
                          .split(',')
                          .map((feature) => feature.trim())
                          .filter(Boolean);
                      }
                    }
                    return [];
                  })();
                  
                  return featureList.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full" />
                      {feature}
                    </li>
                  ));
                })()}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Default card variant
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Subscription</span>
          <Badge variant={getTierColor(subscriptionData?.subscription_tier || 'free')} className="gap-1">
            {getTierIcon(subscriptionData?.subscription_tier || 'free')}
            {(subscriptionData?.subscription_tier || 'free').charAt(0).toUpperCase() + (subscriptionData?.subscription_tier || 'free').slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {subscriptionData?.subscribed ? (
          <div className="space-y-2">
            {tierInfo && (
              <p className="text-xs text-muted-foreground">
                {tierInfo.monthly_credits} credits/month
              </p>
            )}
            {daysUntilEnd && (
              <p className="text-xs text-muted-foreground">
                {daysUntilEnd > 0 ? `Renews in ${daysUntilEnd} days` : 'Expired'}
              </p>
            )}
            <Button size="sm" variant="outline" onClick={openCustomerPortal} className="w-full">
              Manage Subscription
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Upgrade for more credits and features
            </p>
            <Button size="sm" className="w-full" asChild>
              <Link to="/pricing">View Plans</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
