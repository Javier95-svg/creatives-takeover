import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWebPush } from "@/hooks/useWebPush";
import { useAccountContext } from "@/hooks/useAccountContext";
import { allNotificationChannelKeys, notificationChannelsForType } from "@/lib/notificationChannels";
import { logError } from "@/lib/logger";
import { toast } from "sonner";

// The columns are whatever notificationChannelsForType offers, plus the two
// the card handles itself. Keeping this open means a new channel is one entry
// in that module rather than an edit in three places here.
type Prefs = Record<string, boolean>;

// Everything on, except the investor alert nobody asked for. A channel that
// defaults off would go unnoticed until someone wondered why it never fired.
const DEFAULTS: Prefs = {
  ...Object.fromEntries(allNotificationChannelKeys().map((key) => [key, true])),
  push_enabled: true,
  routine_reminders: true,
  investor_updates: false,
};

const SELECT_COLUMNS = ['push_enabled', 'routine_reminders', ...allNotificationChannelKeys()].join(', ');

// db typing escape: these tables aren't in the generated types yet.
const db = supabase as unknown as {
  from: (table: string) => any;
};

export function NotificationPreferencesCard() {
  const { user } = useAuth();
  const { supported, isSubscribed, subscribe, unsubscribe } = useWebPush();
  const { userType } = useAccountContext();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await db
          .from("notification_preferences")
          .select(SELECT_COLUMNS)
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

  // Prefs is already an open record, so Partial<Prefs> would only widen the
  // values to boolean | undefined and make the spread below untypeable.
  const save = async (patch: Prefs) => {
    if (!user) return;
    const next: Prefs = { ...prefs, ...patch };
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

  // Filtered by account type, so a founder is never offered a mentor channel.
  const rows = notificationChannelsForType(userType);

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
              <p className="text-xs text-muted-foreground">{row.description}</p>
            </div>
            <Switch
              checked={prefs[row.key] ?? true}
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
