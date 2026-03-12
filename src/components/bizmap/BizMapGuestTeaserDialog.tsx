import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BIZMAP_TOOLS } from "@/lib/bizmapStages";
import { appendReturnParam } from "@/lib/authRedirect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function BizMapGuestTeaserDialog() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  const activeTool = useMemo(
    () => BIZMAP_TOOLS.find((tool) => tool.route === location.pathname) ?? null,
    [location.pathname]
  );

  const returnPath = `${location.pathname}${location.search}`;
  const loginHref = appendReturnParam("/login", returnPath);
  const signupHref = appendReturnParam("/signup", returnPath);

  useEffect(() => {
    if (loading) return;
    if (!user && activeTool) {
      setOpen(true);
      return;
    }
    setOpen(false);
  }, [activeTool, loading, user]);

  if (!activeTool) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Preview Mode: {activeTool.name}
          </DialogTitle>
          <DialogDescription>
            You can explore this tool preview now. Sign in to use all features, save your work, and continue your BizMap AI journey.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <Lock className="h-4 w-4 text-primary" />
            Full access requires an account
          </div>
          <p className="mt-1">Create your free account to unlock complete tool functionality.</p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Continue Preview
          </Button>
          <Button variant="outline" asChild>
            <Link to={loginHref}>Sign In</Link>
          </Button>
          <Button asChild>
            <Link to={signupHref}>Create Account</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
