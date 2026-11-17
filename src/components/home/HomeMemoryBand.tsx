import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bookmark,
  CalendarCheck,
  EyeOff,
  FlaskConical,
  KeyRound,
  Lock,
  ShieldCheck,
  Layers,
  ListPlus,
  Pencil,
  Rocket,
  Search,
  Sparkles,
  Target,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import TitleFx from "@/components/home/TitleFx";
import { captureEvent } from "@/lib/analytics";
import "@/components/enterprise/enterprise.css";
import "./home-memory.css";

import pulseAnswerShot from "@/assets/pulse/pulse-answer.webp";
import pulseAnswerLightShot from "@/assets/pulse/pulse-answer-light.webp";
import pulseMemoryShot from "@/assets/pulse/pulse-memory.webp";
import pulseMemoryLightShot from "@/assets/pulse/pulse-memory-light.webp";
import pulseNoticedShot from "@/assets/pulse/pulse-noticed.webp";
import pulseNoticedLightShot from "@/assets/pulse/pulse-noticed-light.webp";

// The homepage band on project memory: what Pulse knows about a founder's
// project and what it does with it. Three designs while Javier picks one
// (?memory=a|b|c). Every claim is shipped behaviour, checked in code:
// - each tool's saved result joins the project's context (pulse-context.ts STAGES)
// - one context per project; switching project switches it (pulse-home.ts)
// - Pulse suggests memories, nothing is saved until the founder presses Save
//   (PulseMemoryChips), and every memory can be edited, closed or deleted
//   (PulseMemoryPanel)
// - a due commitment is asked about next time, Done / Not yet / Drop
//   (PulseCommitmentCheck); next steps become tasks in one tap (PulseTaskChips)
// - each answer lists the context Pulse was given (PulseSources)
// The examples use the sample project from the /demo tour (Throughline).

type Variant = "a" | "b" | "c";

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

