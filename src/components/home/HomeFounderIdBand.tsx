import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Copy, Heart, MessageCircle, Repeat2 } from "lucide-react";

import { IdCard, type IdCardPerson } from "@/components/founder-id/IdCard";
import { captureEvent } from "@/lib/analytics";
import { FOUNDER_ID_HERO, FOUNDER_ID_PATH } from "@/data/founderIdPage";
import TitleFx from "@/components/home/TitleFx";
import "@/components/founder-id/founder-id.css";
import "./home-founder-id.css";

// The homepage Founder ID section, in the card's own charcoal and champagne
// gold (api/_founder-id-card.tsx). Copy comes from the approved /founder-id page.
// The card design is fixed, so the examples only vary what a founder sets:
// name, @handle, project, tagline and stage, which can be hidden.
//
// Three designs are back under review on the homepage-positioning branch (C is
// live); pick one with ?fid=a|b|c. The chosen one stays and the others go.

type Variant = "a" | "b" | "c";
type Example = IdCardPerson & { project: string; pitch: string };

// Ordinary names, handles and invented project names, checked against profiles
// on 2026-11-06 so none of them belongs to a real account.
const EXAMPLES: Example[] = [
  { name: "Lucas Ferreira", handle: "lucasferreira", number: "000 562", stage: "Building", project: "Nursechat", tagline: "Language lessons for nurses", pitch: "a language lessons app for nurses" },
  { name: "Amara Okafor", handle: "amaraokafor", number: "000 208", stage: "Validation", project: "Truckbooks", tagline: "Bookkeeping for food trucks", pitch: "a bookkeeping app for food trucks" },
  { name: "Mei Tanaka", handle: "meitanaka", number: "001 093", stage: "Launch", project: "Fixlane", tagline: "Repair tracking for phone shops", pitch: "a repair tracking tool for phone shops" },
  { name: "Omar Haddad", handle: "omarhaddad", number: "000 874", stage: null, project: "Swapshift", tagline: "Shift swaps for hospital staff", pitch: "a shift swap app for hospital staff" },
];

// "What you’re looking for" is the help a founder asks for in Support my work.
const FIELDS = ["Your name", "@handle", "Photo", "Your project", "What you’re building", "Your posts", "What you’re looking for"];
const TITLE = `${FOUNDER_ID_HERO.titleLead} ${FOUNDER_ID_HERO.titleAccent}`;
const NUMBER_NOTE = "Your founder number is permanent, given in the order people join.";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const cardLabel = (person: Example) =>
  `Example Founder ID card: ${person.name}, @${person.handle}, founder number ${person.number}, building ${person.project}, ${person.tagline?.toLowerCase()}${person.stage ? `, ${person.stage} stage` : ", stage kept private"}.`;

function useRotation(count: number, ms: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex((value) => (value + 1) % count);
    }, ms);
    return () => window.clearInterval(timer);
  }, [count, ms]);
  return [index, setIndex] as const;
}

const Eyebrow = () => <span className="hfid-eyebrow">{FOUNDER_ID_HERO.eyebrow}</span>;

/** The one button, centred, with the small note under it. */
const Cta = () => (
  <>
    <div className="hfid-ctas">
      <Link
        to={FOUNDER_ID_PATH}
        className="hfid-btn hfid-btn--gold"
        onClick={() => captureEvent("home_founder_id_band_clicked", { placement: "primary" })}
      >
        {FOUNDER_ID_HERO.primaryCta}
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
    <p className="hfid-note hfid-note--cta">{FOUNDER_ID_HERO.note}</p>
  </>
);

const Fields = ({ items = FIELDS, label = "Every ID contains", center = false }: { items?: string[]; label?: string; center?: boolean }) => (
  <>
    <p className={`hfid-label${center ? " hfid-label--center" : ""}`}>{label}</p>
    <ul className={`hfid-chips${center ? " hfid-chips--center" : ""}`} aria-label={label}>
      {items.map((field) => <li key={field} className="hfid-chip">{field}</li>)}
    </ul>
  </>
);

/** The /founder-id card deck: four example cards fanned, the front one rotating. */
const Deck = () => {
  const [front, setFront] = useRotation(EXAMPLES.length, 3800);
  const deckRef = useRef<HTMLDivElement>(null);
  const count = EXAMPLES.length;
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || prefersReducedMotion() || !deckRef.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    deckRef.current.style.setProperty("--ry", `${(x * 14).toFixed(2)}deg`);
    deckRef.current.style.setProperty("--rx", `${(-y * 12).toFixed(2)}deg`);
  };
  const reset = () => {
    deckRef.current?.style.removeProperty("--ry");
    deckRef.current?.style.removeProperty("--rx");
  };
  return (
    <div className="fid-stage hfid-stage" onPointerMove={onMove} onPointerLeave={reset}>
      <div ref={deckRef} className="fid-deck">
        {EXAMPLES.map((person, index) => {
          const position = (index - front + count) % count;
          return (
            <button
              key={person.handle}
              type="button"
              className="fid-deck__slot hfid-slot"
              data-pos={position}
              onClick={() => setFront(index)}
              aria-label={`Show ${person.name}'s example card`}
              aria-pressed={position === 0}
              tabIndex={position === 0 ? -1 : 0}
            >
              <IdCard person={person} label={cardLabel(person)} />
            </button>
          );
        })}
      </div>
      <div className="fid-stage__floor" aria-hidden="true" />
    </div>
  );
};

// ---- A: Obsidian showcase ----------------------------------------------------

