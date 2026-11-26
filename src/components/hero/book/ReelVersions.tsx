import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowUpRight, BarChart3, Brain, Briefcase, CalendarCheck, Check, GraduationCap, Handshake, Hash,
  LayoutDashboard, MessageCircle, MousePointerClick, Pause, Play, Rocket, Send, Sparkles, Users,
} from "lucide-react";

import { IdCard, type IdCardPerson } from "@/components/founder-id/IdCard";
import { trackBook, type BookVersion } from "./bookVersion";

// PREVIEW ONLY (branch hero-book). Three story reels of the platform:
// A walks through the workspace tools, B the people around a project,
// C one example founder's week. Copy follows the homepage's own wording
// (EntrepreneurProblems.tsx, ValuePropositionCards.tsx, cycle stages).

const AMARA: IdCardPerson = {
  name: "Amara Okafor",
  handle: "amaraokafor",
  number: "000 208",
  stage: "Validation",
  project: "Truckbooks",
  tagline: "Bookkeeping for food trucks",
};

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Scene = { key: string; label: string; caption: string; tone: string; icon: typeof Rocket; body: ReactNode };

/** Shared player: progress, autoplay while on screen, pause, tap or click to move. */
function useReel(count: number, ms: number, version: BookVersion, keys: string[]) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!playing || reducedMotion()) return;
    let visible = true;
    const element = ref.current;
    const observer = element && typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => { visible = entries.some((entry) => entry.isIntersecting); })
      : null;
    if (element && observer) observer.observe(element);
    const id = window.setInterval(() => { if (visible) setIndex((value) => (value + 1) % count); }, ms);
    return () => { window.clearInterval(id); observer?.disconnect(); };
  }, [playing, count, ms]);
  const go = (next: number) => {
    const target = (next + count) % count;
    setIndex(target);
    trackBook(version, "reel_navigate", { scene: keys[target] });
  };
  const jump = (target: number) => {
    setPlaying(false);
    go(target);
  };
  return { index, playing, setPlaying, ref, go, jump, animated: playing && !reducedMotion() };
}

function PlayButton({ playing, onToggle, className }: { playing: boolean; onToggle: () => void; className: string }) {
  return (
    <button type="button" className={className} onClick={onToggle} aria-label={playing ? "Pause the reel" : "Play the reel"}>
      {playing ? <Pause /> : <Play />}
    </button>
  );
}

/* ======================================================================
   A. Inside the workspace: a tall phone-style story through the tools
   ====================================================================== */

