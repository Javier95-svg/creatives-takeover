import { useEffect, useState } from "react";
import { Copy, ExternalLink, Megaphone } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { captureEvent } from "@/lib/analytics";

interface LiveWaitlist {
  id: string;
  title: string;
  slug: string | null;
  signupCount: number | null;
}

// Owners publish waitlist pages and then never see them again: the dashboard
// never resurfaced the live link or its signup count, so nothing prompted the
// owner to actually share the page. This card closes that loop.
const LiveWaitlistCard = () => {
  const { user } = useAuth();
  const [waitlist, setWaitlist] = useState<LiveWaitlist | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const { data: page, error } = await supabase
        .from("waitlist_pages")
        .select("id, title, slug, status")
        .eq("user_id", user.id)
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || error || !page || !page.slug) return;

      let signupCount: number | null = null;
      const { count, error: countError } = await supabase
        .from("waitlist_signups")
        .select("id", { count: "exact", head: true })
        .eq("waitlist_page_id", page.id);
      if (!countError) signupCount = count ?? 0;

      setWaitlist({ id: page.id, title: page.title, slug: page.slug, signupCount });
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user || !waitlist?.slug) return null;

  const liveUrl = `${window.location.origin}/w/${waitlist.slug}`;

  const copyLink = () => {
    void navigator.clipboard.writeText(liveUrl).then(() => toast.success("Waitlist link copied."));
    captureEvent("waitlist_dashboard_share_clicked", { page_id: waitlist.id });
  };

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/70 px-5 py-4 shadow-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Megaphone className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {waitlist.title} is live
            {waitlist.signupCount !== null ? (
              <span className="ml-2 font-normal text-muted-foreground">
                {waitlist.signupCount} signup{waitlist.signupCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {waitlist.signupCount === 0
              ? "Nobody can join a page they never see — share the link today."
              : "Keep the momentum: share the link where your audience already is."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy link
        </button>
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </a>
      </div>
    </div>
  );
};

export default LiveWaitlistCard;