const VariantA = () => (
  <div className="hfid hfid-a">
    <div className="hfid-a__rings" aria-hidden="true"><span /><span /><span /></div>
    <div className="hfid-a__head">
      <Eyebrow />
      <h2 id="home-founder-id-heading" className="hfid-title"><TitleFx variant="gold" text={TITLE} /></h2>
    </div>
    <Deck />
    <p className="hfid-caption">Example cards</p>
    <Fields center />
    <p className="hfid-note hfid-note--center">{NUMBER_NOTE}</p>
    <Cta />
  </div>
);

// ---- B: Card anatomy ---------------------------------------------------------

// Where each marker sits, in percent of the card frame: just past the part it
// names (IdCard layout), so it never covers the text.
const PARTS = [
  { label: "Founder number", hint: "Permanent, given in the order people join", left: 30, top: 36 },
  { label: "Your name and @handle", hint: "Your link: creatives-takeover.com/@you", left: 31, top: 67 },
  { label: "Photo", hint: "Or your initials", left: 5, top: 81 },
  { label: "Your project and what you’re building", hint: "Its name and one line about it", left: 42, top: 83 },
];

const VariantB = () => {
  const [index] = useRotation(EXAMPLES.length, 4200);
  const [active, setActive] = useState<number | null>(null);
  const person = EXAMPLES[index];
  return (
    <div className="hfid hfid-b">
      <div className="hfid-b__copy">
        <Eyebrow />
        <h2 id="home-founder-id-heading" className="hfid-title"><TitleFx variant="gold" text={TITLE} /></h2>
        <p className="hfid-label">Every ID contains</p>
        <ol className="hfid-b__legend">
          {PARTS.map((part, i) => (
            <li
              key={part.label}
              className={`hfid-b__item${active === i ? " is-active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="hfid-b__n">{i + 1}</span>
              <span>
                <span className="hfid-b__name">{part.label}</span>
                <span className="hfid-b__hint">{part.hint}</span>
              </span>
            </li>
          ))}
        </ol>
        <Fields items={["Your posts", "What you’re looking for"]} label="Also on your Founder ID" />
        <Cta />
      </div>
      <figure className="hfid-b__figure">
        <div className="hfid-b__card">
          <IdCard key={person.handle} person={person} label={cardLabel(person)} className="fid-idcard--flat hfid-b__idcard" />
          {PARTS.map((part, i) => (
            <span
              key={part.label}
              className={`hfid-b__pin${active === i ? " is-active" : ""}`}
              style={{ left: `${part.left}%`, top: `${part.top}%`, animationDelay: `${0.4 + i * 0.15}s` }}
              aria-hidden="true"
            >
              {i + 1}
            </span>
          ))}
        </div>
        <figcaption className="hfid-caption">Example card · {person.name}</figcaption>
      </figure>
    </div>
  );
};

// ---- C: Share preview --------------------------------------------------------

const VariantC = () => {
  const [index] = useRotation(EXAMPLES.length, 5200);
  const [copied, setCopied] = useState(false);
  const person = EXAMPLES[index];
  const initials = person.name.split(" ").map((part) => part[0]).join("");
  const link = `creatives-takeover.com/@${person.handle}`;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className="hfid hfid-c">
      <div className="hfid-c__copy">
        <Eyebrow />
        <h2 id="home-founder-id-heading" className="hfid-title"><TitleFx variant="gold" text={TITLE} /></h2>
        <Fields />
        <p className="hfid-note">{NUMBER_NOTE}</p>
        <Cta />
      </div>

      <figure className="hfid-c__figure">
        <div className="hfid-c__post" key={person.handle}>
          <div className="hfid-c__author">
            <span className="hfid-c__avatar" aria-hidden="true">{initials}</span>
            <span>
              <span className="hfid-c__who">{person.name}</span>
              <span className="hfid-c__meta">Founder at {person.project}</span>
            </span>
          </div>
          <p className="hfid-c__text">
            My name is {person.name} and I’m building {person.project}, {person.pitch}. Follow my progress on my
            Founder ID ↓
          </p>
          <div className="hfid-c__preview">
            <IdCard person={person} label={cardLabel(person)} className="fid-idcard--flat" />
            <div className="hfid-c__domain">
              <span>creatives-takeover.com</span>
              <strong>{person.name} · Founder ID</strong>
            </div>
          </div>
          <div className="hfid-c__actions" aria-hidden="true">
            <span><Heart /> Like</span>
            <span><MessageCircle /> Comment</span>
            <span><Repeat2 /> Repost</span>
          </div>
        </div>
        <button
          type="button"
          className={`hfid-c__link${copied ? " is-copied" : ""}`}
          onClick={() => {
            void navigator.clipboard?.writeText(`https://${link}`).catch(() => undefined);
            setCopied(true);
          }}
        >
          <span className="hfid-c__url">{link}</span>
          <span className="hfid-c__copy-btn">
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
        <figcaption className="hfid-caption">Example post · how your link looks when you share it</figcaption>
      </figure>
    </div>
  );
};

export default function HomeFounderIdBand() {
  const [params] = useSearchParams();
  const requested = params.get("fid");
  // C is the live design, so it is the default while the others are reviewed.
  const variant: Variant = requested === "a" || requested === "b" ? requested : "c";
  return (
    <section className="hfid-section" aria-labelledby="home-founder-id-heading">
      <div className="container mx-auto px-4 sm:px-6">
        {variant === "a" ? <VariantA /> : variant === "b" ? <VariantB /> : <VariantC />}
      </div>
    </section>
  );
}
