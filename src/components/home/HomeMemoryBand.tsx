import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  EyeOff,
  KeyRound,
  ListPlus,
  Lock,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import PulseBrain from "@/components/home/PulseBrain";
import TitleFx from "@/components/home/TitleFx";
import { captureEvent } from "@/lib/analytics";
import "./home-memory.css";

// The homepage band on project memory: what Pulse keeps about a founder's
// project, what it does with it, and that it belongs to the account. It took
// the programs band's slot (programs reach /enterprise from the nav and FAQ).
// Every claim is shipped behaviour, checked in code:
// - Pulse suggests memories (decision, hypothesis, commitment, fact) and
//   nothing is saved until the founder presses Save (PulseMemoryChips)
// - every memory can be edited, closed or deleted (PulseMemoryPanel)
// - a due commitment is asked about next time, Done / Not yet / Drop
//   (PulseCommitmentCheck); next steps become tasks in one tap (PulseTaskChips)
// - one context per project; switching project switches it (pulse-home.ts)
// The examples use the sample project from the /demo tour (Throughline).
// Under the title, a living neural brain (PulseBrain) shows the tools feeding
// Pulse and the four memory lobes lighting up.

const track = (placement: string) => () => captureEvent("home_memory_band_clicked", { placement });

/** Plays the entrance once, when the band scrolls into view; without JS everything just shows. */
function useEntrance<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [state, setState] = useState<"idle" | "ready" | "in">("idle");
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    setState("ready");
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setState("in");
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, state };
}

// Who the memory belongs to and how it is protected, said before anything
// else. Each line is checked:
// - Yours: Terms 5.1 (ownership); delete controls in PulseMemoryPanel, Pulse
//   Home and /settings/delete-account.
// - Private: owner-only RLS on every project table; no admin screen reads
//   them; anything shared (Founder ID, a program's cohort) is the founder's
//   own choice, with consent.
// - Secure: Supabase encrypts all customer data at rest (AES-256) and in
//   transit (TLS) and is ISO 27001 certified (supabase.com/security, checked
//   2026-11-17). Javier asked to name only ISO 27001 and not the location.
// - Never sold: Privacy Policy 4; AI providers are listed as processors
//   (Privacy Policy 5.1), so say plainly that Pulse sends them the context.
// Never shorten this to "we have no access": the team runs the database and
// the AI provider writing an answer receives the context.
const PRIVACY: Array<{ title: string; body: string; icon: LucideIcon }> = [
  { title: "Yours", body: "You own what you create here. Delete any memory, any conversation or your whole account whenever you want.", icon: KeyRound },
  { title: "Private", body: "Other members can’t see your workspace, our admin tools don’t show it, and nothing in it is shared unless you choose to share it.", icon: EyeOff },
  { title: "Secure", body: "Encrypted in transit and at rest (AES‑256), and stored on ISO 27001 certified infrastructure.", icon: ShieldCheck },
  { title: "Never sold", body: "We never sell your work. When you ask Pulse something, your project context goes to the AI model that writes the answer.", icon: Sparkles },
];

const PrivacyNote = () => (
  <aside className="hm-privacy" aria-labelledby="home-memory-privacy">
    <div className="hm-privacy__head">
      <span className="hm-privacy__lock"><Lock aria-hidden="true" /></span>
      <div>
        <h3 id="home-memory-privacy" className="hm-privacy__title">Private to your account</h3>
        <p className="hm-privacy__lede">Your project’s memory belongs to your account, and only your account can open it.</p>
      </div>
    </div>
    <ul className="hm-privacy__list">
      {PRIVACY.map(({ title, body, icon: Icon }) => (
        <li key={title}>
          <Icon aria-hidden="true" />
          <p><strong>{title}.</strong> {body}</p>
        </li>
      ))}
    </ul>
  </aside>
);

