import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAIL = "admin@creatives-takeover.com";

/**
 * Gate for the /admin surfaces.
 *
 * It waits for the session before deciding. AuthContext starts with user null
 * and loading true, so without the guard below every admin URL opened directly
 * or hard refreshed redirected to the homepage: the check ran on the first
 * render, read no user, and replaced the route before the session had a chance
 * to resolve. The admin then had to navigate back through the UI, which looked
 * like the page taking forever to load rather than a bounce.
 *
 * The wait is bounded. AuthContext gives its bootstrap a 5s watchdog, so
 * loading always resolves and this can never hang.
 */
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center text-muted-foreground">
        Checking access…
      </div>
    );
  }

  if (user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
