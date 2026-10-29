import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import GradientMesh from "./GradientMesh";

const ClosingCta = () => (
  <section className="hs-section hg-section hg-closing" aria-labelledby="closing-cta-heading">
    <div className="container mx-auto px-4 sm:px-6">
      <ScrollReveal variant="scale">
        <div className="hg-closing__panel hg-glass">
          <GradientMesh colors={["239 84% 67%", "330 81% 60%", "172 66% 50%", "262 83% 66%"]} className="hg-closing__mesh" />
          <h2 id="closing-cta-heading" className="homepage-section-title hg-closing__title">
            Start your project here
          </h2>
          <p className="hg-closing__copy">Answer a few questions. Get your stage and your first step.</p>
          <div className="hg-closing__actions">
            <Link to="/start" className="hs-button hs-button--primary">
              Take the quick quiz
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link to="/pricing" className="hs-button hs-button--ghost">
              See pricing
            </Link>
          </div>
          <p className="hg-closing__fine">Free to start. No equity.</p>
        </div>
      </ScrollReveal>
    </div>
  </section>
);

export default ClosingCta;
