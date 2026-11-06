import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { IdCard, type IdCardPerson } from "@/components/founder-id/IdCard";
import { captureEvent } from "@/lib/analytics";
import { FOUNDER_ID_HERO, FOUNDER_ID_PATH } from "@/data/founderIdPage";
import TitleFx from "@/components/home/TitleFx";
import "@/components/founder-id/founder-id.css";
import "./home-founder-id.css";

// The homepage Founder ID section: a dark showcase in the card's own charcoal
// and champagne gold (api/_founder-id-card.tsx), with the rotating card deck.
// Copy comes from the approved /founder-id page. The card design is fixed, so
// the examples only vary what a founder sets: name, @handle, project, tagline
// and stage, which can be hidden.

type Example = IdCardPerson & { project: string };

// Ordinary names, handles and invented project names, checked against profiles
// on 2026-11-06 so none of them belongs to a real account.
const EXAMPLES: Example[] = [
  { name: "Lucas Ferreira", handle: "lucasferreira", number: "000 562", stage: "Building", project: "Nursechat", tagline: "Language lessons for nurses" },
  { name: "Amara Okafor", handle: "amaraokafor", number: "000 208", stage: "Validation", project: "Truckbooks", tagline: "Bookkeeping for food trucks" },
  { name: "Mei Tanaka", handle: "meitanaka", number: "001 093", stage: "Launch", project: "Fixlane", tagline: "Repair tracking for phone shops" },
  { name: "Omar Haddad", handle: "omarhaddad", number: "000 874", stage: null, project: "Swapshift", tagline: "Shift swaps for hospital staff" },
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

const Fields = () => (
  <>
    <p className="hfid-label hfid-label--center">Every ID contains</p>
    <ul className="hfid-chips hfid-chips--center" aria-label="What every Founder ID contains">
      {FIELDS.map((field) => <li key={field} className="hfid-chip">{field}</li>)}
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

/** Centred: gold rings, the card deck, what every ID contains and the button. */
const Showcase = () => (
  <div className="hfid hfid-a">
    <div className="hfid-a__rings" aria-hidden="true"><span /><span /><span /></div>
    <div className="hfid-a__head">
      <Eyebrow />
      <h2 id="home-founder-id-heading" className="hfid-title"><TitleFx variant="gold" text={TITLE} /></h2>
    </div>
    <Deck />
    <p className="hfid-caption">Example cards</p>
    <Fields />
    <p className="hfid-note hfid-note--center">{NUMBER_NOTE}</p>
    <Cta />
  </div>
);

export default function HomeFounderIdBand() {
  return (
    <section className="hfid-section" aria-labelledby="home-founder-id-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <Showcase />
      </div>
    </section>
  );
}
