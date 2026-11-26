import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Brain, BriefcaseBusiness, GraduationCap, Hammer, Handshake, Lock, Rocket, Route, type LucideIcon } from "lucide-react";

import { WHO_IS_THIS_FOR_ACCOUNT_TYPES, type AudienceAccountType } from "@/components/whoIsThisForProfiles";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import { rememberIntendedAccountType } from "@/lib/intendedAccountType";
import { trackHeroModelCta } from "./heroModel";

// Model C, differentiation-driven. What only Creatives Takeover combines: a
// guided path, the people a project needs on the same platform, and a project
// memory that stays private to the account. The CTA asks who you are and
// starts sign-up with that account type already chosen, as HeroRoleCards does.
// "Accelerator as a service" is Javier's own phrase (2026-11-06): structure and
// accountability, never funding.

type AccountId = AudienceAccountType["id"];

const ROLE: Record<AccountId, { icon: LucideIcon; tone: string; noun: string }> = {
  founder: { icon: Rocket, tone: "#4f8ff7", noun: "Founders" },
  builder: { icon: Hammer, tone: "#f5a524", noun: "Builders" },
  mentor: { icon: GraduationCap, tone: "#14b8a6", noun: "Mentors" },
  marketplace: { icon: BriefcaseBusiness, tone: "#8b5cf6", noun: "Service providers" },
  investor: { icon: Handshake, tone: "#22c55e", noun: "Investors" },
};

const PILLARS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Route, title: "A path, not a pile of tools", text: "Seven stages, each with a clear result, and a dashboard that shows what to do next." },
  { icon: Brain, title: "It remembers your project", text: "Pulse keeps your decisions, hypotheses and facts and uses them in every answer." },
  { icon: Lock, title: "Yours, and free to start", text: "Your work stays private to your account. No equity, and founders start without applying." },
];

export default function HeroModelC({ onWhoIsThisFor }: { onWhoIsThisFor: () => void }) {
  const { set: setAttribution } = useCTAAttribution();

  const choose = (account: AudienceAccountType) => {
    trackHeroModelCta("c", "role_selected", { account_type: account.id });
    setAttribution(`hero_model_c_role_${account.id}`, "/");
    rememberIntendedAccountType(account.id);
  };

  return (
    <div className="hm hm-c">
      <p className="hm__eyebrow">Accelerator as a service</p>
      <h1 className="hm-c__title">
        <span className="hm-c__title-1">Your project, and everyone it needs,</span>
        <span className="hm-c__title-2">in one place.</span>
      </h1>
      <p className="hm__lede">
        The structure of an accelerator, open any day: guided tools for each stage, with mentors,
        service providers, investors and other founders on the same platform.
      </p>

      <div className="hm-c__stage">
        <div className="hm-c__orbit" aria-hidden="true">
          <div className="hm-c__core">
            <span className="hm-c__core-k">Your project</span>
            <span className="hm-c__core-v">Stage II · Prototyping</span>
          </div>
          {WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account, index) => {
            const { icon: Icon, tone, noun } = ROLE[account.id];
            return (
              <span
                key={account.id}
                className="hm-c__node"
                style={{ "--tone": tone, "--i": index } as CSSProperties}
              >
                <Icon /> {noun}
              </span>
            );
          })}
        </div>

        <div className="hm-c__join">
          <p className="hm-c__join-q" id="hm-c-join">I'm joining as a…</p>
          <div className="hm-c__roles" role="list" aria-labelledby="hm-c-join">
            {WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account) => {
              const { icon: Icon, tone } = ROLE[account.id];
              return (
                <Link
                  key={account.id}
                  role="listitem"
                  to="/signup?source=hero_model_c"
                  className="hm-c__role"
                  style={{ "--tone": tone } as CSSProperties}
                  onClick={() => choose(account)}
                >
                  <span className="hm-c__role-ic" aria-hidden="true"><Icon /></span>
                  <span className="hm-c__role-text">
                    <b>{account.label}</b>
                    <span>{account.promise}</span>
                  </span>
                  <span className="hm-c__role-tag">{account.access === "open" ? "Open" : "Apply"}</span>
                  <ArrowRight className="hm-c__role-go" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            className="hm__textlink"
            onClick={() => {
              trackHeroModelCta("c", "who_is_this_for");
              onWhoIsThisFor();
            }}
          >
            Not sure which one? See who it's for <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul className="hm-c__pillars">
        {PILLARS.map(({ icon: Icon, title, text }) => (
          <li key={title}>
            <span className="hm-c__pillar-ic" aria-hidden="true"><Icon /></span>
            <b>{title}</b>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