// Who the memory belongs to, said before anything else. Each line is checked:
// Terms 5.1 (ownership); owner-only RLS on every project table and no admin
// screen that reads them; cohort consent lists what a program receives (idea
// details, files and messages never); Privacy Policy 4 (never sold); delete
// controls in PulseMemoryPanel, Pulse Home and /settings/delete-account; and
// AI providers listed as processors in Privacy Policy 5.1. Do not shorten this
// to "we have no access": the team runs the database and the AI provider
// writing an answer receives the context.
const PRIVACY: Array<{ title: string; body: string; icon: LucideIcon }> = [
  { title: "Yours", body: "You own what you create here. Delete any memory, any conversation or your whole account whenever you want.", icon: KeyRound },
  { title: "Not shared", body: "Other members can’t see it. If you join a program’s cohort, you see what it receives before you agree, and your idea details stay private.", icon: EyeOff },
  { title: "Not for sale", body: "Our team’s admin tools don’t show your workspace, and we never sell your work.", icon: ShieldCheck },
  { title: "Used for your answers", body: "When you ask Pulse something, your project context goes to the AI model that writes the answer.", icon: Sparkles },
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

/* ---------------------------------------------------------------- A ---- */
// "It learns as you build": each tool adds its saved result to what Pulse
// knows; the steps not done yet show what they will add.

const STEPS: Array<{ tool: string; icon: LucideIcon; done?: string; adds: string }> = [
  { tool: "ICP Builder", icon: Target, done: "Customer: creators publishing on YouTube, TikTok and a newsletter", adds: "Who it’s for" },
  { tool: "Demo Studio", icon: Sparkles, done: "Demand page: 12 creators replied", adds: "What people tried" },
  { tool: "PMF Lab", icon: FlaskConical, done: "21 interviews logged, decision not scored yet", adds: "What customers said" },
  { tool: "MVP Builder", icon: Layers, adds: "Adds your first version’s scope" },
  { tool: "GTM Strategist", icon: Search, adds: "Adds your launch plan and customer research" },
  { tool: "Traction Engine", icon: Rocket, adds: "Adds your experiments and what they showed" },
];

function VariantA() {
  return (
    <div className="hm-a hm-panel">
      <div className="hm-a__grid">
        <div className="hm-a__col">
          <p className="hm-kicker">What you finish</p>
          <ol className="hm-a__steps">
            {STEPS.map(({ tool, icon: Icon, done }, index) => (
              <li key={tool} className={`hm-a__step${done ? " is-done" : ""}`} style={{ "--i": index } as CSSProperties}>
                <span className="hm-a__dot"><Icon aria-hidden="true" /></span>
                <span className="hm-a__tool">{tool}</span>
                <span className="hm-a__state">{done ? "Saved" : "Next"}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="hm-a__col hm-a__col--knows">
          <div className="hm-a__knows-head">
            <p className="hm-kicker">What Pulse knows</p>
            <span className="hm-a__project">Example project · Throughline</span>
          </div>
          <div className="hm-a__meter" aria-hidden="true"><i /></div>
          <ul className="hm-a__chips">
            {STEPS.map(({ tool, done, adds }, index) => (
              <li key={tool} className={`hm-a__chip${done ? "" : " is-pending"}`} style={{ "--i": index } as CSSProperties}>
                <span className="hm-a__chip-tool">{tool}</span>
                <span className="hm-a__chip-text">{done ?? adds}</span>
              </li>
            ))}
            <li className="hm-a__chip is-memory" style={{ "--i": 6 } as CSSProperties}>
              <span className="hm-a__chip-tool"><Bookmark aria-hidden="true" /> Saved by Maya · Decision</span>
              <span className="hm-a__chip-text">Sell to creators first, not agencies</span>
            </li>
            <li className="hm-a__chip is-memory" style={{ "--i": 7 } as CSSProperties}>
              <span className="hm-a__chip-tool"><Bookmark aria-hidden="true" /> Saved by Maya · Commitment, due Friday</span>
              <span className="hm-a__chip-text">Recruit four creators from outside my audience</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="hm-a__answer">
        <p className="hm-a__q">“Should I start building the dashboard?”</p>
        <p className="hm-a__reply">
          <span className="hm-a__pulse">Pulse</span>
          Not yet. PMF Lab needs four more interviews before it scores a decision, and you committed to recruiting four creators
          from outside your audience by Friday. Do that first; the dashboard scope can wait a week.
        </p>
        <p className="hm-a__sources">Context provided to Pulse: ICP · Demo Studio · PMF Lab</p>
      </div>

      <ul className="hm-facts">
        <li><strong>One memory per project.</strong> Switch projects and Pulse switches with you.</li>
        <li><strong>You choose what it keeps.</strong> Pulse suggests; nothing is saved until you say so.</li>
        <li><strong>Commitments come back.</strong> When one is due, Pulse asks how it went.</li>
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- B ---- */
// "See it in the product": real Pulse Home screens on the sample project.

type Crop = { x: number; y: number; w: number; h: number };
type Hotspot = { left: number; top: number; label: string; side?: "left" | "below" };

const cropVars = (width: number, crop: Crop, suffix = "") => ({
  [`--ar${suffix}`]: `${crop.w} / ${crop.h}`,
  [`--iw${suffix}`]: `${(width / crop.w) * 100}%`,
  [`--il${suffix}`]: `${(-crop.x / crop.w) * 100}%`,
  [`--it${suffix}`]: `${(-crop.y / crop.h) * 100}%`,
});

/** A real screen cropped to the part worth reading; hotspots are in percent of the crop. */
const Shot = ({ src, lightSrc, width, crop, phoneCrop, title, alt, caption, hotspots = [] }: {
  src: string; lightSrc: string; width: number; crop: Crop; phoneCrop?: Crop; title: string; alt: string;
  caption: { when: string; text: string }; hotspots?: Hotspot[];
}) => {
  const vars = { ...cropVars(width, crop), ...cropVars(width, phoneCrop ?? crop, "-p") } as CSSProperties;
  return (
    <figure className="hm-shot">
      <div className="ent-window ent-shot">
        <div className="ent-window__bar">
          <span className="ent-window__dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="ent-window__title">{title}</span>
        </div>
        <div className={`hm-shot__media${phoneCrop ? " has-phone-crop" : ""}`} style={vars}>
          <img className="is-light" src={lightSrc} alt={alt} loading="lazy" decoding="async" />
          <img className="is-dark" src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          {hotspots.map((spot, index) => (
            <span
              key={spot.label}
              className={`ent-hotspot${spot.side ? ` is-${spot.side}` : ""}`}
              style={{ left: `${spot.left}%`, top: `${spot.top}%`, "--hotspot-delay": `${600 + index * 260}ms` } as CSSProperties}
              aria-hidden="true"
            >
              <i className="ent-hotspot__dot" />
              <span className="ent-hotspot__label">{spot.label}</span>
            </span>
          ))}
        </div>
      </div>
      <figcaption className="hm-shot__caption">
        <span className="hm-shot__when">{caption.when}</span>
        {caption.text}
      </figcaption>
    </figure>
  );
};

// The captures in src/assets/pulse are the real Pulse Home components on the
// /demo tour's sample project, already cropped (2x pixels). Phones get the
// answer's footer only, where the memory and task chips are.
const SHOTS = {
  answer: { width: 1720, crop: { x: 0, y: 0, w: 1720, h: 1500 }, phoneCrop: { x: 92, y: 1060, w: 1540, h: 450 } },
  memory: { width: 896, crop: { x: 0, y: 0, w: 896, h: 980 } },
  noticed: { width: 1240, crop: { x: 0, y: 0, w: 1240, h: 640 } },
};

function VariantB() {
  return (
    <div className="hm-b">
      <div className="hm-b__main">
        <Shot src={pulseAnswerShot} lightSrc={pulseAnswerLightShot} {...SHOTS.answer} title="Pulse · Throughline"
          caption={{ when: "Every answer", text: "From your saved results, with what to remember and what to do next" }}
          hotspots={[{ left: 30.5, top: 47, label: "The context Pulse was given" }]}
          alt="A Pulse answer on the sample project Throughline: it asks about a commitment that came due, answers from the project's PMF Lab interviews, offers to remember a decision and a commitment, offers two next steps as tasks, and lists the context it was given." />
      </div>
      <div className="hm-b__pair">
        <Shot src={pulseMemoryShot} lightSrc={pulseMemoryLightShot} {...SHOTS.memory} title="What Pulse remembers"
          caption={{ when: "Any time", text: "Edit, close or delete what it keeps" }}
          alt="The 'What Pulse remembers' panel: decisions, a hypothesis, a commitment and a fact saved by the founder, each with edit, status and delete controls." />
        <Shot src={pulseNoticedShot} lightSrc={pulseNoticedLightShot} {...SHOTS.noticed} title="Pulse Home"
          caption={{ when: "Each day", text: "Notes on your project, each linked to the tool behind it" }}
          alt="Pulse Home for the sample project: today's focus and the notes Pulse made about the project, each linking to the tool its evidence comes from." />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- C ---- */
// "Your project's memory": the four kinds of memory and what Pulse does with each.

const KINDS: Array<{ kind: string; tone: string; text: string; meta?: string; does: string }> = [
  { kind: "Decision", tone: "blue", text: "Sell to creators first, not agencies.", does: "Pulse’s advice builds on it, and it asks you about it when new evidence points the other way." },
  { kind: "Hypothesis", tone: "violet", text: "Creators will pay $19 a month for one growth view.", does: "Treated as unproven until your evidence backs it." },
  { kind: "Commitment", tone: "coral", text: "Recruit four creators from outside my audience.", meta: "Due Friday", does: "When it’s due, Pulse asks whether it happened: Done, Not yet or Drop." },
  { kind: "Fact", tone: "green", text: "Two founders, both part-time until March.", does: "Stays in context, so you never explain it twice." },
];

function VariantC() {
  return (
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
            <span className="hm-c__chip hm-c__chip--soft"><CalendarCheck /> Done · Not yet · Drop</span>
          </div>
        </article>
        <article className="hm-c__card" style={{ "--i": 3 } as CSSProperties}>
          <h3>One memory per project</h3>
          <p>Each project keeps its own results and notes. Switch projects and Pulse switches with you.</p>
        </article>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Section ---- */

const COPY: Record<Variant, { title: string; intro: string }> = {
  a: {
    title: "Pulse Learns Your Business as You Build",
    intro: "Every tool you finish saves its result to your project, and Pulse works from all of them in your next conversation.",
  },
  b: {
    title: "Pulse Remembers What You Decided",
    intro: "Your decisions, open questions and next steps stay with your project, where you can see every one.",
  },
  c: {
    title: "Your Project’s Memory, Kept by You",
    intro: "Pulse keeps four kinds of notes about your business, and only the ones you approve.",
  },
};

export default function HomeMemoryBand() {
  const [params] = useSearchParams();
  const requested = params.get("memory");
  const variant: Variant = requested === "b" || requested === "c" ? requested : "a";
  const { ref, state } = useEntrance<HTMLElement>();
  const copy = COPY[variant];

  return (
    <section ref={ref} id="home-memory" className={`hm-section hm--${variant}`} data-anim={state} aria-labelledby="home-memory-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="hm-header">
          <Badge variant="outline" className="homepage-section-badge mb-5">
            Project Memory
          </Badge>
          <h2 id="home-memory-heading" className="homepage-section-title text-3xl sm:text-4xl lg:text-[2.9rem]">
            <TitleFx variant="momentum" text={copy.title} />
          </h2>
          <p className="hm-intro">{copy.intro}</p>
        </div>

        {/* Everything under the title is the way in: one link laid over it opens
            /signup, as the programs band did with /enterprise. The text stays
            outside the link, so screen readers read it as normal content. */}
        <div className="hm-click">
          <PrivacyNote />
          {variant === "a" && <VariantA />}
          {variant === "b" && <VariantB />}
          {variant === "c" && <VariantC />}
          <Link to="/signup" className="hm-click__link" onClick={track("panel")}>
            <span className="sr-only">Start your project, free account</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
