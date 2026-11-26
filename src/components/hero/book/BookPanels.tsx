import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react";
import { Brain, Check, Pause, Play, Sparkles } from "lucide-react";

import heroCompass from "@/assets/hero-compass.svg";
import StartingExperiences from "@/components/hero/StartingExperiences";
import { IdCard, type IdCardPerson } from "@/components/founder-id/IdCard";
import { trackBook } from "./bookVersion";

// One example project across the panels, taken from the Founder ID band's
// example cards (HomeFounderIdBand.tsx), so the story stays consistent.
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

/** Calls `tick` on an interval while the element is on screen and `running`. */
function useVisibleInterval(ref: RefObject<HTMLElement | null>, running: boolean, ms: number, tick: () => void) {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  useEffect(() => {
    if (!running || reducedMotion()) return;
    let visible = true;
    const element = ref.current;
    const observer = element && typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => { visible = entries.some((entry) => entry.isIntersecting); })
      : null;
    if (element && observer) observer.observe(element);
    const id = window.setInterval(() => { if (visible) tickRef.current(); }, ms);
    return () => { window.clearInterval(id); observer?.disconnect(); };
  }, [ref, running, ms]);
}

/* ---------- 1. Chatbot ------------------------------------------------------ */

export function ChatPanel() {
  const [typing, setTyping] = useState(() => !reducedMotion());
  useEffect(() => {
    if (!typing) return;
    const id = window.setTimeout(() => setTyping(false), 1100);
    return () => window.clearTimeout(id);
  }, [typing]);

  return (
    <div className="hb-chat">
      <div className="hb-chat__head">
        <span className="hb-chat__avatar"><img src={heroCompass} alt="" aria-hidden="true" /></span>
        <span className="hb-chat__who">
          <b>The Founders' Compass</b>
          <span><i className="hb-chat__dot" aria-hidden="true" /> Online</span>
        </span>
      </div>
      <div className="hb-chat__body" aria-live="polite">
        {typing ? (
          <div className="hb-chat__bubble hb-chat__bubble--typing" aria-label="Typing">
            <i /><i /><i />
          </div>
        ) : (
          <div className="hb-chat__bubble">
            Hi! What are you building? Tell me in one sentence and I'll draft who it's for.
          </div>
        )}
      </div>
      <div className="hb-chat__composer">
        <StartingExperiences />
      </div>
    </div>
  );
}

/* ---------- 2. Story reel ---------------------------------------------------- */

const SCENES = [
  { key: "customer", caption: "Know your customer", tone: "#4f8ff7" },
  { key: "page", caption: "Put your idea in front of people", tone: "#f37575" },
  { key: "pulse", caption: "Pulse remembers your decisions", tone: "#25cb7a" },
  { key: "id", caption: "Share your Founder ID", tone: "#d4a74a" },
] as const;

const SCENE_MS = 3800;

export function ReelPanel() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useVisibleInterval(ref, playing, SCENE_MS, () => setIndex((value) => (value + 1) % SCENES.length));

  const go = (next: number) => {
    setIndex((next + SCENES.length) % SCENES.length);
    trackBook(2, "reel_navigate", { scene: SCENES[(next + SCENES.length) % SCENES.length].key });
  };
  const scene = SCENES[index];
  const animated = playing && !reducedMotion();

  return (
    <div className="hb-reel" ref={ref} style={{ "--tone": scene.tone } as CSSProperties}>
      <div className="hb-reel__bars" aria-hidden="true">
        {SCENES.map((item, i) => (
          <span key={item.key} className={i < index ? "is-done" : i === index ? (animated ? "is-on" : "is-done") : ""}>
            <i style={{ animationDuration: `${SCENE_MS}ms` }} key={`${item.key}-${index}`} />
          </span>
        ))}
      </div>
      <div className="hb-reel__top">
        <span className="hb-reel__project">Truckbooks · example project</span>
        <button
          type="button"
          className="hb-reel__play"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? "Pause the reel" : "Play the reel"}
        >
          {playing ? <Pause /> : <Play />}
        </button>
      </div>

      <div className="hb-reel__stage" key={scene.key}>
        {scene.key === "customer" ? (
          <div className="hb-reel__card">
            <span className="hb-reel__kicker">Customer draft</span>
            <div className="hb-reel__row"><span>Customer</span><b>Food truck owners, 1–3 trucks</b></div>
            <div className="hb-reel__row"><span>Top pain</span><b>Receipts pile up until tax season</b></div>
            <div className="hb-reel__row"><span>Build first</span><b>Snap-a-receipt expense log</b></div>
            <div className="hb-reel__row"><span>Your edge</span><b>Made for cash-heavy days</b></div>
          </div>
        ) : null}
        {scene.key === "page" ? (
          <div className="hb-reel__page">
            <span className="hb-reel__url">truckbooks · waitlist page</span>
            <b className="hb-reel__page-h">Your books, done before the lunch rush.</b>
            <span className="hb-reel__page-p">Snap a receipt. Truckbooks files it.</span>
            <span className="hb-reel__page-btn">Join the waitlist</span>
            <span className="hb-reel__page-meta"><Check /> Shareable link ready</span>
          </div>
        ) : null}
        {scene.key === "pulse" ? (
          <div className="hb-reel__pulse">
            <div className="hb-reel__q">Should I add payroll next?</div>
            <div className="hb-reel__a">
              <span className="hb-reel__a-head"><Brain /> Pulse</span>
              You decided to start with receipts only, and payroll waits until trucks use it every week. Stay on receipts for now.
              <span className="hb-reel__memory">From your project memory · Decision</span>
            </div>
          </div>
        ) : null}
        {scene.key === "id" ? (
          <div className="hb-reel__id">
            <IdCard person={AMARA} label="Example Founder ID card for Amara Okafor" />
          </div>
        ) : null}
      </div>

      <p className="hb-reel__caption">{scene.caption}</p>
      <button type="button" className="hb-reel__nav hb-reel__nav--prev" onClick={() => go(index - 1)} aria-label="Previous scene" />
      <button type="button" className="hb-reel__nav hb-reel__nav--next" onClick={() => go(index + 1)} aria-label="Next scene" />
    </div>
  );
}

