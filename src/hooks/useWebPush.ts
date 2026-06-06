import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logError } from "@/lib/logger";

// VAPID public key is safe to ship to the browser (it is the *public* half of the
// keypair; the private key lives only in the send-push edge function secret).
const VAPID_PUBLIC_KEY =
  "BHgatzNBWiqmvK4Bdn04wnpB8QOgpy12KaAtr4vWaInjh4PAdUM79QCP6nLplC-qvmyEru9AwkTH5jIrEbCNBtQ";

type PushPermission = "default" | "granted" | "denied" | "unsupported";

function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

export function useWebPush() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermission);

    let cancelled = false;
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (!cancelled) setIsSubscribed(Boolean(sub));
      } catch {
        /* no-op */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user || !isPushSupported()) return false;
    setIsBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") return false;

      const registration = await getRegistration();
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = subscription.toJSON();
      const endpoint = subscription.endpoint;
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!endpoint || !p256dh || !auth) return false;

      // push_subscriptions isn't in the generated types yet; cast to keep tsc happy.
      const db = supabase as unknown as {
        from: (table: string) => {
          upsert: (values: unknown, options: { onConflict: string }) => Promise<{ error: unknown }>;
        };
      };
      const { error } = await db.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent.slice(0, 300),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );

      if (error) throw error;
      setIsSubscribed(true);
      return true;
    } catch (error) {
      logError("Failed to subscribe to web push", error, { userId: user?.id });
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [user]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    setIsBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const db = supabase as unknown as {
          from: (table: string) => {
            delete: () => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
          };
        };
        await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (error) {
      logError("Failed to unsubscribe from web push", error, { userId: user?.id });
    } finally {
      setIsBusy(false);
    }
  }, [user]);

  return {
    supported: permission !== "unsupported",
    permission,
    isSubscribed,
    isBusy,
    subscribe,
    unsubscribe,
  };
}

export default useWebPush;
