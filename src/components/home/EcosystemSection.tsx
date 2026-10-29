import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { WHO_IS_THIS_FOR_ACCOUNT_TYPES } from "@/components/whoIsThisForProfiles";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import HomeSectionHeader from "./HomeSectionHeader";

type AccountId = (typeof WHO_IS_THIS_FOR_ACCOUNT_TYPES)[number]["id"];

// The public page that explains each account type best. The cards themselves
// come from "Who is this for?", so the homepage and the dialog say the same.
const ACCOUNT_LINKS: Record<AccountId, { href: string; label: string; hue: string }> = {
  founder: { href: "/for-founders", label: "For founders", hue: "232 100% 74%" },
  builder: { href: "/start", label: "Take the quick quiz", hue: "152 58% 49%" },
  mentor: { href: "/mentorship", label: "Meet the mentors", hue: "42 90% 61%" },
  marketplace: { href: "/marketplace", label: "Browse services", hue: "172 66% 50%" },
  investor: { href: "/for-investors", label: "For investors", hue: "339 80% 68%" },
};

// The account types sit around "your project" on two glass rings: two above,
// two beside it and one below. On a phone they stack under it.
const EcosystemSection = () => (
  <section className="hs-section section-shell hg-section hg-env" aria-labelledby="ecosystem-heading">
    <div className="container mx-auto px-4 sm:px-6">
      <HomeSectionHeader badge="Who's Here" title="A Unique Environment" id="ecosystem-heading" align="center" className="hg-head hg-head--teal">
        Solo or just curious, you meet mentors, cofounders, experts and investors here.
      </HomeSectionHeader>

      <div className="hg-orbit">
        <ScrollReveal variant="scale" className="hg-orbit__center">
          <span className="hg-orbit__core">
            Your
            <br />
            project
          </span>
        </ScrollReveal>

        {/* Each card reveals on its own: a wrapping group would have to be
            display: contents to keep the grid, and that never comes into view. */}
        {WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account, index) => {
          const link = ACCOUNT_LINKS[account.id];
          const cardStyle = { "--node-hue": link.hue } as CSSProperties;
          return (
            <ScrollReveal key={account.id} variant="card" delay={index * 0.07} className={`hg-orbit__slot hg-orbit__slot--${account.id}`}>
              <Link to={link.href} className="hg-orbit__card hg-glass" style={cardStyle}>
                <span className="hg-orbit__top">
                  <span className="hg-orbit__dot" aria-hidden="true" />
                  <span className="hg-orbit__label">{account.label}</span>
                  <span className="hg-orbit__access">{account.access === "invitation" ? "By invitation" : "Open"}</span>
                </span>
                <span className="hg-orbit__promise">{account.promise}</span>
                <span className="hg-orbit__next">{account.next}</span>
                <span className="sr-only">{link.label}</span>
              </Link>
            </ScrollReveal>
          );
        })}
      </div>

      <div className="hs-actions">
        <Link to="/start" className="hs-button hs-button--primary">
          Find your path
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </div>
  </section>
);

export default EcosystemSection;
