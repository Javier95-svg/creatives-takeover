import { Link } from "react-router-dom";
import { HOME_PROOF, HOME_PROOF_PLACEHOLDERS, type HomeProofEntry } from "@/data/homeProof";
import { RevealGroup } from "@/components/animations/ScrollReveal";
import HomeSectionHeader from "./HomeSectionHeader";

const showPlaceholders = () =>
  import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("proof-preview");

const ProofCard = ({ entry, placeholder }: { entry: HomeProofEntry; placeholder: boolean }) => {
  const body = (
    <>
      {placeholder ? <span className="hs-chip hs-chip--warn">Placeholder</span> : null}
      <blockquote className="hs-proof__quote">“{entry.quote}”</blockquote>
      <p className="hs-proof__name">{entry.name}</p>
      <p className="hs-proof__role">{entry.role}</p>
    </>
  );
  return entry.href ? (
    <Link to={entry.href} className="hs-card hs-proof">{body}</Link>
  ) : (
    <figure className={`hs-card hs-proof${placeholder ? " hs-proof--placeholder" : ""}`}>{body}</figure>
  );
};

/** Hidden until HOME_PROOF has real, permitted quotes. */
const ProofSection = () => {
  const placeholder = HOME_PROOF.length === 0 && showPlaceholders();
  const entries = placeholder ? HOME_PROOF_PLACEHOLDERS : HOME_PROOF;
  if (entries.length === 0) return null;

  return (
    <section className="hs-section section-shell" aria-labelledby="proof-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <HomeSectionHeader badge="From the Platform" title="What people building here say" id="proof-heading" />
        <RevealGroup className="hs-proof-grid" stagger={0.08}>
          {entries.map((entry, index) => (
            <ProofCard key={`${entry.name}-${index}`} entry={entry} placeholder={placeholder} />
          ))}
        </RevealGroup>
      </div>
    </section>
  );
};

export default ProofSection;
