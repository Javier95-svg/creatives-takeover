import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { isPrivateRoute } from "@/config/seoRoutePolicy";
import { trackSeoCtaClick, trackSeoLandingView } from "@/lib/analytics";

const seenLandings = new Set<string>();
const SEO_CONVERSION_DESTINATIONS = new Set([
  "/pricing", "/build", "/validate", "/pmf-lab", "/icp-builder", "/mvp-builder",
  "/tech-stack", "/go-to-market", "/traction-engine", "/insighta", "/vc-search",
  "/email-templates", "/accelerator-hunt", "/pitch-deck-analyzer", "/insighta-test",
  "/mentorship", "/marketplace", "/login", "/signup", "/sign-up",
]);

export default function SeoRouteObserver() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (isPrivateRoute(location.pathname) || seenLandings.has(routeKey)) return;
    seenLandings.add(routeKey);
    trackSeoLandingView({
      path: location.pathname,
      referrer: document.referrer || null,
    });
  }, [location.pathname, routeKey]);

  useEffect(() => {
    if (isPrivateRoute(location.pathname)) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || !anchor.closest("main")) return;

      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }
      if (
        destination.origin !== window.location.origin ||
        destination.pathname === location.pathname ||
        !SEO_CONVERSION_DESTINATIONS.has(destination.pathname)
      ) return;

      trackSeoCtaClick({
        source_path: location.pathname,
        destination: `${destination.pathname}${destination.search}`,
        ...(anchor.dataset.seoCtaLabel ? { link_text: anchor.dataset.seoCtaLabel.slice(0, 100) } : {}),
      });
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [location.pathname]);

  return null;
}
