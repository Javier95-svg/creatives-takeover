import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import heroCompass from "@/assets/hero-compass.svg";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import { ChatPanel, CompassPanel, MoodboardPanel, ReelPanel } from "./BookPanels";
import { ReelA, ReelB, ReelC } from "./ReelVersions";
import "./reel-versions.css";
import { trackBook, type BookVersion } from "./bookVersion";
import "./hero-book.css";

// PREVIEW ONLY (branch hero-book). A two-column ("book") signed-out hero:
// the current hero copy and the account CTAs on the left, a different
// creative object on the right in each version. ?hero=1|2|3|4 picks one.

type Props = {
  version: BookVersion;
  titleLine1: string;
  titleLine2: string;
  lede: ReactNode;
  onWhoIsThisFor: () => void;
};

export default function HeroBook({ version, titleLine1, titleLine2, lede, onWhoIsThisFor }: Props) {
  const { set: setAttribution } = useCTAAttribution();

  return (
    <div className={`hb hb--v${version}`}>
      <div className="hb__left">
        <h1 className="ct-hero__title hb__title">
          <span className="ct-hero__title-row-1">{titleLine1}</span>
          <span className="ct-hero__title-row-2">
            {titleLine2}
            <img className="ct-hero__compass-glyph" src={heroCompass} alt="" aria-hidden="true" />
          </span>
        </h1>

        <p className="ct-hero__lede hb__lede">{lede}</p>

        <div className="hb__ctas">
          <Link
            to="/signup?source=hero_book"
            className="ct-hero__cta"
            onClick={() => {
              trackBook(version, "join_today");
              setAttribution(`hero_book_v${version}_join`, "/");
            }}
          >
            Join Today <ArrowRight aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="ct-hero__cta ct-hero__cta--secondary"
            onClick={() => {
              trackBook(version, "who_is_this_for");
              onWhoIsThisFor();
            }}
          >
            Who is this for?
          </button>
        </div>

        {version !== 1 ? (
          <Link
            to="/icp-builder"
            className="hb__textlink"
            onClick={() => {
              trackBook(version, "test_idea");
              setAttribution(`hero_book_v${version}_test_idea`, "/");
            }}
          >
            Or test your idea first <ArrowRight aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="hb__right">
        {version === 1 ? <ChatPanel /> : null}
        {version === 2 ? <ReelPanel /> : null}
        {version === 3 ? <CompassPanel /> : null}
        {version === 4 ? <MoodboardPanel /> : null}
        {version === "a" ? <ReelA /> : null}
        {version === "b" ? <ReelB /> : null}
        {version === "c" ? <ReelC /> : null}
      </div>
    </div>
  );
}
