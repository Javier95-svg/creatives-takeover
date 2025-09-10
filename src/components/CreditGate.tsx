import { AlertCircle, Coins, CreditCard, Zap, Crown } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreditGateProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits: number;
  feature: string;
  onPurchase?: () => void;
}

export function CreditGate({ 
  isOpen, 
  onClose, 
  requiredCredits, 
  feature,
  onPurchase 
}: CreditGateProps) {
  const { balance, CREDIT_COSTS } = useCredits();
  const { createCheckout, tiers, subscriptionData } = useSubscription();

  const creditPackages = [
    { credits: 20, price: 9.99, popular: false },
    { credits: 50, price: 19.99, popular: true },
    { credits: 100, price: 34.99, popular: false },
  ];

  const handleSubscriptionPurchase = async (tier: string) => {
    const url = await createCheckout(tier);
    if (url) {
      onPurchase?.();
      onClose();
    }
  };

  const handleCreditPackagePurchase = async (packageCredits: number, price: number) => {
    try {
      const price_cents = Math.round(price * 100);
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { credits: packageCredits, price_cents }
      });
      if (error) throw error;
      if (data?.url) {
        // Open Stripe checkout in a new tab (recommended default)
        window.open(data.url, "_blank");
        onPurchase?.();
        onClose();
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to start checkout");
      console.error("Credit package purchase error:", e);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="h-5 w-5" />
            Insufficient Credits
          </DialogTitle>
          <DialogDescription>
            You need {requiredCredits} credits to use {feature}, but you only have {balance} credits available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current vs Required */}
          <Card>
            <CardContent className="pt-6 pb-4">
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">You have</div>
                  <Badge variant="secondary" className="mt-1">
                    <Coins className="h-3 w-3 mr-1" />
                    {balance} credits
                  </Badge>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">You need</div>
                  <Badge variant="outline" className="mt-1">
                    <Zap className="h-3 w-3 mr-1" />
                    {requiredCredits} credits
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription vs One-time Purchase Tabs */}
          <Tabs defaultValue={subscriptionData.subscribed ? "credits" : "subscription"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="subscription">Monthly Plans</TabsTrigger>
              <TabsTrigger value="credits">Credit Packages</TabsTrigger>
            </TabsList>

            <TabsContent value="subscription" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Upgrade to a Monthly Plan:</h4>
                <div className="space-y-2">
                  {tiers.filter(tier => tier.tier_name !== 'free').map((tier, index) => (
                    <Card key={tier.tier_name} className={tier.tier_name === 'premium' ? "ring-2 ring-primary" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-primary" />
                                <span className="font-medium capitalize">{tier.tier_name} Plan</span>
                                {tier.tier_name === 'premium' && (
                                  <Badge variant="default" className="text-xs">
                                    Popular
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {tier.monthly_credits} credits per month
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">${(tier.price_cents / 100).toFixed(2)}/month</div>
                            <Button
                              size="sm"
                              variant={tier.tier_name === 'premium' ? "default" : "outline"}
                              onClick={() => handleSubscriptionPurchase(tier.tier_name)}
                              className="mt-1"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Subscribe
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="credits" className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">One-time Credit Packages:</h4>
                <div className="space-y-2">
                  {creditPackages.map((pkg, index) => (
                    <Card key={index} className={pkg.popular ? "ring-2 ring-primary" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{pkg.credits} Credits</span>
                                {pkg.popular && (
                                  <Badge variant="default" className="text-xs">
                                    Popular
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ${(pkg.price / pkg.credits).toFixed(2)} per credit
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">${pkg.price}</div>
                            <Button
                              size="sm"
                              variant={pkg.popular ? "default" : "outline"}
                              onClick={() => handleCreditPackagePurchase(pkg.credits, pkg.price)}
                              className="mt-1"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Buy Now
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-xs">
                  <p className="text-blue-800 dark:text-blue-200">
                    💡 <strong>Tip:</strong> Monthly plans offer better value and include additional features like priority support and advanced analytics.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Feature Costs Reference */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs">
            <h5 className="font-medium mb-2">Credit Usage Guide:</h5>
            <div className="space-y-1 text-muted-foreground">
              <div>• Launch Report: {CREDIT_COSTS.LAUNCH_REPORT} credits</div>
              <div>• Asset Generation: {CREDIT_COSTS.ASSET_GENERATION} credits each</div>
              <div>• Premium Features: {CREDIT_COSTS.PREMIUM_FEATURE} credits</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}