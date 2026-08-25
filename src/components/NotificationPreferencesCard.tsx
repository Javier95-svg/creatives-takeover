import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWebPush } from "@/hooks/useWebPush";
import { logError } from "@/lib/logger";
import { toast } from "sonner";

interface Prefs {
  push_enabled: boolean;
  routine_reminders: boolean;
  routine_in_app_enabled: boolean;
  routine_email_enabled: boolean;
  task_reminders: boolean;
  retention_emails: boolean;
  product_updates: boolean;
  investor_updates: boolean;
  dm_email_enabled: boolean;
  connection_request_email_enabled: boolean;
  dm_push_enabled: boolean;
}

const DEFAULTS: Prefs = {
  push_enabled: true,
  routine_reminders: true,
  routine_in_app_enabled: true,
  routine_email_enabled: true,
  task_reminders: true,
  retention_emails: true,
  product_updates: true,
  investor_updates: false,
  dm_email_enabled: true,
  connection_request_email_enabled: true,
  dm_push_enabled: true,
};

// db typing escape: these tables aren't in the generated types yet.
const db = supabase as unknown as {
  from: (table: string) => any;
};

export function NotificationPreferencesCard() {
  const { user } = useAuth();
  const { supported, isSubscribed, subscribe, unsubscribe } = useWebPush();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await db
          .from("notification_preferences")
          .select("push_enabled, routine_reminders, routine_in_app_enabled, routine_email_enabled, task_reminders, retention_emails, product_updates, investor_updates, dm_email_enabled, connection_request_email_enabled, dm_push_enabled")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!cancelled && data) setPrefs({ ...DEFAULTS, ...data });
      } catch (error) {
        logError("Failed to load notification preferences", error, { userId: user.id });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = async (patch: Partial<Prefs>) => {
    if (!user) return;
    const next = { ...prefs, ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, 'routine_in_app_enabled') || Object.prototype.hasOwnProperty.call(patch, 'routine_email_enabled')) {
      next.routine_reminders = next.routine_in_app_enabled || next.routine_email_enabled;
    }
    setPrefs(next);
    try {
      const { error } = await db
        .from("notification_preferences")
        .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;

    } catch (error) {
      logError("Failed to save notification preferences", error, { userId: user.id });
      toast.error("Couldn't save that preference. Try again.");
    }
  };

  const handlePushToggle = async (value: boolean) => {
    if (value) {
      const ok = await subscribe();
      if (!ok) {
        toast.error("Enable notifications in your browser to turn this on.");
        return;
      }
    } else {
      await unsubscribe();
    }
    await save({ push_enabled: value });
  };

  const rows: Array<{ key: keyof Prefs; label: string; desc: string }> = [
    { key: "dm_email_enabled", label: "Message emails", desc: "Email me when someone sends a direct message." },
    { key: "connection_request_email_enabled", label: "Connection request emails", desc: "Email me when a founder sends me a connection request." },
    { key: "dm_push_enabled", label: "Message push notifications", desc: "Send direct-message alerts to subscribed devices." },
    { key: "routine_in_app_enabled", label: "Routine in-app reminders", desc: "Show routine nudges in the platform at your selected routine time." },
    { key: "routine_email_enabled", label: "Routine email fallback", desc: "Email a recovery nudge after three inactive days, if your routine is enabled." },
    { key: "task_reminders", label: "Task & deadline reminders", desc: "Heads-up when a task is due or overdue." },
    { key: "retention_emails", label: "Progress & re-engagement emails", desc: "Weekly progress and occasional come-back nudges by email." },
    { key: "product_updates", label: "Product updates", desc: "Major new features and announcements." },
    { key: "investor_updates", label: "New investor alerts", desc: "Get pinged when a new angel investor joins the network." },
  ];

  return (
    <Card className="backdrop-blur-sm bg-card/80 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notifications
        </CardTitle>
        <CardDescription>Choose how Creatives Takeover keeps you on track.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {supported && (
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Browser push notifications</Label>
              <p className="text-xs text-muted-foreground">
                Get nudges on this device even when the tab is closed.
              </p>
            </div>
            <Switch
              checked={isSubscribed && prefs.push_enabled}
              onCheckedChange={handlePushToggle}
              disabled={loading}
            />
          </div>
        )}

        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">{row.label}</Label>
              <p className="text-xs text-muted-foreground">{row.desc}</p>
            </div>
            <Switch
              checked={prefs[row.key]}
              onCheckedChange={(v) => save({ [row.key]: v })}
              disabled={loading}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default NotificationPreferencesCard;
