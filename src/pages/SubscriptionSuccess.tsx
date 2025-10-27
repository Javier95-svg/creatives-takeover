import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Crown, ArrowRight, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useCredits } from "@/hooks/useCredits";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const tier = searchParams.get('tier') || 'basic';
  const [verifying, setVerifying] = useState(true);
  
  const { refreshSubscription, subscriptionData } = useSubscription();
  const { refreshBalance, balance } = useCredits();

  useEffect(() => {
    // Verify subscription and refresh data
    const verifySubscription = async () => {
      try {
        await refreshSubscription();
        await refreshBalance();
        toast.success('Subscription activated successfully!');
      } catch (error) {
        console.error('Error verifying subscription:', error);
        toast.error('Please refresh the page to see updated subscription status');
      } finally {
        setVerifying(false);
      }
    };

    // Delay to allow Stripe to process
    const timer = setTimeout(verifySubscription, 2000);
    return () => clearTimeout(timer);
  }, [refreshSubscription, refreshBalance]);

  const getTierInfo = (tierName: string) => {
    const tiers = {
      basic: { name: 'Basic', credits: 50, price: 9.99 },
      premium: { name: 'Premium', credits: 150, price: 19.99 },
      enterprise: { name: 'Enterprise', credits: 500, price: 49.99 }
    };
    return tiers[tierName as keyof typeof tiers] || tiers.basic;
  };

  const tierInfo = getTierInfo(tier);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Creatives Takeover</title>
        <meta 
          name="description" 
          content="Your BizMap AI subscription is now active. Start using your monthly credits to generate launch reports and assets." 
        />
      </Helmet>

      <Navigation />
      
      <main className="flex-1 pt-20 pb-12">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            
            {/* Success Header */}
            <div className="space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold">Subscription Successful!</h1>
              <p className="text-muted-foreground text-lg">
                Welcome to BizMap AI {tierInfo.name}! Your subscription is now active.
              </p>
            </div>

            {/* Subscription Details */}
            <Card className="text-left">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  {tierInfo.name} Plan Active
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {verifying ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying your subscription...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-primary">{tierInfo.credits}</div>
                      <div className="text-sm text-muted-foreground">Credits per month</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">${tierInfo.price}</div>
                      <div className="text-sm text-muted-foreground">Monthly billing</div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-green-600">{balance}</div>
                      <div className="text-sm text-muted-foreground">Available now</div>
                    </div>
                  </div>
                )}

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-medium">What you get:</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{tierInfo.credits} credits every month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Generate {Math.floor(tierInfo.credits / 10)} launch reports per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Create {Math.floor(tierInfo.credits / 5)} marketing assets per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Priority support and advanced features</span>
                    </li>
                  </ul>
                </div>

                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Your credits have been added to your account and will automatically renew each month.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild>
                      <Link to="/bizmap-ai">
                        Start Using BizMap AI
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link to="/credits">
                        View Credit Analytics
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Generate Your First Launch Report</h4>
                    <p className="text-sm text-muted-foreground">
                      Use BizMap AI to create a comprehensive business plan with market analysis and validation steps.
                    </p>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/bizmap-ai">Start Now</Link>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Manage Your Subscription</h4>
                    <p className="text-sm text-muted-foreground">
                      Update billing, change plans, or cancel anytime through your account dashboard.
                    </p>
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/account">Manage</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <div className="text-sm text-muted-foreground space-y-2">
              <p>Need help getting started? Check out our guides and tutorials.</p>
              <div className="flex justify-center gap-4">
                <Link to="/resources" className="hover:underline">Resources</Link>
                <span>•</span>
                <Link to="/contact" className="hover:underline">Contact Support</Link>
                <span>•</span>
                <Link to="/faq" className="hover:underline">FAQ</Link>
              </div>
            </div>

          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}