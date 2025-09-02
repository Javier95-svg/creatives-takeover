import { AlertCircle, Coins, CreditCard, Zap } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
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

  const creditPackages = [
    { credits: 20, price: 9.99, popular: false },
    { credits: 50, price: 19.99, popular: true },
    { credits: 100, price: 34.99, popular: false },
  ];

  const handlePurchaseClick = (packageCredits: number, price: number) => {
    console.log(`Purchase ${packageCredits} credits for $${price}`);
    onPurchase?.();
    // TODO: Implement Stripe integration
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

        <div className="space-y-4">
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

          {/* Credit Packages */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Purchase Credit Packages:</h4>
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
                          onClick={() => handlePurchaseClick(pkg.credits, pkg.price)}
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
          </div>

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