const A_SCENES: Scene[] = [
  {
    key: "dashboard", label: "Dashboard", caption: "See what matters this week", tone: "#4f8ff7", icon: LayoutDashboard,
    body: (
      <div className="rv-app">
        <span className="rv-app__crumb">Validation · Stage III of VII</span>
        <b className="rv-app__h">You're validating. Here's what matters this week.</b>
        <ul className="rv-tasks">
          <li className="is-done"><Check /> Customer profile saved</li>
          <li className="is-now"><Users /> Talk to 5 people this week</li>
          <li><Send /> Share your waitlist page</li>
        </ul>
        <div className="rv-bars" aria-hidden="true">{[34, 48, 42, 60, 55, 72, 80].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
      </div>
    ),
  },
  {
    key: "pulse", label: "Pulse", caption: "Ask Pulse. It knows your project", tone: "#25cb7a", icon: Brain,
    body: (
      <div className="rv-app rv-chat">
        <div className="rv-chat__q">Should I add payroll next?</div>
        <div className="rv-chat__a">
          <span className="rv-chat__who"><Brain /> Pulse</span>
          You decided to start with receipts only. Stay on receipts until trucks use it every week.
          <span className="rv-chip rv-chip--green">From your project memory · Decision</span>
        </div>
      </div>
    ),
  },
  {
    key: "icp", label: "ICP Builder", caption: "Know exactly who it's for", tone: "#f5a524", icon: Users,
    body: (
      <div className="rv-app">
        <span className="rv-app__kicker">Customer draft</span>
        <div className="rv-kv"><span>Customer</span><b>Food truck owners, 1–3 trucks</b></div>
        <div className="rv-kv"><span>Top pain</span><b>Receipts pile up until tax season</b></div>
        <div className="rv-kv"><span>Build first</span><b>Snap-a-receipt expense log</b></div>
        <div className="rv-kv"><span>Your edge</span><b>Made for cash-heavy days</b></div>
      </div>
    ),
  },
  {
    key: "demo", label: "Demo Studio", caption: "Put a page in front of real people", tone: "#f37575", icon: Sparkles,
    body: (
      <div className="rv-app rv-page">
        <span className="rv-page__url">truckbooks · waitlist</span>
        <b className="rv-page__h">Your books, done before the lunch rush.</b>
        <span className="rv-page__p">Snap a receipt. Truckbooks files it.</span>
        <span className="rv-page__btn">Join the waitlist</span>
      </div>
    ),
  },
  {
    key: "mvp", label: "MVP Builder", caption: "Click through your first version", tone: "#8b5cf6", icon: MousePointerClick,
    body: (
      <div className="rv-app rv-proto">
        <span className="rv-app__kicker">Clickable prototype</span>
        <div className="rv-proto__screen">
          <span className="rv-proto__title">New receipt</span>
          <span className="rv-proto__photo" aria-hidden="true" />
          <span className="rv-proto__row"><i>Fuel</i><b>$42.10</b></span>
          <span className="rv-proto__btn">Save to books <MousePointerClick /></span>
        </div>
      </div>
    ),
  },
  {
    key: "id", label: "Founder ID", caption: "Show the world what you're building", tone: "#d4a74a", icon: Rocket,
    body: <div className="rv-idwrap"><IdCard person={AMARA} label="Example Founder ID card for Amara Okafor" /></div>,
  },
];

export function ReelA() {
  const reel = useReel(A_SCENES.length, 3400, "a", A_SCENES.map((s) => s.key));
  const scene = A_SCENES[reel.index];
  return (
    <div className="rv rv-a" ref={reel.ref} style={{ "--tone": scene.tone } as CSSProperties}>
      <ol className="rv-a__rail" aria-label="Sections">
        {A_SCENES.map((item, i) => {
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <button type="button" className={i === reel.index ? "is-on" : ""} onClick={() => reel.jump(i)} aria-pressed={i === reel.index}>
                <Icon aria-hidden="true" /> {item.label}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="rv-a__phone">
        <div className="rv-bars-top" aria-hidden="true">
          {A_SCENES.map((item, i) => (
            <span key={item.key} className={i < reel.index ? "is-done" : i === reel.index ? (reel.animated ? "is-on" : "is-done") : ""}>
              <i style={{ animationDuration: "3400ms" }} key={`${item.key}-${reel.index}`} />
            </span>
          ))}
        </div>
        <div className="rv-a__top">
          <span className="rv-a__app"><scene.icon aria-hidden="true" /> {scene.label}</span>
          <PlayButton playing={reel.playing} onToggle={() => reel.setPlaying((v) => !v)} className="rv-play" />
        </div>
        <div className="rv-stage" key={scene.key}>{scene.body}</div>
        <p className="rv-a__caption">{scene.caption}</p>
        <button type="button" className="rv-tap rv-tap--prev" onClick={() => reel.go(reel.index - 1)} aria-label="Previous section" />
        <button type="button" className="rv-tap rv-tap--next" onClick={() => reel.go(reel.index + 1)} aria-label="Next section" />
      </div>
      <p className="rv-note">Example project: Truckbooks</p>
    </div>
  );
}

/* ======================================================================
   B. Everyone you need: a wide cinematic reel about the people around you
   ====================================================================== */

const B_SCENES: Scene[] = [
  {
    key: "mentors", label: "Mentors", caption: "Advice from people who've done it", tone: "#14b8a6", icon: GraduationCap,
    body: (
      <div className="rv-people">
        {[["SK", "Pricing"], ["LM", "B2B sales"], ["DR", "Fintech"]].map(([initials, field], i) => (
          <div className="rv-person" key={initials} style={{ "--i": i } as CSSProperties}>
            <span className="rv-avatar">{initials}</span>
            <b>Mentor</b>
            <span className="rv-chip">{field}</span>
          </div>
        ))}
        <p className="rv-people__line">Find experts in specific fields and get feedback on the decision in front of you.</p>
      </div>
    ),
  },
  {
    key: "cofounder", label: "Cofounders", caption: "Someone to share the work", tone: "#8b5cf6", icon: Users,
    body: (
      <div className="rv-match">
        <div className="rv-match__card"><span className="rv-avatar">AO</span><b>You</b><span>Ops · Sales</span></div>
        <span className="rv-match__plus" aria-hidden="true"><Sparkles /></span>
        <div className="rv-match__card"><span className="rv-avatar rv-avatar--alt">JT</span><b>Cofounder</b><span>Engineering · Product</span></div>
        <p className="rv-people__line">Find a cofounder whose skills fill the gaps in yours.</p>
      </div>
    ),
  },
  {
    key: "marketplace", label: "Marketplace", caption: "Hands when you need them", tone: "#f5a524", icon: Briefcase,
    body: (
      <div className="rv-tiles">
        {[["Sales", BarChart3], ["Marketing", Sparkles], ["Operations", CalendarCheck], ["Automation", Rocket], ["Tech support", MessageCircle]].map(([name, Icon], i) => {
          const TileIcon = Icon as typeof Rocket;
          return <span className="rv-tile" key={name as string} style={{ "--i": i } as CSSProperties}><TileIcon aria-hidden="true" /> {name as string}</span>;
        })}
        <p className="rv-people__line">Service providers on the same platform where you build.</p>
      </div>
    ),
  },
  {
    key: "investors", label: "Investors", caption: "Investors that match your stage", tone: "#22c55e", icon: Handshake,
    body: (
      <div className="rv-investor">
        <div className="rv-investor__card">
          <span className="rv-avatar rv-avatar--green">MV</span>
          <div><b>Angel investor</b><span>Pre-seed · Fintech · Food & beverage</span></div>
          <span className="rv-chip rv-chip--green">Matches your stage</span>
        </div>
        <p className="rv-people__line">Build a target list of investors and accelerators that match your stage and sector. Find Your Angel is on the Pro plan.</p>
      </div>
    ),
  },
  {
    key: "launchpad", label: "Launchpad", caption: "Founders building next to you", tone: "#4f8ff7", icon: Hash,
    body: (
      <div className="rv-feed">
        <div className="rv-post"><span className="rv-avatar">AO</span><div><b>#validation</b><span>5 interviews done. Receipts are the pain, not payroll.</span></div></div>
        <div className="rv-post"><span className="rv-avatar rv-avatar--alt">MT</span><div><b>#launch</b><span>Feedback wanted on my waitlist page headline.</span></div></div>
        <div className="rv-post"><span className="rv-avatar rv-avatar--green">LF</span><div><b>#building</b><span>Cut the v1 to one workflow. Shipping Friday.</span></div></div>
      </div>
    ),
  },
  {
    key: "id", label: "Founder ID", caption: "One profile everyone can find", tone: "#d4a74a", icon: Rocket,
    body: <div className="rv-idwrap rv-idwrap--wide"><IdCard person={AMARA} label="Example Founder ID card for Amara Okafor" /></div>,
  },
];

export function ReelB() {
  const reel = useReel(B_SCENES.length, 3600, "b", B_SCENES.map((s) => s.key));
  const scene = B_SCENES[reel.index];
  return (
    <div className="rv rv-b" ref={reel.ref} style={{ "--tone": scene.tone } as CSSProperties}>
      <div className="rv-bars-top" aria-hidden="true">
        {B_SCENES.map((item, i) => (
          <span key={item.key} className={i < reel.index ? "is-done" : i === reel.index ? (reel.animated ? "is-on" : "is-done") : ""}>
            <i style={{ animationDuration: "3600ms" }} key={`${item.key}-${reel.index}`} />
          </span>
        ))}
      </div>
      <div className="rv-b__top">
        <span className="rv-b__label"><scene.icon aria-hidden="true" /> {scene.label}</span>
        <PlayButton playing={reel.playing} onToggle={() => reel.setPlaying((v) => !v)} className="rv-play" />
      </div>
      <h3 className="rv-b__caption" key={`c-${scene.key}`}>{scene.caption}</h3>
      <div className="rv-stage" key={scene.key}>{scene.body}</div>
      <div className="rv-b__dots" role="tablist" aria-label="Sections">
        {B_SCENES.map((item, i) => (
          <button key={item.key} type="button" role="tab" aria-selected={i === reel.index} className={i === reel.index ? "is-on" : ""} onClick={() => reel.jump(i)}>
            {item.label}
          </button>
        ))}
      </div>
      <button type="button" className="rv-tap rv-tap--prev" onClick={() => reel.go(reel.index - 1)} aria-label="Previous section" />
      <button type="button" className="rv-tap rv-tap--next" onClick={() => reel.go(reel.index + 1)} aria-label="Next section" />
      <p className="rv-note rv-note--in">Examples, not real members</p>
    </div>
  );
}

/* ======================================================================
   C. A founder's week: Monday to Friday with one example founder
   ====================================================================== */

const C_DAYS: (Scene & { day: string })[] = [
  {
    key: "mon", day: "Mon", label: "Dashboard", caption: "Monday: the plan for the week", tone: "#4f8ff7", icon: LayoutDashboard,
    body: (
      <div className="rv-app">
        <span className="rv-app__crumb">This week</span>
        <ul className="rv-tasks">
          <li className="is-now"><Users /> Talk to 5 people</li>
          <li><Sparkles /> Publish the waitlist page</li>
          <li><Check /> Log what you learn</li>
        </ul>
      </div>
    ),
  },
  {
    key: "tue", day: "Tue", label: "Pulse", caption: "Tuesday: Amara asks Pulse", tone: "#25cb7a", icon: Brain,
    body: (
      <div className="rv-app rv-chat">
        <div className="rv-chat__q">Who should I interview first?</div>
        <div className="rv-chat__a">
          <span className="rv-chat__who"><Brain /> Pulse</span>
          Start with owners who run 1–3 trucks and still keep paper receipts. That's the customer in your profile.
        </div>
      </div>
    ),
  },
  {
    key: "wed", day: "Wed", label: "Demo Studio", caption: "Wednesday: the page goes live", tone: "#f37575", icon: Sparkles,
    body: (
      <div className="rv-app rv-page">
        <span className="rv-page__url">truckbooks · waitlist</span>
        <b className="rv-page__h">Your books, done before the lunch rush.</b>
        <span className="rv-page__btn">Join the waitlist</span>
        <span className="rv-page__meta"><ArrowUpRight /> Link shared with 12 truck owners</span>
      </div>
    ),
  },
  {
    key: "thu", day: "Thu", label: "PMF Lab", caption: "Thursday: what customers said", tone: "#f5a524", icon: MessageCircle,
    body: (
      <div className="rv-app">
        <span className="rv-app__kicker">Interviews logged · 5 of 5</span>
        <div className="rv-quote">"I lose a shoebox of receipts every quarter."</div>
        <div className="rv-quote">"Payroll is fine. Receipts are the mess."</div>
        <span className="rv-chip rv-chip--amber">Decision: narrow to receipts</span>
      </div>
    ),
  },
  {
    key: "fri", day: "Fri", label: "Founder ID", caption: "Friday: Amara shares her progress", tone: "#d4a74a", icon: Rocket,
    body: <div className="rv-idwrap"><IdCard person={AMARA} label="Example Founder ID card for Amara Okafor" /></div>,
  },
];

export function ReelC() {
  const reel = useReel(C_DAYS.length, 3600, "c", C_DAYS.map((s) => s.key));
  const scene = C_DAYS[reel.index];
  return (
    <div className="rv rv-c" ref={reel.ref} style={{ "--tone": scene.tone } as CSSProperties}>
      <div className="rv-c__days" role="tablist" aria-label="Days of the week">
        {C_DAYS.map((item, i) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={i === reel.index}
            className={`${i === reel.index ? "is-on" : ""}${i < reel.index ? " is-done" : ""}`}
            onClick={() => reel.jump(i)}
          >
            <b>{item.day}</b>
            <span>{item.label}</span>
            {i === reel.index && reel.animated ? <i style={{ animationDuration: "3600ms" }} key={`p-${reel.index}`} /> : null}
          </button>
        ))}
      </div>
      <div className="rv-c__screen">
        <div className="rv-c__top">
          <span className="rv-c__who"><span className="rv-avatar">AO</span> Amara · Truckbooks</span>
          <PlayButton playing={reel.playing} onToggle={() => reel.setPlaying((v) => !v)} className="rv-play" />
        </div>
        <div className="rv-stage" key={scene.key}>{scene.body}</div>
        <p className="rv-c__caption">{scene.caption}</p>
        <button type="button" className="rv-tap rv-tap--prev" onClick={() => reel.go(reel.index - 1)} aria-label="Previous day" />
        <button type="button" className="rv-tap rv-tap--next" onClick={() => reel.go(reel.index + 1)} aria-label="Next day" />
      </div>
      <p className="rv-note">An example founder's week</p>
    </div>
  );
}
