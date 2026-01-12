import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Crown, Check } from "lucide-react";
import UpgradeCheckoutDialog, {
  CheckoutFormState,
} from "@/components/UpgradeCheckoutDialog";
import { useSubscription, SubscriptionTier } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import PricingWallpaper from "@/components/wallpapers/PricingWallpaper";

const BILLING_STORAGE_KEY = "ct_billing_details";

// Stripe Payment Links mapping by tier and billing cycle
const PAYMENT_LINKS: Record<string, Record<string, string>> = {
  creator: {
    monthly: "https://pay.creatives-takeover.com/b/cNi00jbqh07ma6e5e30ZW07",
    yearly: "https://pay.creatives-takeover.com/b/eVq28r1PHcU8a6efSH0ZW06",
  },
  professional: {
    monthly: "https://pay.creatives-takeover.com/b/4gMaEXcul4nC0vEfSH0ZW05",
    yearly: "https://pay.creatives-takeover.com/b/14A5kDfGx8DS5PY9uj0ZW04",
  },
};

// Get payment link for a given tier and billing cycle
const getPaymentLink = (
  tierName: string,
  billingCycle: "monthly" | "yearly"
): string | null => {
  const normalizedTier = tierName.trim().toLowerCase();
  const links = PAYMENT_LINKS[normalizedTier];
  if (!links) return null;
  return links[billingCycle] || null;
};

const createEmptyFormState = (): CheckoutFormState => ({
  fullName: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
});

