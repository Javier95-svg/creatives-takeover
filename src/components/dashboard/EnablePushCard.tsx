import { useState } from "react";
import { Bell, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWebPush } from "@/hooks/useWebPush";
import { getSafeLocalStorage } from "@/lib/safeStorage";
import { toast } from "sonner";

const DISMISS_KEY = "ct_push_prompt_dismissed";

// Soft prompt to turn on browser notifications — the channel that brings founders
// back daily (streak at risk, task due, mentor reply) even with the tab closed.
export function EnablePushCard() {
  const { supported, permission, isSubscribed, isBusy, subscribe } = useWebPush();
  const [dismissed, setDismissed] = useState(
    () => getSafeLocalStorage().getItem(DISMISS_KEY) === "1",
  );

  if (!supported || isSubscribed || permission === "denied" || dismissed) {
    return null;
  }

  const dismiss = () => {
    getSafeLocalStorage().setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleEnable = async () => {
    const ok = await subscribe();
    if (ok) {
      toast.success("Notifications on. We'll nudge you to keep your streak alive.");
    } else if (Notification.permission === "denied") {
      toast.error("Notifications are blocked in your browser settings.");
    }
  };

  return (
    <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Turn on daily reminders</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Get a nudge when your routine is waiting, a task is due, or a mentor replies — so you keep your streak alive.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={handleEnable} disabled={isBusy}>
              {isBusy ? "Enabling…" : "Enable notifications"}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default EnablePushCard;
