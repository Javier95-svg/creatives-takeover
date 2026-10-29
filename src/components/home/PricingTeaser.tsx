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
  <section className="hs-section section-shell" aria-labelledby="pricing-teaser-heading">
    <div className="container mx-auto px-4 sm:px-6">
      <HomeSectionHeader badge="Pricing" title="Start free. Upgrade when your project needs more." id="pricing-teaser-heading">
        Every plan includes the core tools, and credits pay for the heavier ones. Paid plans add more credits, investor and accelerator research, and your MVP on your own domain.
      </HomeSectionHeader>

      <RevealGroup className="hs-pricing-grid" stagger={0.08}>
        {PLAN_COPY.map((plan) => {
          const presentation = PLAN_PACKAGE_PRESENTATION[plan.id];
          const price = PLAN_PRICING[plan.id].monthly;
          return (
            <Link
              key={plan.id}
              to="/pricing"
              className={`hs-card hs-plan${presentation.recommended ? " hs-plan--recommended" : ""}`}
              data-accent={TIER_ACCENT[plan.id]}
              aria-label={`${plan.name} plan, ${price === 0 ? "free" : `$${price} a month`}. Compare plans`}
            >
              <div className="hs-plan__head">
                <h3 className="hs-card__title">{plan.name}</h3>
                {presentation.recommended ? <span className="hs-chip hs-chip--solid">Recommended</span> : null}
              </div>
              <p className="hs-plan__best">Best for {presentation.bestFor.toLowerCase()}</p>
              <p className="hs-plan__price">
                ${price}
                <span>/month</span>
              </p>
              <p className="hs-card__copy">{presentation.outcome}</p>
              <p className="hs-plan__usage">{presentation.usageLabel}</p>
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
