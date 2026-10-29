import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { PLAN_PRICING } from "@/config/pricing";
import { PLAN_PACKAGE_PRESENTATION } from "@/config/planPackages";
import { PLAN_COPY } from "@/lib/publicPlatformFacts";
import { RevealGroup } from "@/components/animations/ScrollReveal";
import HomeSectionHeader from "./HomeSectionHeader";

// Prices, credits and copy all come from the pricing page's own sources, so
// this teaser can never quote a number /pricing does not. Tier colours match
// /pricing: green Rookie, blue Starter, amber Rising, red Pro.
const TIER_ACCENT = { rookie: "success", starter: "primary", rising: "warning", pro: "destructive" } as const;

const PricingTeaser = () => (
  <section className="hs-section section-shell hg-section hg-pricing" aria-labelledby="pricing-teaser-heading">
    <span className="hg-aurora hg-aurora--tiers" aria-hidden="true" />
    <div className="container mx-auto px-4 sm:px-6 relative z-10">
      <HomeSectionHeader
        badge="Pricing"
        title="Start free. Upgrade when your project needs more."
        id="pricing-teaser-heading"
        align="center"
        className="hg-head hg-head--warm"
      >
        The core tools are on every plan. Paid plans add credits and research.
      </HomeSectionHeader>

      <RevealGroup className="hg-plans" stagger={0.08}>
        {PLAN_COPY.map((plan) => {
          const presentation = PLAN_PACKAGE_PRESENTATION[plan.id];
          const price = PLAN_PRICING[plan.id].monthly;
          return (
            <Link
              key={plan.id}
              to="/pricing"
              className={`hg-plan${presentation.recommended ? " hg-plan--recommended" : ""}`}
              data-accent={TIER_ACCENT[plan.id]}
              aria-label={`${plan.name} plan, ${price === 0 ? "free" : `$${price} a month`}. Compare plans`}
            >
              <span className="hg-plan__top">
                <h3 className="hg-plan__name">{plan.name}</h3>
                {presentation.recommended ? <span className="hg-plan__tag">Recommended</span> : null}
              </span>
              <p className="hg-plan__price">
                ${price}
                <span>/month</span>
              </p>
              <p className="hg-plan__outcome">{presentation.outcome}</p>
              <p className="hg-plan__usage">{presentation.usageLabel}</p>
            </Link>
          );
        })}
      </RevealGroup>

      <div className="hs-actions">
        <Link to="/pricing" className="hs-button hs-button--primary">
          Compare plans
          <ArrowRight aria-hidden="true" />
        </Link>
        <p className="hs-actions__note">
          Running an accelerator, incubator or university program? <Link to="/enterprise">Programs get custom pricing.</Link>
        </p>
      </div>
    </div>
  </section>
);

export default PricingTeaser;
