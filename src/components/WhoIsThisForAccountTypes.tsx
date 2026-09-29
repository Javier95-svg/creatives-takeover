import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  GraduationCap,
  Hammer,
  Handshake,
  Rocket,
  type LucideIcon,
} from "lucide-react";

import {
  WHO_IS_THIS_FOR_ACCOUNT_TYPES,
  type AudienceAccountType,
} from "@/components/whoIsThisForProfiles";

type AccountTypeId = AudienceAccountType["id"];

const ROLE_ICONS: Record<AccountTypeId, LucideIcon> = {
  founder: Rocket,
  builder: Hammer,
  mentor: GraduationCap,
  marketplace: BriefcaseBusiness,
  investor: Handshake,
};

// Each role gets its own color. Class names are spelled out in full so Tailwind can find them.
const ROLE_STYLES: Record<AccountTypeId, { text: string; tint: string; solid: string; selected: string; hover: string; status: string }> = {
  founder: { text: "text-primary", tint: "bg-primary/15", solid: "bg-primary", selected: "border-primary bg-primary/10", hover: "hover:border-primary/50", status: "border-primary/30 bg-primary/5" },
  builder: { text: "text-warning", tint: "bg-warning/15", solid: "bg-warning", selected: "border-warning bg-warning/10", hover: "hover:border-warning/50", status: "border-warning/30 bg-warning/5" },
  mentor: { text: "text-accent-teal", tint: "bg-accent-teal/15", solid: "bg-accent-teal", selected: "border-accent-teal bg-accent-teal/10", hover: "hover:border-accent-teal/50", status: "border-accent-teal/30 bg-accent-teal/5" },
  marketplace: { text: "text-accent-violet", tint: "bg-accent-violet/15", solid: "bg-accent-violet", selected: "border-accent-violet bg-accent-violet/10", hover: "hover:border-accent-violet/50", status: "border-accent-violet/30 bg-accent-violet/5" },
  investor: { text: "text-success", tint: "bg-success/15", solid: "bg-success", selected: "border-success bg-success/10", hover: "hover:border-success/50", status: "border-success/30 bg-success/5" },
};

const ACCESS_GROUPS = [
  { access: "open", title: "access: open", dot: "bg-success" },
  { access: "invitation", title: "access: invite_only", dot: "bg-warning" },
] as const;

type Props = {
  onJoin: (accountType: AccountTypeId) => void;
  onShowPreBuild: () => void;
};

function Role({ id, children }: { id: AccountTypeId; children: ReactNode }) {
  return <span className={`font-semibold ${ROLE_STYLES[id].text}`}>{children}</span>;
}

export function WhoIsThisForAccountTypes({ onJoin, onShowPreBuild }: Props) {
  const [selectedId, setSelectedId] = useState<AccountTypeId>("founder");
  const selected = WHO_IS_THIS_FOR_ACCOUNT_TYPES.find((account) => account.id === selectedId)!;

  return (
    <section aria-labelledby="account-types-heading" className="px-5 py-4 sm:px-8 sm:py-5">
      <div className="grid overflow-hidden rounded-3xl border border-border/70 bg-card lg:grid-cols-[1fr_0.9fr]">
        <div className="flex">
          <div aria-hidden="true" className="flex w-1.5 shrink-0 flex-col">
            {WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account) => (
              <span key={account.id} className={`flex-1 ${ROLE_STYLES[account.id].solid}`} />
            ))}
          </div>
          <div className="p-4 sm:p-6">
            <p className="font-mono text-xs font-semibold text-primary">
              <span className="text-muted-foreground" aria-hidden="true">{"// "}</span>A place to turn ideas into progress
            </p>
            <h3 id="account-types-heading" className="mt-2 max-w-xl font-space-grotesk text-xl font-semibold leading-tight text-foreground sm:text-3xl">
              Bring your idea. Find out what to do next.
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-5 text-muted-foreground sm:text-base sm:leading-6">
              Creatives Takeover gives you tools to test an idea, a place to save your work, and people who can help.
            </p>
          </div>
        </div>
        <div aria-label="How accounts open" className="grid grid-cols-2 border-t border-border/70 bg-muted/40 lg:border-l lg:border-t-0">
          {ACCESS_GROUPS.map((group) => (
            <div key={group.access} className="p-4 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-border/70 sm:p-5">
              <p className="flex items-center gap-2 font-mono text-xs font-semibold text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${group.dot}`} aria-hidden="true" />
                {group.title}
              </p>
              <ul className="mt-3 space-y-2">
                {WHO_IS_THIS_FOR_ACCOUNT_TYPES.filter((account) => account.access === group.access).map((account) => {
                  const Icon = ROLE_ICONS[account.id];
                  const style = ROLE_STYLES[account.id];
                  return (
                    <li key={account.id} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style.tint} ${style.text}`}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      {account.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-space-grotesk text-lg font-semibold text-foreground">
            <span className="mr-2 font-mono text-base text-primary" aria-hidden="true">{"</>"}</span>
            Account types at Creatives Takeover
          </h4>
          <button type="button" onClick={onShowPreBuild} className="inline-flex items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            See the pre-build path <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Everyone uses the same platform, and your account type decides what you see. <Role id="founder">Founders</Role> and{" "}
          <Role id="builder">builders</Role> work on their own projects. <Role id="mentor">Mentors</Role> and the{" "}
          <Role id="marketplace">Marketplace</Role> help them. <Role id="investor">Investors</Role> find projects to back.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-6" role="group" aria-label="Account types">
        {WHO_IS_THIS_FOR_ACCOUNT_TYPES.map((account) => {
          const Icon = ROLE_ICONS[account.id];
          const style = ROLE_STYLES[account.id];
          const selectedCard = selectedId === account.id;
          return (
            <button
              key={account.id}
              type="button"
              onClick={() => setSelectedId(account.id)}
              aria-pressed={selectedCard}
              className={`group flex min-h-[92px] flex-col rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${account.id === "founder" || account.id === "builder" ? "lg:col-span-3" : "lg:col-span-2"} ${selectedCard ? `${style.selected} shadow-sm` : `border-border/70 bg-card ${style.hover}`}`}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${selectedCard ? `${style.solid} text-primary-foreground` : `${style.tint} ${style.text}`}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="rounded-full border border-border/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                  {account.access === "invitation" ? "Invitation only" : "Can join"}
                </span>
              </div>
              <span className="mt-2 font-space-grotesk text-sm font-semibold text-foreground">{account.label}</span>
              <span className="mt-0.5 text-xs text-muted-foreground">{account.promise}</span>
            </button>
          );
        })}
      </div>

      <div className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 ${ROLE_STYLES[selected.id].status}`} role="status" aria-live="polite">
        <div>
          <p className="text-sm font-semibold text-foreground">
            <span className={ROLE_STYLES[selected.id].text}>{selected.label}:</span> {selected.promise}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{selected.next}</p>
        </div>
        {selected.access === "open" ? (
          <Link to="/signup" onClick={() => onJoin(selected.id)} className="inline-flex shrink-0 items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            Create an account <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">Invitation only</span>
        )}
      </div>
    </section>
  );
}
