import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import SEO, { createProductSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Pricing from "@/components/Pricing";
import SubscriptionFeatures from "@/components/SubscriptionFeatures";
import PricingComparison from "@/components/PricingComparison";
import PricingFAQ from "@/components/PricingFAQ";
import InstitutionPricing from "@/components/pricing/InstitutionPricing";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { captureEvent, trackPricingViewed } from "@/lib/analytics";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { PRICING_AUDIENCES, PRICING_HEADER, PRICING_SEO, type PricingAudience } from "@/data/pricingPage";
import { PLAN_LABELS, PLAN_MONTHLY_CREDITS, PLAN_SEQUENCE } from "@/config/planPermissions";
import { PLAN_PRICING } from "@/config/pricing";
import { PLAN_PACKAGE_PRESENTATION } from "@/config/planPackages";

// /pricing sells to two audiences (2026-10-17). Founders and builders get the
// four self-serve plans; institutions get custom pricing and "Talk with
// sales". The audience lives in ?for= so each view can be linked.
const AUDIENCE_PARAM = "for";

const readAudience = (value: string | null): PricingAudience => (value === "institutions" ? "institutions" : "founders");

const PricingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const audience = readAudience(searchParams.get(AUDIENCE_PARAM));

  useEffect(() => {
    trackPricingViewed({ source: 'direct' });
  }, []);

  const selectAudience = (value: string) => {
    const next = readAudience(value);
    if (next === audience) return;
    captureEvent("pricing_audience_selected", { audience: next });
    const params = new URLSearchParams(searchParams);
    if (next === "founders") params.delete(AUDIENCE_PARAM);
    else params.set(AUDIENCE_PARAM, next);
    setSearchParams(params, { replace: true });
  };

  // Structured data for pricing tiers, built from the same copy and numbers as
  // the plan cards so the two never disagree.
  const structuredData = [
    ...PLAN_SEQUENCE.map((plan) =>
      createProductSchema({
        name: `Creatives Takeover ${PLAN_LABELS[plan]} Plan`,
        description: `${PLAN_PACKAGE_PRESENTATION[plan].outcome} ${PLAN_PACKAGE_PRESENTATION[plan].outcomeDetail} ${PLAN_MONTHLY_CREDITS[plan]} credits a month.`,
        price: PLAN_PRICING[plan].monthly,
        currency: "USD",
      }),
    ),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Pricing', url: '/pricing' }
    ])
  ];

  return (
    <>
      <SEO
        title={PRICING_SEO.title}
        description={PRICING_SEO.description}
        keywords="ai startup tools pricing, founder software pricing, startup platform pricing, accelerator software pricing, incubator software pricing, university entrepreneurship program software"
        url="/pricing"
        structuredData={structuredData}
      />
      <div className="relative min-h-screen overflow-hidden">
        <HomeWallpaper />
        <div className="relative z-10">
          <Navigation />

          <header className="container mx-auto px-4 pt-28 text-center sm:px-6 md:pt-32 lg:pt-36">
            <h1 className="gradient-text mb-5 pb-2 font-space-grotesk text-4xl font-semibold tracking-tight lg:text-6xl">
              {PRICING_HEADER.title}
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">{PRICING_HEADER.lede}</p>
            <Tabs value={audience} onValueChange={selectAudience} className="inline-block">
              <TabsList
                aria-label="Who is this pricing for"
                className="grid h-auto w-full grid-cols-2 rounded-full border border-border/60 bg-background/70 p-1.5 shadow-sm backdrop-blur"
              >
                {PRICING_AUDIENCES.map((option) => (
                  <TabsTrigger
                    key={option.value}
                    value={option.value}
                    className="rounded-full px-5 py-2.5 text-sm font-semibold data-[state=active]:bg-foreground data-[state=active]:text-background sm:px-7 sm:text-base"
                  >
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </header>

          {audience === "founders" ? (
            <>
              <div className="mt-10">
                <Pricing showHeading={false} />
              </div>
              <ScrollReveal>
                <PricingComparison />
              </ScrollReveal>
              <ScrollReveal>
                <SubscriptionFeatures />
              </ScrollReveal>
              <ScrollReveal>
                <PricingFAQ />
              </ScrollReveal>
            </>
          ) : (
            <div className="mt-10">
              <InstitutionPricing />
            </div>
          )}

          <Footer />
        </div>
      </div>
    </>
  );
};

export default PricingPage;
