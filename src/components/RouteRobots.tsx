import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { isPrivateRoute } from "@/config/seoRoutePolicy";

export default function RouteRobots() {
  const location = useLocation();
  const pathname = location.pathname;

  const shouldNoindex = isPrivateRoute(pathname);

  if (!shouldNoindex) {
    return null;
  }

  return (
    <Helmet>
      <meta name="robots" content="noindex,nofollow" />
    </Helmet>
  );
}
