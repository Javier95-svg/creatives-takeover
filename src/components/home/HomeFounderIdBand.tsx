import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy, Heart, MessageCircle, Repeat2 } from "lucide-react";

import { IdCard, type IdCardPerson } from "@/components/founder-id/IdCard";
import { captureEvent } from "@/lib/analytics";
import { FOUNDER_ID_HERO, FOUNDER_ID_PATH } from "@/data/founderIdPage";
import TitleFx from "@/components/home/TitleFx";
import "@/components/founder-id/founder-id.css";
import "./home-founder-id.css";

// The homepage Founder ID section: the card as it looks when a founder shares
// their link, inside an example post, in the card's own charcoal and champagne
// gold (api/_founder-id-card.tsx). Copy comes from the approved /founder-id page.
// The card design is fixed, so the examples only vary what a founder sets:
// name, @handle, project, tagline and stage, which can be hidden.

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

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const cardLabel = (person: Example) =>
  `Example Founder ID card: ${person.name}, @${person.handle}, founder number ${person.number}, building ${person.project}, ${person.tagline?.toLowerCase()}${person.stage ? `, ${person.stage} stage` : ", stage kept private"}.`;

export default function HomeFounderIdBand() {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const person = EXAMPLES[index];
  const initials = person.name.split(" ").map((part) => part[0]).join("");
  const link = `creatives-takeover.com/@${person.handle}`;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setIndex((value) => (value + 1) % EXAMPLES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <section className="hfid-section" aria-labelledby="home-founder-id-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="hfid hfid-c">
          <div className="hfid-c__copy">
            <span className="hfid-eyebrow">{FOUNDER_ID_HERO.eyebrow}</span>
            <h2 id="home-founder-id-heading" className="hfid-title"><TitleFx variant="gold" text={TITLE} /></h2>
            <p className="hfid-label">Every ID contains</p>
            <ul className="hfid-chips" aria-label="What every Founder ID contains">
              {FIELDS.map((field) => <li key={field} className="hfid-chip">{field}</li>)}
            </ul>
            <p className="hfid-note">Your founder number is permanent, given in the order people join.</p>
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
      </div>
    </section>
  );
}
