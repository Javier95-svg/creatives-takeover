import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const EXACT_NOINDEX_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/dashboard",
  "/account",
  "/setup-quiz",
  "/focus-funnel",
  "/core-metrics",
  "/weekly-mission",
  "/tasks",
  "/subscription-success",
  "/rag-test",
  "/test-phase1",
]);

const NOINDEX_PREFIXES = [
  "/admin",
  "/auth",
  "/messages",
  "/profile",
  "/mentorship/book/",
  "/mentorship/my-bookings",
  "/mentorship/admin",
  "/co-founder/create",
  "/co-founder/edit/",
  "/investors/admin/",
  "/newspaper/admin",
  "/stories/admin",
  "/w/",
];

export default function RouteRobots() {
  const location = useLocation();
  const pathname = location.pathname;

  const shouldNoindex =
    EXACT_NOINDEX_ROUTES.has(pathname) ||
    NOINDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!shouldNoindex) {
    return null;
  }

  return (
    <Helmet>
      <meta name="robots" content="noindex,nofollow" />
    </Helmet>
  );
}
