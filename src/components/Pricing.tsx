import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Crown, Check, Sparkles, Users, Target, BarChart3, UserPlus, HeadphonesIcon } from "lucide-react";
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

  // Categorized feature structure
  interface CategorizedFeatures {
    aiPlanning: string[];
    community: string[];
    execution: string[];
    intelligence: string[];
    collaboration: string[];
    support: string[];
  }

  // Category configuration
  const categoryConfig = [
    { key: 'aiPlanning' as keyof CategorizedFeatures, label: 'BizMap AI & Planning', icon: Sparkles, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'community' as keyof CategorizedFeatures, label: 'Community & Networking', icon: Users, color: 'text-purple-600 dark:text-purple-400' },
    { key: 'execution' as keyof CategorizedFeatures, label: 'Execution Tools', icon: Target, color: 'text-green-600 dark:text-green-400' },
    { key: 'intelligence' as keyof CategorizedFeatures, label: 'Business Intelligence', icon: BarChart3, color: 'text-orange-600 dark:text-orange-400' },
    { key: 'collaboration' as keyof CategorizedFeatures, label: 'Collaboration', icon: UserPlus, color: 'text-pink-600 dark:text-pink-400' },
    { key: 'support' as keyof CategorizedFeatures, label: 'Support', icon: HeadphonesIcon, color: 'text-cyan-600 dark:text-cyan-400' }
  ];

  // Define categorized features for each tier
  const getCoreFeatures = (tierName: string): CategorizedFeatures => {
    const featureMap: Record<string, CategorizedFeatures> = {
      free: {
        aiPlanning: [
          "5 BizMap AI conversations per month",
          "Prompt library (view only)"
        ],
        community: [
          "Community read-only access",
          "Reputation system (basic)"
        ],
        execution: [
          "1 active sprint",
          "Basic Kanban board"
        ],
        intelligence: [
          "Funding opportunities (view only)",
          "Job board (view only)"
        ],
        collaboration: [],
        support: [
          "Community forum support"
        ]
      },
      creator: {
        aiPlanning: [
          "50 BizMap AI conversations per month",
          "Prompt library with copy/export functionality",
          "Custom prompt chains creation"
        ],
        community: [
          "Full community access (post, comment, vote)",
          "Accountability partnerships",
          "Reputation system (full access)"
        ],
        execution: [
          "Unlimited sprint planning & Kanban boards",
          "Daily check-ins"
        ],
        intelligence: [
          "Market intelligence (10 queries/month)",
          "Funding opportunities with bookmarks",
          "Job board (view & apply)",
          "Financial dashboard access",
          "Budget management (basic)",
          "Basic reports (5/month)"
        ],
        collaboration: [
          "Basic collaboration tools (max 3 collaborators)"
        ],
        support: [
          "Priority email support (48hr response)"
        ]
      },
      professional: {
        aiPlanning: [
          "150 BizMap AI conversations per month",
          "Prompt library with copy/export functionality",
          "Custom prompt chains creation"
        ],
        community: [
          "AI-enhanced community (post insights, trending)",
          "Accountability partnerships",
          "Reputation system (full access)"
        ],
        execution: [
          "Unlimited sprint planning & Kanban boards",
          "Daily check-ins"
        ],
        intelligence: [
          "Unlimited market intelligence",
          "Unlimited custom reports + PDF export",
          "Funding opportunities with bookmarks",
          "Job board (view & apply)",
          "Financial dashboard access",
          "Budget management (advanced)",
          "Advanced financial analytics",
          "Success score analytics & tracking",
          "Outreach campaigns (unlimited)"
        ],
        collaboration: [
          "Advanced collaboration (whiteboarding, polls, video calls)",
          "Unlimited team members"
        ],
        support: [
          "24hr priority support",
          "API access"
        ]
      }
    };
    return featureMap[tierName] || {
      aiPlanning: [],
      community: [],
      execution: [],
      intelligence: [],
      collaboration: [],
      support: []
    };
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

  // Get key benefits over the lower tier
  const getUpgradeBenefits = (tierName: string): string[] => {
    const benefits: Record<string, string[]> = {
      free: [
        "Start validating your business idea",
        "Explore platform features",
        "Join our community"
      ],
      creator: [
        "10x more AI conversations (50 vs 5)",
        "Full community participation",
        "Unlimited sprint planning",
        "Market intelligence access"
      ],
      professional: [
        "3x more AI conversations (150 vs 50)",
        "Unlimited market intelligence",
        "Advanced collaboration tools",
        "24hr priority support + API access"
      ]
    };
    return benefits[tierName] || [];
  };

  // Legacy function for backwards compatibility (if needed elsewhere)
  const getFeatures = (tierName: string) => {
    const categorized = getCoreFeatures(tierName);
    return [
      ...categorized.aiPlanning,
      ...categorized.community,
      ...categorized.execution,
      ...categorized.intelligence,
      ...categorized.collaboration,
      ...categorized.support
    ];
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
            const categorizedFeatures = getCoreFeatures(tier.tier_name);
            const targetAudience = getTargetAudience(tier.tier_name);
            const upgradeBenefits = getUpgradeBenefits(tier.tier_name);
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

                {/* Plan Header */}
                <div className="text-center mb-4 sm:mb-6">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 capitalize">{tier.tier_name}</h3>
                  <div className="text-center mb-3 sm:mb-4">
                    <div className="flex items-baseline justify-center gap-1 sm:gap-2">
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-bold">
                        ${(tier.price_cents / 100).toFixed(2)}
                      </span>
                      {tier.price_cents > 0 && (
                        <span className="text-muted-foreground text-sm sm:text-base lg:text-lg">/month</span>
                      )}
                    </div>
                    {tier.monthly_credits > 0 && (
                      <div className="text-xs sm:text-sm text-primary mt-2 font-medium">
                        {tier.monthly_credits} credits/month
                      </div>
                    )}
                  </div>
                  {/* Target Audience */}
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <p className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                      Who it's for
                    </p>
                    <p className="text-xs sm:text-sm lg:text-base text-foreground leading-relaxed">
                      {targetAudience}
                    </p>
                  </div>
                </div>

                {/* Upgrade Benefits Section */}
                {tier.tier_name !== 'free' && upgradeBenefits.length > 0 && (
                  <div className="mb-4 sm:mb-6 pt-4 border-t-2 border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent -mx-4 sm:-mx-5 lg:-mx-6 px-4 sm:px-5 lg:px-6 pb-3 rounded-lg">
                    <p className="text-xs font-bold text-primary mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Star className="w-3 h-3 fill-primary flex-shrink-0" />
                      <span>{tier.tier_name === 'creator' ? 'Upgrade from Free' : 'Upgrade from Creator'}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {upgradeBenefits.map((benefit, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="text-[10px] sm:text-xs bg-primary/15 text-primary border-primary/30 hover:bg-primary/20 transition-colors font-medium px-2 py-0.5"
                        >
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Free plan "Getting Started" benefits */}
                {tier.tier_name === 'free' && upgradeBenefits.length > 0 && (
                  <div className="mb-4 sm:mb-6 pt-4 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      What you get
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {upgradeBenefits.map((benefit, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="text-[10px] sm:text-xs bg-muted/30 border-border/50 px-2 py-0.5"
                        >
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categorized Features */}
                <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4 flex-grow max-h-[600px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                  {categoryConfig.map((category) => {
                    const features = categorizedFeatures[category.key];
                    if (features.length === 0) return null;

                    const IconComponent = category.icon;
                    
                    return (
                      <div key={category.key} className="space-y-2 pb-3 border-b border-border/30 last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded-md flex-shrink-0 ${
                            category.key === 'aiPlanning' ? 'bg-blue-500/10' :
                            category.key === 'community' ? 'bg-purple-500/10' :
                            category.key === 'execution' ? 'bg-green-500/10' :
                            category.key === 'intelligence' ? 'bg-orange-500/10' :
                            category.key === 'collaboration' ? 'bg-pink-500/10' :
                            'bg-cyan-500/10'
                          }`}>
                            <IconComponent className={`w-3.5 h-3.5 ${category.color}`} />
                          </div>
                          <h4 className="text-[10px] sm:text-xs font-bold text-foreground uppercase tracking-wider">
                            {category.label}
                          </h4>
                        </div>
                        <div className="space-y-1.5 pl-8 sm:pl-9">
                          {features.map((feature, featureIndex) => {
                            const isProOnly = tier.tier_name === 'professional' && (
                              feature.includes('Unlimited') || 
                              feature.includes('AI-enhanced') ||
                              feature.includes('API access') ||
                              feature.includes('24hr') ||
                              feature.includes('Advanced')
                            );
                            
                            return (
                              <div key={featureIndex} className="flex items-start gap-2 sm:gap-2.5">
                                <Check className={`w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 flex-shrink-0 ${
                                  isProOnly ? 'text-primary' : 'text-green-600 dark:text-green-400'
                                }`} />
                                <span className={`text-[11px] sm:text-xs lg:text-sm leading-relaxed ${
                                  isProOnly ? 'text-primary font-medium' : 'text-muted-foreground'
                                }`}>
                                  {feature}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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