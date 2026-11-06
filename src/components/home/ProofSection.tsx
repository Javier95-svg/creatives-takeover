import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { HOME_PROOF, HOME_PROOF_PLACEHOLDERS, type HomeProofEntry } from "@/data/homeProof";

// Only on the dev server with ?proof-preview, so the layout can be reviewed
// before real quotes exist.
const showPlaceholders = () =>
  import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).has("proof-preview");

const cardClass = "flex h-full flex-col rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur";

const ProofCard = ({ entry, placeholder }: { entry: HomeProofEntry; placeholder: boolean }) => {
  const body = (
    <>
      {placeholder ? (
        <span className="mb-3 w-fit rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
          Placeholder
        </span>
      ) : null}
      <blockquote className="flex-1 text-base leading-relaxed text-foreground">“{entry.quote}”</blockquote>
      <p className="mt-5 font-semibold text-foreground">{entry.name}</p>
      <p className="text-sm text-muted-foreground">{entry.role}</p>
    </>
  );
  return entry.href ? (
    <Link to={entry.href} className={`${cardClass} transition-colors hover:border-primary/40`}>{body}</Link>
  ) : (
    <figure className={`${cardClass} m-0`}>{body}</figure>
  );
};

/** Hidden until HOME_PROOF has real, permitted quotes. */
const ProofSection = () => {
  const placeholder = HOME_PROOF.length === 0 && showPlaceholders();
  const entries = placeholder ? HOME_PROOF_PLACEHOLDERS : HOME_PROOF;
  if (entries.length === 0) return null;

  return (
    <section className="py-12 lg:py-16" aria-labelledby="proof-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <Badge variant="outline" className="homepage-section-badge mb-5">
            From the Platform
          </Badge>
          <h2 id="proof-heading" className="homepage-section-title text-3xl sm:text-4xl lg:text-[2.9rem]">
            What people building here say
          </h2>
        </div>
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {entries.map((entry, index) => (
            <ProofCard key={`${entry.name}-${index}`} entry={entry} placeholder={placeholder} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProofSection;
