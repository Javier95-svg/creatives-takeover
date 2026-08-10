import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

const RETENTION_EMAIL_ID = "retention_email_id";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function RetentionEmailAttribution() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(location.search);
    const emailLogId = params.get(RETENTION_EMAIL_ID);
    if (!emailLogId || !UUID_PATTERN.test(emailLogId)) return;

    const storageKey = `ct_retention_return:${user.id}:${emailLogId}`;
    const removeTrackingId = () => {
      params.delete(RETENTION_EMAIL_ID);
      const query = params.toString();
      navigate(`${location.pathname}${query ? `?${query}` : ""}${location.hash}`, { replace: true });
    };

    try {
      if (window.sessionStorage.getItem(storageKey) === "1") {
        removeTrackingId();
        return;
      }
    } catch {
      // Attribution remains idempotent at the database layer when storage is unavailable.
    }

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.rpc(
        "record_retention_email_return" as never,
        { p_log_id: emailLogId } as never,
      );

      if (cancelled) return;
      if (error || data !== true) {
        logError("Failed to attribute retention email return", error || new Error("Return was not recorded"), {
          userId: user.id,
          emailLogId,
        });
        return;
      }

      try {
        window.sessionStorage.setItem(storageKey, "1");
      } catch {
        // The RPC is idempotent, so storage failure is safe.
      }
      removeTrackingId();
    })();

    return () => {
      cancelled = true;
    };
  }, [location.hash, location.pathname, location.search, navigate, user]);

  return null;
}

export default RetentionEmailAttribution;