const Pricing = () => {
  const { tiers, loading, subscriptionData } = useSubscription();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormState>(() =>
    createEmptyFormState()
  );
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [hasPrefilledAddress, setHasPrefilledAddress] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Map tier names for display
  const getTierDisplayName = (tierName: string): string => {
    const displayNames: Record<string, string> = {
      free: "Rookie",
      creator: "Rising",
      professional: "Pro"
    };
    return displayNames[tierName] || tierName;
  };

  // Get pricing based on billing cycle
  const getPrice = (tierName: string): { price: number; period: string } => {
    if (tierName === 'free') {
      return { price: 0, period: '' };
    }

    if (billingCycle === 'yearly') {
      const yearlyPrices: Record<string, number> = {
        creator: 300,
        professional: 750
      };
      return { price: yearlyPrices[tierName] || 0, period: '/year' };
    }

    // Monthly prices (from database)
    const monthlyPrices: Record<string, number> = {
      creator: 32.99,
      professional: 74.99
    };
    return { price: monthlyPrices[tierName] || 0, period: '/month' };
  };

  // Define simplified feature list for each tier - keep it clear and concise
  const getFeatures = (tierName: string): string[] => {
    const featureMap: Record<string, string[]> = {
      free: [
        "10 credits per month",
        "BizMap AI (10 messages/month)",
        "PMF Lab (read-only)",
        "Prompt Library (view only)",
        "VC Search (5 views/month)",
        "Community access (limited)",
        "Insighta Test (basic)"
      ],
      creator: [
        "50 credits per month (5x more)",
        "BizMap AI (50 messages/month)",
        "PMF Lab (full access)",
        "Pitch Deck Analyzer",
        "AI Email Templates",
        "VC Search (25 views/month)",
        "Community (full access)",
        "Priority support"
      ],
      professional: [
        "150 credits per month (15x more)",
        "BizMap AI (150 messages/month)",
        "Unlimited VC searches",
        "Advanced Pitch Deck Analyzer",
        "Custom email templates",
        "Featured in Community",
        "Priority support (24h response)",
        "Early access to new features"
      ]
    };
    return featureMap[tierName] || [];
  };

  // Get target audience description
  const getTargetAudience = (tierName: string) => {
    const audiences: Record<string, string> = {
      free: "Start your journey - validate your idea",
      creator: "Build your startup with AI-powered tools",
      professional: "Scale with unlimited access and premium features"
    };
    return audiences[tierName] || "";
  };

  // Get subtitle for each tier
  const getSubtitle = (tierName: string) => {
    const subtitles: Record<string, string> = {
      free: "Validate",
      creator: "Build",
      professional: "Scale"
    };
    return subtitles[tierName] || "";
  };

  // Removed upgrade benefits text - keeping it simple and clear

  const getTitleAndCTA = (tierName: string) => {
    const details: Record<string, { title: string; cta: string }> = {
      free: { title: "Get Started", cta: "Start Free" },
      creator: { title: "Build & Create", cta: "Start Building" },
      professional: { title: "Scale & Collaborate", cta: "Scale Your Startup" }
    };
    return details[tierName] || { title: "Get Started", cta: "Subscribe" };
  };

  const handleFormChange = (
    field: keyof CheckoutFormState,
    value: string
  ) => {
    setCheckoutForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDialogOpenChange = (open: boolean) => {
    setShowUpgradeDialog(open);
    if (!open) {
      setSelectedTier(null);
      setCheckoutForm(createEmptyFormState());
      setHasPrefilledAddress(false);
    }
  };

  const handleSubscribe = (tierName: string) => {
    if (tierName === "free") {
      if (!user) {
        window.location.href = "/auth";
      }
      return;
    }

    if (!user) {
      window.location.href = "/auth";
      return;
    }

    const normalizedTierName = tierName.trim().toLowerCase();
    const tier = tiers.find(
      (plan) => plan.tier_name.trim().toLowerCase() === normalizedTierName
    );

    if (!tier) {
      toast.error("Unable to load that plan right now. Please try again.");
      return;
    }

    let storedDetails: CheckoutFormState | null = null;
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(BILLING_STORAGE_KEY);
      if (raw) {
        try {
          storedDetails = JSON.parse(raw);
        } catch (error) {
          console.warn("Failed to parse stored billing details", error);
        }
      }
    }

    const prefilledForm: CheckoutFormState = {
      ...createEmptyFormState(),
      ...(storedDetails ?? {}),
    };

    prefilledForm.fullName =
      user?.user_metadata?.full_name || storedDetails?.fullName || "";
    prefilledForm.email = user?.email || storedDetails?.email || "";

    setCheckoutForm(prefilledForm);
    setHasPrefilledAddress(Boolean(storedDetails?.addressLine1));
    setSelectedTier(tier);
    setShowUpgradeDialog(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedTier) {
      toast.error("Select a plan to continue.");
      return;
    }

    const requiredFields: Array<keyof CheckoutFormState> = [
      "fullName",
      "email",
      "addressLine1",
      "city",
      "state",
      "postalCode",
      "country",
    ];

    const missingFields = requiredFields.filter(
      (field) => !checkoutForm[field].trim()
    );

    if (missingFields.length > 0) {
      toast.error("Please complete all required billing fields.");
      return;
    }

    if (
      checkoutForm.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutForm.email)
    ) {
      toast.error("Please enter a valid email address.");
      return;
    }

    // Get payment link based on tier and billing cycle
    const paymentLink = getPaymentLink(selectedTier.tier_name, billingCycle);
    
    if (!paymentLink) {
      toast.error("Unable to find payment link for this plan. Please try again.");
      return;
    }

    // Save billing details to localStorage for potential future use
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        BILLING_STORAGE_KEY,
        JSON.stringify(checkoutForm)
      );
    }

    setCheckoutSubmitting(true);
    try {
      toast.success("Redirecting you to secure checkout…");
      handleDialogOpenChange(false);
      
      // Small delay to allow toast and dialog close animation
      setTimeout(() => {
        window.location.href = paymentLink;
      }, 300);
    } catch (error) {
      console.error("Redirect to payment link failed", error);
      toast.error("We couldn't redirect to checkout. Please try again.");
      setCheckoutSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading pricing plans...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <UpgradeCheckoutDialog
        open={showUpgradeDialog}
        onOpenChange={handleDialogOpenChange}
        tier={selectedTier}
        formData={checkoutForm}
        onFormChange={handleFormChange}
        onSubmit={handleConfirmUpgrade}
        submitting={checkoutSubmitting}
        hasSavedAddress={hasPrefilledAddress}
      />
      {/* Pricing Section */}
      <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden" id="pricing-plans">
        <PricingWallpaper />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 gradient-text">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Start taking action and move your ideas forward with plans that scale as you do.
          </p>

          {/* Billing Cycle Tabs */}
          <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as 'monthly' | 'yearly')} className="inline-block">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly
                <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">Save up to 24%</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {tiers.map((tier, index) => {
            const { title, cta } = getTitleAndCTA(tier.tier_name);
            const features = getFeatures(tier.tier_name);
            const targetAudience = getTargetAudience(tier.tier_name);
            const subtitle = getSubtitle(tier.tier_name);
            const isCurrentPlan = subscriptionData?.subscription_tier === tier.tier_name;
            const isPopular = tier.tier_name === 'creator';
            const { price, period } = getPrice(tier.tier_name);

            return (
              <div
                key={tier.tier_name}
                className={`relative bg-card border rounded-lg p-6 sm:p-8 transition-shadow hover:shadow-lg flex flex-col ${
                  isCurrentPlan
                    ? 'border-green-500 shadow-md'
                    : isPopular
                    ? 'border-primary shadow-sm'
                    : 'border-border'
                }`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Current Plan or Popular Badge */}
                {((isCurrentPlan && user) || isPopular) && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className={`px-3 py-1 text-xs font-medium ${
                      isCurrentPlan
                        ? 'bg-green-600 text-white'
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      {isCurrentPlan ? (<> <Crown className="w-3 h-3 mr-1 inline" /> Your Plan </>) : (<> <Star className="w-3 h-3 mr-1 inline fill-current" /> Suggested </>)}
                    </Badge>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl sm:text-3xl font-bold mb-1 capitalize">{getTierDisplayName(tier.tier_name)}</h3>
                  {subtitle && (
                    <p className="text-sm font-medium text-muted-foreground mb-3">{subtitle}</p>
                  )}
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl sm:text-5xl font-bold">
                        ${price === 0 ? '0' : price.toFixed(2)}
                      </span>
                      {period && (
                        <span className="text-muted-foreground text-lg">{period}</span>
                      )}
                    </div>
                    {billingCycle === 'yearly' && tier.tier_name !== 'free' && (
                      <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                        ${(price / 12).toFixed(2)}/month billed annually
                      </div>
                    )}
                    {tier.monthly_credits > 0 && (
                      <div className="text-sm text-muted-foreground mt-2">
                        {tier.tier_name === 'free' ? 10 : tier.monthly_credits} credits/month
                      </div>
                    )}
                  </div>
                  {/* Target Audience - Simplified */}
                  <p className="text-sm text-muted-foreground mb-6">
                    {targetAudience}
                  </p>
                </div>

                {/* Plan Highlights */}
                <div className="mb-6 flex-grow">
                  <p className="text-sm font-semibold text-foreground mb-4">Plan highlights:</p>
                  <div className="space-y-3">
                    {features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground leading-relaxed">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => handleSubscribe(tier.tier_name)}
                  disabled={!!(isCurrentPlan && user)}
                  className={`w-full py-3 px-4 font-medium transition-colors ${
                    isCurrentPlan
                      ? 'bg-green-600 text-white cursor-default hover:bg-green-700'
                      : isPopular 
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                      : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                  }`}
                >
                  {isCurrentPlan && user ? 'Current Plan' : !user && tier.tier_name === 'free' ? 'Start Now' : cta}
                </Button>
              </div>
            );
          })}
        </div>

      </div>
    </section>
    </>
  );
};

export default Pricing;