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

  // Define feature sets for each tier - based on actual implemented features
  const getFeatures = (tierName: string) => {
    const featureMap: Record<string, string[]> = {
      free: [
        "5 BizMap AI conversations per month",
        "Basic community forum access (read & post)",
        "Access to prompt library (view only)",
        "Basic sprint planning (1 active sprint)",
        "Email support"
      ],
      creator: [
        "50 BizMap AI conversations per month",
        "Full community features (posting, commenting, voting)",
        "Prompt library with copy/export functionality", 
        "Unlimited sprint planning & Kanban boards",
        "Market intelligence widget access",
        "Basic collaboration tools (text chat, file sharing)",
        "Priority email support"
      ],
      professional: [
        "150 BizMap AI conversations per month",
        "AI-enhanced community features (post insights, trending)",
        "Custom business report generation",
        "Advanced collaboration tools (whiteboarding, polls, video calls)",
        "Success score analytics & tracking",
        "Priority support + community access",
        "Export capabilities for all reports"
      ]
    };
    return featureMap[tierName] || [];
  };

  const getDescription = (tierName: string) => {
    const descriptions: Record<string, string> = {
      free: "Perfect for getting started with AI-powered business planning",
      creator: "Ideal for solopreneurs who need regular AI insights and community access",
      professional: "Best value for serious entrepreneurs with comprehensive collaboration features"
    };
    return descriptions[tierName] || "";
  };

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
      <section className="relative py-24 overflow-hidden">
        <div className="container mx-auto px-4">
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
      <section className="relative py-24 overflow-hidden" id="pricing-plans">
        {/* Animated Background with Multiple Layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 animate-fade-in" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95" />
        
        {/* Enhanced Animated Floating Elements with Diverse Movement Patterns */}
        <div className="absolute top-20 left-10 w-4 h-4 bg-primary rounded-full animate-float opacity-80 hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-40 right-20 w-6 h-6 bg-secondary rounded-full animate-spiral opacity-60" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-20 w-3 h-3 bg-accent rounded-full animate-zigzag opacity-70" style={{ animationDelay: '2s' }} />
        <div className="absolute top-60 left-1/3 w-2 h-2 bg-primary/50 rounded-full animate-diagonal-float" style={{ animationDelay: '3s' }} />
        <div className="absolute bottom-60 right-1/3 w-5 h-5 bg-secondary/40 rounded-full animate-figure-eight" style={{ animationDelay: '4s' }} />
        <div className="absolute top-1/3 right-10 w-8 h-8 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full animate-orbit opacity-50" style={{ animationDelay: '5s' }} />
        <div className="absolute bottom-1/3 left-10 w-6 h-6 bg-gradient-to-r from-accent/40 to-primary/40 rounded-full animate-float-reverse opacity-40" style={{ animationDelay: '6s' }} />
        
        {/* Additional Dynamic Floating Elements with Varied Animations */}
        <div className="absolute top-32 left-1/4 w-3 h-3 bg-primary/60 rounded-full animate-drift opacity-80" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-80 right-1/4 w-7 h-7 bg-secondary/30 rounded-full animate-spiral opacity-60" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-32 left-1/2 w-4 h-4 bg-accent/50 rounded-full animate-orbit opacity-70" style={{ animationDelay: '2.5s' }} />
        <div className="absolute top-96 left-16 w-5 h-5 bg-primary/40 rounded-full animate-figure-eight opacity-50" style={{ animationDelay: '3.5s' }} />
        <div className="absolute bottom-96 right-16 w-2 h-2 bg-secondary/60 rounded-full animate-zigzag opacity-80" style={{ animationDelay: '4.5s' }} />
        <div className="absolute top-44 left-3/4 w-6 h-6 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-diagonal-float opacity-40" style={{ animationDelay: '5.5s' }} />
        <div className="absolute bottom-44 right-3/4 w-3 h-3 bg-gradient-to-tl from-secondary/40 to-primary/40 rounded-full animate-float-reverse opacity-60" style={{ animationDelay: '6.5s' }} />
        
        {/* Moving Gradient Orbs with Complex Paths */}
        <div className="absolute top-24 right-1/3 w-12 h-12 bg-gradient-to-r from-primary/15 to-transparent rounded-full animate-orbit opacity-30 blur-sm" style={{ animationDelay: '7s' }} />
        <div className="absolute bottom-24 left-1/3 w-16 h-16 bg-gradient-to-l from-secondary/10 to-transparent rounded-full animate-spiral opacity-25 blur-md" style={{ animationDelay: '8s' }} />
        <div className="absolute top-1/2 left-8 w-10 h-10 bg-gradient-to-b from-accent/20 to-transparent rounded-full animate-figure-eight opacity-35 blur-sm" style={{ animationDelay: '9s' }} />
        <div className="absolute top-1/2 right-8 w-14 h-14 bg-gradient-to-t from-primary/12 to-transparent rounded-full animate-diagonal-float opacity-30 blur-md" style={{ animationDelay: '10s' }} />
        
        {/* Additional Tiny Floating Particles */}
        <div className="absolute top-16 left-1/2 w-1 h-1 bg-primary/70 rounded-full animate-drift opacity-90" style={{ animationDelay: '11s' }} />
        <div className="absolute bottom-16 right-1/2 w-1 h-1 bg-secondary/80 rounded-full animate-zigzag opacity-85" style={{ animationDelay: '12s' }} />
        <div className="absolute top-72 left-12 w-2 h-2 bg-accent/60 rounded-full animate-orbit opacity-75" style={{ animationDelay: '13s' }} />
        <div className="absolute bottom-72 right-12 w-2 h-2 bg-primary/50 rounded-full animate-spiral opacity-70" style={{ animationDelay: '14s' }} />
      <div className="container mx-auto px-4 relative z-20">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock your creative potential with flexible plans designed for every level of ambition
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 max-w-7xl mx-auto px-2 sm:px-0">
          {tiers.map((tier, index) => {
            const { title, cta } = getTitleAndCTA(tier.tier_name);
            const features = getFeatures(tier.tier_name);
            const description = getDescription(tier.tier_name);
            const isCurrentPlan = subscriptionData.subscription_tier === tier.tier_name;
            const isPopular = tier.tier_name === 'creator';

            return (
              <div
                key={tier.tier_name}
                className={`relative glass-card p-4 sm:p-5 lg:p-6 transition-all duration-500 animate-fade-in hover:scale-[1.02] sm:hover:scale-105 hover:shadow-xl flex flex-col justify-between ${
                  isCurrentPlan
                    ? 'border-2 border-green-500/50 shadow-[0_0_40px_hsl(142,76%,36%,0.2)]'
                    : isPopular 
                    ? 'border-2 border-primary/30 sm:scale-105 shadow-[0_0_40px_hsl(var(--primary)/0.2)]' 
                    : 'border border-border/50'
                }`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Current Plan or Popular Badge */}
                {((isCurrentPlan && user) || isPopular) && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className={`px-4 py-1 text-sm font-medium flex items-center gap-1 ${
                      isCurrentPlan
                        ? 'bg-green-600 text-white'
                        : 'bg-primary text-primary-foreground'
                    }`}>
                      {isCurrentPlan ? (
                        <>
                          <Crown className="w-3 h-3 fill-current" />
                          Your Plan
                        </>
                      ) : (
                        <>
                          <Star className="w-3 h-3 fill-current" />
                          Suggested
                        </>
                      )}
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 capitalize">{tier.tier_name}</h3>
                  <p className="text-base sm:text-lg font-semibold text-primary mb-1 sm:mb-2">{title}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>

                <div className="text-center mb-4 sm:mb-6">
                  <div className="flex items-baseline justify-center gap-1 sm:gap-2">
                    <span className="text-3xl sm:text-4xl font-bold">
                      ${(tier.price_cents / 100).toFixed(2)}
                    </span>
                    {tier.price_cents > 0 && (
                      <span className="text-muted-foreground text-sm sm:text-base">/month</span>
                    )}
                  </div>
                  {tier.monthly_credits > 0 && (
                    <div className="text-xs sm:text-sm text-primary mt-2">
                      {tier.monthly_credits} credits/month
                    </div>
                  )}
                </div>

                {/* Features List */}
                <div className="mb-6 sm:mb-8 space-y-2 sm:space-y-3 flex-grow">
                  {features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-2 sm:gap-3">
                      <Check className="w-3 sm:w-4 h-3 sm:h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleSubscribe(tier.tier_name)}
                  disabled={!!(isCurrentPlan && user)}
                  className={`w-full py-3 px-4 font-medium btn-magnetic hover-scale transition-all duration-300 min-h-[44px] text-sm sm:text-base touch-manipulation ${
                    isCurrentPlan
                      ? 'bg-green-600 text-white cursor-default'
                      : isPopular 
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                      : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                  }`}
                >
                  {isCurrentPlan && user ? 'Current Plan' : !user && tier.tier_name === 'free' ? 'Try It Now' : cta}
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