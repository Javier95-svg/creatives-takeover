import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCTAAttribution } from "@/hooks/useCTAAttribution";
import { captureEvent } from "@/lib/analytics";

type Placement = "newspaper_article_end" | "newspaper_list_end";

/**
 * The Newspaper's only ask for signed-out readers: one card after the
 * article (or the list). Readers arrive from search and social, read, and
 * leave; before this card nothing on these pages pointed to an account.
 */
export function NewspaperSignupCard({ placement }: { placement: Placement }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const { set: setAttribution } = useCTAAttribution();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (seen.current || !entries.some((entry) => entry.isIntersecting)) return;
      seen.current = true;
      captureEvent("signup_prompt_shown", { placement, page: location.pathname });
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [placement, location.pathname, isAuthenticated, loading]);

  if (loading || isAuthenticated) return null;

  return (
    <aside
      ref={ref}
      aria-label="Create a free account"
      className="mt-12 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8"
    >
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Building something of your own?</h2>
      <p className="mt-2 max-w-2xl text-muted-foreground leading-relaxed">
        Start your project on Creatives Takeover. Define who it&apos;s for, test demand before you build,
        and meet mentors and other founders along the way.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          to={`/signup?source=${placement}`}
          onClick={() => {
            setAttribution(placement, location.pathname);
            captureEvent("conversion_cta_clicked", { cta: placement, page: location.pathname });
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Create a free account
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <span className="text-sm text-muted-foreground">Free to start. No equity.</span>
      </div>
    </aside>
  );
}

export default NewspaperSignupCard;
