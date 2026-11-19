import { Fragment, type CSSProperties } from "react";

import "./stories-hero.css";

const PARAGRAPHS = [
  "CT's Newspaper is your front-row seat to the stories that matter in the world of building. We cover founder journeys, startup case studies, and the emerging technologies reshaping industries, told by the people who lived it.",
  "From hard-won pivots to breakthrough moments, every piece is designed to sharpen how you think and accelerate how you build. Stay ahead of the curve, spot what is working before it goes mainstream, and walk away with insights you can actually use.",
];

/**
 * "Press Run" (Javier's pick, 2026-11-19; replaced the typewriter): the
 * description is set like a front page, with a dateline, a drop cap and the
 * second paragraph in two columns, and its words ink in once on load. The full
 * text is laid out from the first frame, so nothing below the hero shifts.
 */
const StoriesHero = () => {
  let word = 0;
  const dateline = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <section className="relative py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-7 takeover-title creatives-font">
            <span className="takeover-gradient">Newspaper</span>
          </h1>

          <div className="sh-press">
            {/* Decorative: changes daily, so it stays out of screen readers and the crawler capture. */}
            <p className="sh-press__dateline" aria-hidden="true">
              <span>Founder edition</span>
              <i />
              <span>{dateline}</span>
            </p>
            {PARAGRAPHS.map((text, p) => (
              <p key={p} className={p === 0 ? "sh-press__lead" : "sh-press__body"}>
                {p === 0 ? <span className="sh-press__cap">{text[0]}</span> : null}
                {(p === 0 ? text.slice(1) : text).split(/(\s+)/).map((part, index) =>
                  part.trim() === "" ? (
                    <Fragment key={index}>{part}</Fragment>
                  ) : (
                    <span key={index} className="sh-press__word" style={{ "--i": word++ } as CSSProperties}>
                      {part}
                    </span>
                  ),
                )}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoriesHero;
