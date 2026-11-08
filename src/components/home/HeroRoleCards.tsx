import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, GraduationCap, Hammer, Handshake, Rocket, type LucideIcon } from "lucide-react";

import { WHO_IS_THIS_FOR_ACCOUNT_TYPES, type AudienceAccountType } from "@/components/whoIsThisForProfiles";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import { captureEvent } from "@/lib/analytics";
import { rememberIntendedAccountType } from "@/lib/intendedAccountType";
import "./hero-roles.css";

// The row under the hero for signed-out visitors: one card per account type,
// on a single line. Copy, symbols and colours are the ones the "Who is this
// for?" dialog uses (whoIsThisForProfiles.ts, WhoIsThisForAccountTypes.tsx).
// Open accounts start sign-up with the type pre-selected, as the dialog does;
// invitation-only ones go to the application form at /apply.

type AccountId = AudienceAccountType["id"];

const ROLE: Record<AccountId, { icon: LucideIcon; tone: string }> = {
  founder: { icon: Rocket, tone: "#4f8ff7" },
  builder: { icon: Hammer, tone: "#f5a524" },
  mentor: { icon: GraduationCap, tone: "#14b8a6" },
  marketplace: { icon: BriefcaseBusiness, tone: "#8b5cf6" },
  investor: { icon: Handshake, tone: "#22c55e" },
};

const isOpen = (account: AudienceAccountType) => account.access === "open";

export default function HeroRoleCards() {
  const { set: setAttribution } = useCTAAttribution();

  const onSelect = (account: AudienceAccountType) => {
    captureEvent("cta_clicked", { cta_name: "hero_role_card", account_type: account.id, page: "/" });
    setAttribution(`hero_role_${account.id}`, "/");
    // The onboarding quiz pre-selects this so the person is not asked twice.
    if (isOpen(account)) rememberIntendedAccountType(account.id);
  };

  return (
    <section className="hr-wrap" aria-labelledby="hero-account-types">
      <h2 id="hero-account-types" className="hr-wrap__title">Account Types</h2>
      <div className="hr" role="list">
        {WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account) => {
          const { icon: Icon, tone } = ROLE[account.id];
          const action = isOpen(account) ? "Create an account" : "Apply here";
          return (
            <Link
              key={account.id}
              to={isOpen(account) ? "/signup" : `/apply?as=${account.id}`}
              role="listitem"
              className="hr__card"
              style={{ "--tone": tone } as CSSProperties}
              onClick={() => onSelect(account)}
              aria-label={`${account.label}: ${account.promise} ${account.next} ${action}.`}
            >
              <span className="hr__glyph" aria-hidden="true"><Icon /></span>
              <span className="hr__icon" aria-hidden="true"><Icon /></span>
              <span className="hr__label">{account.label}</span>
              <span className="hr__promise">“{account.promise}”</span>
              <span className="hr__next">{account.next}</span>
              <span className="hr__foot">
                <span className={`hr__access is-${account.access}`}>{isOpen(account) ? "Open to join" : "By invitation"}</span>
                <span className="hr__cta">
                  {action}
                  <ArrowRight aria-hidden="true" />
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