// The four kinds of memory, each with an example in the founder's words and
// what Pulse does with it.
const KINDS: Array<{ kind: string; tone: string; text: string; meta?: string; does: string }> = [
  { kind: "Decision", tone: "blue", text: "Sell to creators first, not agencies.", does: "Pulse’s advice builds on it, and it asks you about it when new evidence points the other way." },
  { kind: "Hypothesis", tone: "violet", text: "Creators will pay $19 a month for one growth view.", does: "Treated as unproven until your evidence backs it." },
  { kind: "Commitment", tone: "coral", text: "Recruit four creators from outside my audience.", meta: "Due Friday", does: "Once it’s due, Pulse asks the next time you talk whether it happened: Done, Not yet or Drop." },
  { kind: "Fact", tone: "green", text: "Two founders, both part-time until March.", does: "Stays in context, so you never explain it twice." },
];

const Memory = () => (
  <div className="hm-c">
    <div className="hm-c__ledger">
      <div className="hm-c__ledger-head">
        <span className="hm-c__mono">Pulse remembers (4)</span>
        <span className="hm-c__mono hm-c__muted">Throughline · example</span>
      </div>
      <ul className="hm-c__kinds">
        {KINDS.map(({ kind, tone, text, meta, does }, index) => (
          <li key={kind} className={`hm-c__kind hm-c__kind--${tone}`} style={{ "--i": index } as CSSProperties}>
            <span className="hm-c__label">{kind}{meta ? <span className="hm-c__meta"> · {meta}</span> : null}</span>
            <p className="hm-c__text">{text}</p>
            <p className="hm-c__does">{does}</p>
          </li>
        ))}
      </ul>
    </div>

    <div className="hm-c__side">
      <article className="hm-c__card" style={{ "--i": 0 } as CSSProperties}>
        <h3>You approve every memory</h3>
        <p>Pulse offers to remember what you decide. Nothing is saved until you press Save, and you can reword it first.</p>
        <div className="hm-c__demo" aria-hidden="true">
          <span className="hm-c__chip"><Bookmark /> Remember · Decision</span>
          <span className="hm-c__btn">Save</span>
        </div>
      </article>
      <article className="hm-c__card" style={{ "--i": 1 } as CSSProperties}>
        <h3>See and change all of it</h3>
        <p>One panel lists everything Pulse keeps. Edit it, mark it done or dropped, or delete it.</p>
        <div className="hm-c__demo" aria-hidden="true">
          <span className="hm-c__chip"><Bookmark /> Pulse remembers (4)</span>
          <Pencil className="hm-c__icon" />
          <Trash2 className="hm-c__icon" />
        </div>
      </article>
      <article className="hm-c__card" style={{ "--i": 2 } as CSSProperties}>
        <h3>Next steps land on your list</h3>
        <p>When an answer ends with something to do, add it to your tasks in one tap.</p>
        <div className="hm-c__demo" aria-hidden="true">
          <span className="hm-c__chip"><ListPlus /> Add as task</span>
        </div>
      </article>
      <article className="hm-c__card" style={{ "--i": 3 } as CSSProperties}>
        <h3>One memory per project</h3>
        <p>Each project keeps its own results and notes. Switch projects and Pulse switches with you.</p>
      </article>
    </div>
  </div>
);

export default function HomeMemoryBand() {
  const { ref, state } = useEntrance<HTMLElement>();

  return (
    <section ref={ref} id="home-memory" className="hm-section" data-anim={state} aria-labelledby="home-memory-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="hm-header">
          <Badge variant="outline" className="homepage-section-badge mb-5">
            Project Memory
          </Badge>
          <h2 id="home-memory-heading" className="homepage-section-title text-3xl sm:text-4xl lg:text-[2.9rem]">
            <TitleFx variant="momentum" text="Pulse Learns Your Business as You Grow" />
          </h2>
          <p className="hm-intro">Your decisions, hypotheses, commitments and facts, saved once and used in every Pulse answer.</p>
        </div>

        {/* Everything under the title is the way in: one link laid over it opens
            /signup, as the programs band did with /enterprise. The text stays
            outside the link, so screen readers read it as normal content. */}
        <div className="hm-click">
          <PulseBrain />
          <PrivacyNote />
          {/* Sits above the sign-up overlay so it opens the full data guide. */}
          <Link to="/data-privacy" className="hm-privacy__more" onClick={track("data_privacy")}>
            How we protect your data <ArrowRight aria-hidden="true" />
          </Link>
          <Memory />
          <Link to="/signup" className="hm-click__link" onClick={track("panel")}>
            <span className="sr-only">Start your project, free account</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
