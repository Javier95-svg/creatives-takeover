import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Briefcase, GraduationCap, Lightbulb, Rocket, TrendingUp, type LucideIcon } from "lucide-react";
import { WHO_IS_THIS_FOR_ACCOUNT_TYPES } from "@/components/whoIsThisForProfiles";
import { RevealGroup } from "@/components/animations/ScrollReveal";
import HomeSectionHeader from "./HomeSectionHeader";

type AccountId = (typeof WHO_IS_THIS_FOR_ACCOUNT_TYPES)[number]["id"];

// The public page that explains each account type best. The cards themselves
// come from "Who is this for?", so the homepage and the dialog say the same.
const ACCOUNT_LINKS: Record<AccountId, { href: string; label: string; icon: LucideIcon; accent: string }> = {
  founder: { href: "/for-founders", label: "For founders", icon: Rocket, accent: "primary" },
  builder: { href: "/start", label: "Take the quick quiz", icon: Lightbulb, accent: "success" },
  mentor: { href: "/mentorship", label: "Meet the mentors", icon: GraduationCap, accent: "warning" },
  marketplace: { href: "/marketplace", label: "Browse services", icon: Briefcase, accent: "info" },
  investor: { href: "/for-investors", label: "For investors", icon: TrendingUp, accent: "destructive" },
};

// Founders and builders are who the platform is for first, so their cards lead
// the grid at double width; the people around them follow.
const LEAD_ACCOUNTS: ReadonlySet<AccountId> = new Set(["founder", "builder"]);

const EcosystemSection = () => (
  <section className="hs-section section-shell" aria-labelledby="ecosystem-heading">
    <div className="container mx-auto px-4 sm:px-6">
      <HomeSectionHeader badge="Who's Here" title="A Unique Environment" id="ecosystem-heading">
        Made for people building on their own, or just curious about an idea. Around your project you meet mentors to learn from, possible cofounders, service providers for the work you can't do alone, and investors looking for projects that fit what they back.
      </HomeSectionHeader>

      <RevealGroup className="hs-ecosystem-grid" stagger={0.07}>
        {WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account) => {
          const link = ACCOUNT_LINKS[account.id];
          const Icon = link.icon;
          const lead = LEAD_ACCOUNTS.has(account.id);
          return (
            <Link
              key={account.id}
              to={link.href}
              className={`hs-card hs-ecosystem-card${lead ? " hs-ecosystem-card--lead" : ""}`}
              data-accent={link.accent}
            >
              <Icon className="hs-ecosystem-card__mark" aria-hidden="true" />
              <div className="hs-ecosystem-card__top">
                <span className="hs-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="hs-chip">{account.access === "invitation" ? "By invitation" : "Open to everyone"}</span>
              </div>
              <h3 className="hs-ecosystem-card__label">{account.label}</h3>
              <p className="hs-ecosystem-card__promise">“{account.promise}”</p>
              <p className="hs-card__copy">{account.next}</p>
              <span className="hs-card__link">
                {link.label}
                <ArrowUpRight aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </RevealGroup>

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