/* ---------- 3. Interactive compass ------------------------------------------ */

const STAGES = [
  { name: "Identity", tool: "ICP Builder", result: "One customer to focus on and their top pains." },
  { name: "Prototyping", tool: "Demo Studio", result: "A waitlist page with a shareable link." },
  { name: "Validation", tool: "PMF Lab", result: "Interviews that lead to one clear decision." },
  { name: "Building", tool: "MVP Builder", result: "A first version scoped from your evidence." },
  { name: "Launch", tool: "GTM Strategist", result: "One acquisition play, tested on real prospects." },
  { name: "Traction", tool: "Traction Engine", result: "Results logged week by week." },
  { name: "Fundraising", tool: "Find Your Angel", result: "A readiness check and investors that fit." },
];
const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

export function CompassPanel() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useVisibleInterval(ref, auto, 2600, () => setActive((value) => (value + 1) % STAGES.length));

  const pick = (index: number) => {
    setAuto(false);
    setActive(index);
    trackBook(3, "stage_selected", { stage: STAGES[index].name });
  };
  const stage = STAGES[active];
  const step = 360 / STAGES.length;

  return (
    <div className="hb-compass" ref={ref}>
      <div className="hb-compass__dial" style={{ "--needle": `${active * step}deg` } as CSSProperties}>
        <span className="hb-compass__ring" aria-hidden="true" />
        <span className="hb-compass__ticks" aria-hidden="true" />
        <span className="hb-compass__needle" aria-hidden="true" />
        {STAGES.map((item, index) => (
          <button
            key={item.name}
            type="button"
            className={`hb-compass__label${index === active ? " is-on" : ""}`}
            style={{ "--a": `${index * step}deg` } as CSSProperties}
            onMouseEnter={() => pick(index)}
            onFocus={() => pick(index)}
            onClick={() => pick(index)}
            aria-pressed={index === active}
          >
            <span className="hb-compass__n">{NUMERALS[index]}</span>
            <span className="hb-compass__t"> · {item.name}</span>
          </button>
        ))}
        <div className="hb-compass__core" aria-live="polite">
          <span className="hb-compass__k">Stage {NUMERALS[active]}</span>
          <b className="hb-compass__name">{stage.name}</b>
          <span className="hb-compass__tool">{stage.tool}</span>
          <span className="hb-compass__result">{stage.result}</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- 4. Moodboard ----------------------------------------------------- */

export function MoodboardPanel() {
  const boardRef = useRef<HTMLDivElement>(null);
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || reducedMotion() || !boardRef.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    boardRef.current.style.setProperty("--mx", ((event.clientX - box.left) / box.width - 0.5).toFixed(3));
    boardRef.current.style.setProperty("--my", ((event.clientY - box.top) / box.height - 0.5).toFixed(3));
  };
  const reset = () => {
    boardRef.current?.style.setProperty("--mx", "0");
    boardRef.current?.style.setProperty("--my", "0");
  };

  return (
    <div className="hb-board" ref={boardRef} onPointerMove={onMove} onPointerLeave={reset}>
      <span className="hb-board__blob hb-board__blob--1" aria-hidden="true" />
      <span className="hb-board__blob hb-board__blob--2" aria-hidden="true" />

      <div className="hb-board__item hb-board__icp" style={{ "--d": 18, "--r": "-5deg" } as CSSProperties}>
        <span className="hb-board__tape" aria-hidden="true" />
        <span className="hb-board__kicker">Customer draft</span>
        <b>Food truck owners</b>
        <span>Pain: receipts pile up until tax season</span>
        <span>Build first: snap-a-receipt log</span>
      </div>

      <div className="hb-board__item hb-board__page" style={{ "--d": 10, "--r": "4deg" } as CSSProperties}>
        <span className="hb-board__url"><i /><i /><i /> truckbooks</span>
        <b>Your books, done before the lunch rush.</b>
        <span className="hb-board__btn">Join the waitlist</span>
      </div>

      <div className="hb-board__item hb-board__id" style={{ "--d": 26, "--r": "-2deg" } as CSSProperties}>
        <IdCard person={AMARA} label="Example Founder ID card for Amara Okafor" />
      </div>

      <div className="hb-board__item hb-board__note" style={{ "--d": 34, "--r": "6deg" } as CSSProperties}>
        <span className="hb-board__note-k"><Brain /> Pulse remembers</span>
        Decision: receipts first, payroll later.
      </div>

      <div className="hb-board__item hb-board__stamp" style={{ "--d": 40, "--r": "-14deg" } as CSSProperties}>
        <Sparkles />
        <span>Free to start</span>
        <b>No equity</b>
      </div>

      <svg className="hb-board__doodle" viewBox="0 0 200 120" aria-hidden="true">
        <path d="M10 100 C 60 20, 120 120, 185 30" fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 9" />
        <path d="M172 26 L186 29 L180 42" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="hb-board__label">Example project: Truckbooks</p>
    </div>
  );
}
