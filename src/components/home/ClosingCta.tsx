import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import GradientMesh from "./GradientMesh";

const ClosingCta = () => (
  <section className="hs-section hs-closing" aria-labelledby="closing-cta-heading">
    <div className="container mx-auto px-4 sm:px-6">
      <ScrollReveal variant="scale" className="hs-closing__frame">
        <div className="hs-closing__panel">
          <GradientMesh colors={["228 90% 62%", "262 83% 62%", "330 85% 60%", "40 95% 58%"]} className="hs-closing__mesh" />
          <h2 id="closing-cta-heading" className="homepage-section-title hs-closing__title">
            Start your project <span className="hs-closing__accent">here</span>
          </h2>
          <p className="hs-closing__copy">
            Answer a few questions. Get your stage and your first step.
          </p>
          <div className="hs-closing__actions">
            <Link to="/start" className="hs-button hs-button--primary">
              Take the quick quiz
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link to="/pricing" className="hs-button hs-button--ghost">
              See pricing
            </Link>
          </div>
          <p className="hs-closing__fine">Free to start. No equity.</p>
        </div>
      </ScrollReveal>
    </div>
  </section>
);

export default ClosingCta;
