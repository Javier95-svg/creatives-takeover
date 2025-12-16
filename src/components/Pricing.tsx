import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Crown, Check } from "lucide-react";
import UpgradeCheckoutDialog, {
  CheckoutFormState,
} from "@/components/UpgradeCheckoutDialog";
import { useSubscription, SubscriptionTier } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import PricingWallpaper from "@/components/wallpapers/PricingWallpaper";

const BILLING_STORAGE_KEY = "ct_billing_details";

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
  const { tiers, loading, createCheckout, subscriptionData } = useSubscription();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormState>(() =>
    createEmptyFormState()
  );
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [hasPrefilledAddress, setHasPrefilledAddress] = useState(false);

  // Define simplified feature list for each tier - keep it clear and concise
  const getFeatures = (tierName: string): string[] => {
    const featureMap: Record<string, string[]> = {
      free: [
        "5 BizMap AI conversations per month",
        "Community read-only access",
        "1 active sprint",
        "Funding opportunities (view only)",
        "Job board (view only)",
        "Community forum support"
      ],
      creator: [
        "50 BizMap AI conversations per month",
        "Full community access (post, comment, vote)",
        "Unlimited sprint planning & Kanban boards",
        "Market intelligence (10 queries/month)",
        "Financial dashboard access",
        "Basic collaboration tools (max 3 collaborators)",
        "Priority email support (48hr response)"
      ],
      professional: [
        "150 BizMap AI conversations per month",
        "AI-enhanced community features",
        "Unlimited market intelligence",
        "Unlimited custom reports + PDF export",
        "Advanced collaboration tools",
        "Advanced financial analytics",
        "Unlimited team members",
        "24hr priority support",
        "API access"
      ]
    };
    return featureMap[tierName] || [];
  };

  // Get target audience description
  const getTargetAudience = (tierName: string) => {
    const audiences: Record<string, string> = {
      free: "Perfect for exploring the platform and validating your business idea",
      creator: "Ideal for active solopreneurs ready to build and execute their business plan",
      professional: "Built for serious entrepreneurs and small teams scaling their operations"
    };
    return audiences[tierName] || "";
  };

  // Removed upgrade benefits text - keeping it simple and clear

  const getTitleAndCTA = (tierName: string) => {
    const details: Record<string, { title: string; cta: string }> = {
      free: { title: "Get Started", cta: "Start Free" },
      creator: { title: "Build & Create", cta: "Free Trial Available" },
      professional: { title: "Scale & Collaborate", cta: "Free Trial Available" }
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

    setCheckoutSubmitting(true);
    try {
      const prefill = {
        name: checkoutForm.fullName,
        email: checkoutForm.email,
        address: {
          line1: checkoutForm.addressLine1,
          line2: checkoutForm.addressLine2 || undefined,
          city: checkoutForm.city,
          state: checkoutForm.state,
          postal_code: checkoutForm.postalCode,
          country: checkoutForm.country,
        },
      };

      const url = await createCheckout(selectedTier.tier_name, prefill);
      if (url) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            BILLING_STORAGE_KEY,
            JSON.stringify(checkoutForm)
          );
        }
        toast.success("Redirecting you to secure checkout…");
        handleDialogOpenChange(false);
      }
    } catch (error) {
      console.error("Upgrade checkout failed", error);
      toast.error("We couldn't start the checkout. Please try again.");
    } finally {
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
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock your creative potential with flexible plans designed for every level of ambition
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {tiers.map((tier, index) => {
            const { title, cta } = getTitleAndCTA(tier.tier_name);
            const features = getFeatures(tier.tier_name);
            const targetAudience = getTargetAudience(tier.tier_name);
            const isCurrentPlan = subscriptionData.subscription_tier === tier.tier_name;
            const isPopular = tier.tier_name === 'creator';

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
                  <h3 className="text-2xl sm:text-3xl font-bold mb-3 capitalize">{tier.tier_name}</h3>
                  <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl sm:text-5xl font-bold">
                        ${(tier.price_cents / 100).toFixed(2)}
                      </span>
                      {tier.price_cents > 0 && (
                        <span className="text-muted-foreground text-lg">/month</span>
                      )}
                    </div>
                    {tier.monthly_credits > 0 && (
                      <div className="text-sm text-muted-foreground mt-2">
                        {tier.monthly_credits} credits/month
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