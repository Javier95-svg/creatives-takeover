import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

const ClosingCta = () => (
  <section className="hs-section hs-closing" aria-labelledby="closing-cta-heading">
    <div className="container mx-auto px-4 sm:px-6">
      <ScrollReveal variant="scale" className="hs-closing__panel">
        <h2 id="closing-cta-heading" className="homepage-section-title hs-closing__title">
          Start your project here
        </h2>
        <p className="hs-closing__copy">
          Describe your idea or product, answer a few quick questions and get your stage and a first step.
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
      </ScrollReveal>
    </div>
  </section>
);

export default ClosingCta;
